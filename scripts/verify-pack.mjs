#!/usr/bin/env node
/**
 * scripts/verify-pack.mjs - the reproducible packaging gate.
 *
 * `npm pack` can emit a tarball from whatever is on disk, so a stale (or absent) dist/ would ship
 * compiled bytes that are not the code under review. `prepack` (package.json) always rebuilds, and
 * this script proves the packaging claim is transferable from the commit:
 *
 *   1. build (so dist/ is current) and pack into a temp dir, then read the tarball file list,
 *   2. assert every declared entry point exists INSIDE the tarball (main/module/types + every
 *      exports subpath, import and require targets) and that src/ is NOT shipped,
 *   3. assert the shipped data artifacts (capabilities.json/schema, catalog JSON + manifest +
 *      overrides) are inside the tarball,
 *   4. assert the compiled registry hash agrees with the emitted capabilities.json plan hashes,
 *   5. install the tarball into a clean temp project and import/require every VALUE subpath from
 *      BOTH ESM and CJS, and assert ./types (TYPE-ONLY: its runtime module is an empty `export {}`)
 *      still RESOLVES from the installed package.
 *
 * Usage: node scripts/verify-pack.mjs           (exit 0 = shippable, 1 = not)
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, encoding: 'utf8' });
const failures = [];
const ok = [];
const check = (label, condition, detail = '') => {
  if (condition) ok.push(label);
  else failures.push(`${label}${detail ? ` - ${detail}` : ''}`);
};

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// 1. build
process.stdout.write('verify:pack - building dist ... ');
run('npm', ['run', 'build']);
console.log('ok');

// 2. pack
const tmp = mkdtempSync(join(tmpdir(), 'kimai-verify-pack-'));
const packed = run('npm', ['pack', '--pack-destination', tmp]).trim().split('\n').pop().trim();
const tarball = join(tmp, packed);
check('tarball exists', existsSync(tarball), tarball);
const listing = new Set(
  run('tar', ['-tzf', tarball]).split('\n').map((l) => l.replace(/^package\//, '').trim()).filter(Boolean),
);

// 3. every declared entry point must exist INSIDE the tarball
const declared = new Set();
for (const [sub, value] of Object.entries(pkg.exports ?? {})) {
  if (typeof value === 'string') declared.add(value);
  else for (const cond of Object.values(value)) {
    if (typeof cond === 'string') declared.add(cond);
    else for (const t of Object.values(cond)) declared.add(t);
  }
}
for (const f of [pkg.main, pkg.module, pkg.types]) if (f) declared.add(f);
for (const f of declared) {
  check(`tarball ships ${f}`, listing.has(f.replace(/^\.\//, '')), 'declared in package.json but absent from the tarball');
}
for (const artifact of [
  'capabilities.json',
  'capabilities.schema.json',
  'MCP_TOOL_CATALOG.json',
  'MCP_TOOL_MANIFEST.md',
  'MCP_TOOL_OVERRIDES.json',
]) {
  check(`tarball ships ${artifact}`, listing.has(artifact), 'declared in files[] but absent from the tarball');
}
check('tarball does not ship src/', ![...listing].some((f) => f.startsWith('src/')));

// 4. the compiled registry must agree with the emitted capabilities.json
const extract = (member) => run('tar', ['-xzOf', tarball, `package/${member}`]);
// Search the WHOLE packed dist, not just dist/capabilities.js: the bundler can hoist the registry data
// into a shared chunk once other modules import it, leaving the entry file a thin re-export. A check
// pinned to one filename would then report a stale registry when nothing is wrong.
const emittedJson = JSON.parse(extract('capabilities.json'));
const jsonHashes = [...new Set(Object.values(emittedJson.groups ?? {}).map((g) => g.planHash))];
const distText = [...listing].filter((f) => /^dist\/.*\.c?js$/.test(f)).map(extract).join('\n');
check('capabilities.json carries at least one plan hash', jsonHashes.length > 0);
for (const hash of jsonHashes) {
  check(
    `dist registry is not stale (${String(hash).slice(0, 12)})`,
    distText.includes(hash),
    'plan hash from capabilities.json not found anywhere in the packed dist - re-run npm run capabilities:build && npm run build before packing',
  );
}

// 5. install into a clean project and import every surface, ESM and CJS
const consumer = join(tmp, 'consumer');
mkdirSync(consumer, { recursive: true });
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', type: 'module', private: true }, null, 2));
run('npm', ['install', '--include=dev', '--no-audit', '--no-fund', tarball], consumer);

const PKG = pkg.name;
// `./types` is TYPE-ONLY: its runtime module is a deliberate `export {}` (zero bindings), so it is
// checked for existence (above) and for RESOLUTION below, never imported for a non-empty bundle.
const TYPE_ONLY = new Set(['./types']);
const exportKeys = Object.keys(pkg.exports ?? {});
const valueSubpaths = [
  '.',
  ...exportKeys.filter((k) => !k.includes('*') && k !== './package.json' && !TYPE_ONLY.has(k)),
];
const ids = valueSubpaths.map((sub) => (sub === '.' ? PKG : `${PKG}/${sub.replace(/^\.\//, '')}`));
const esm = `const ids = ${JSON.stringify(ids)};
for (const id of ids) {
  const m = await import(id);
  if (!m || Object.keys(m).length === 0) throw new Error('no exports from ' + id);
}
console.log('ESM ok: ' + ids.length + ' subpaths');`;
const cjs = `const ids = ${JSON.stringify(ids)};
for (const id of ids) {
  const m = require(id);
  if (!m || Object.keys(m).length === 0) throw new Error('no exports from ' + id);
}
// ./types must still RESOLVE from the installed package even though it exports nothing at runtime.
require.resolve(${JSON.stringify(`${PKG}/types`)});
console.log('CJS ok: ' + ids.length + ' subpaths (+ ./types resolves)');`;
try {
  const out = run('node', ['--input-type=module', '-e', esm], consumer).trim();
  ok.push(out);
} catch (err) {
  failures.push(`ESM import failed: ${String(err.stderr || err.message).split('\n')[0]}`);
}
// The strongest form of the registry check: read the hash out of the INSTALLED package rather than out
// of the tarball's text, so it survives any bundling shape.
try {
  const probe = `const m = await import('${PKG}/capabilities');process.stdout.write(JSON.stringify(Object.values(m.CAPABILITY_PLAN_HASHES ?? {})));`;
  const shipped = JSON.parse(run('node', ['--input-type=module', '-e', probe], consumer).trim() || '[]');
  // The installed registry is keyed per group (one entry per group, all the same plan hash here);
  // capabilities.json carries the same hashes once per group - compare the deduped SETS, sorted.
  const normalise = (values) => [...new Set(values)].sort();
  check(
    'the installed package reports the registry hashes that ship beside it',
    JSON.stringify(normalise(shipped)) === JSON.stringify(normalise(jsonHashes)),
    `installed ${JSON.stringify(normalise(shipped))} vs capabilities.json ${JSON.stringify(normalise(jsonHashes))}`,
  );
} catch (err) {
  failures.push(`could not read CAPABILITY_PLAN_HASHES from the installed package: ${String(err.stderr || err.message).split('\n')[0]}`);
}
try {
  const out = run('node', ['-e', cjs], consumer).trim();
  ok.push(out);
} catch (err) {
  failures.push(`CJS require failed: ${String(err.stderr || err.message).split('\n')[0]}`);
}

console.log(`\nverify:pack - ${ok.length} check(s) passed`);
for (const f of failures) console.log(`  FAIL ${f}`);
if (failures.length > 0) {
  console.log(`\nNOT SHIPPABLE - ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`SHIPPABLE - ${packed} carries every declared entry point, agrees with capabilities.json, and imports from ESM and CJS`);
