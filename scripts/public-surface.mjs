#!/usr/bin/env node
/**
 * scripts/public-surface.mjs — guard the PUBLISHED surface of the package.
 *
 * Usage:
 *   node scripts/public-surface.mjs            # check (exit 0 = surface intact, 1 = drift)
 *   node scripts/public-surface.mjs --json     # same check, machine-readable report
 *   node scripts/public-surface.mjs --quiet    # only failures (and the one-line OK)
 *
 * What it proves (all of it against the BUILT dist tree, not the sources):
 *   1. Subpath set   — the `exports` keys and the tsup entry points describe the
 *                      same surface: no missing subpath, no extra subpath.
 *   2. Targets exist — every condition path declared in `exports`
 *                      (import/require x types/default) resolves to a file the
 *                      build actually emitted.
 *   3. Deep subpaths — `.`, `./resources`, `./types`, `./errors`,
 *                      `./capabilities` are *loaded* for real: `require()` of
 *                      the CJS target and dynamic `import()` of the ESM target.
 *                      A resolvable-but-broken build fails here.
 *   4. Runtime deps  — the runtime dependency set is empty (native fetch only):
 *                      no `dependencies` in package.json, and no bare-specifier
 *                      import/require in dist outside Node builtins.
 *
 * The expected subpath list is DERIVED from this package.json + tsup.config.ts
 * (never hardcoded), so adding an entry point or an export is picked up
 * automatically and a half-done edit is caught.
 *
 * `--check` style: silent on success apart from a one-line summary; exit 1 with
 * a failure list otherwise.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinModules } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const quiet = argv.includes('--quiet');

const failures = [];
const checks = [];
const fail = (rule, message) => failures.push({ rule, message });
const record = (rule, detail) => checks.push({ rule, ...detail });

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

/** Subpath names the tsup entry map implies, derived (never hardcoded). */
function expectedSubpaths(entryKeys) {
  const subs = new Set();
  for (const key of entryKeys) {
    if (key === 'index') subs.add('.');
    else if (key.endsWith('/index')) subs.add(`./${dirname(key)}`);
    else subs.add(`./${key}`);
  }
  return subs;
}

/** The tsup `entry` object keys + their relative output stems, read from config. */
function tsupEntries() {
  const src = readFileSync(join(ROOT, 'tsup.config.ts'), 'utf8');
  const block = src.match(/entry:\s*\{([\s\S]*?)\}/);
  if (!block) return null;
  const entries = [];
  for (const m of block[1].matchAll(/(["']?)([\w./-]+)\1\s*:\s*["']([^"']+)["']/g)) {
    entries.push({ key: m[2], source: m[3] });
  }
  return entries.length > 0 ? entries : null;
}

/** Every file emitted under dist/, relative to the repo root (posix separators). */
function distFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(ROOT, p).split('\\').join('/'));
    }
  };
  if (existsSync(join(ROOT, 'dist'))) walk(join(ROOT, 'dist'));
  return out.sort();
}

/** Every leaf file path declared by an exports entry (skips bare-string targets' non-files). */
function declaredTargets(exportsMap) {
  const out = [];
  for (const [subpath, value] of Object.entries(exportsMap)) {
    if (typeof value === 'string') {
      out.push({ subpath, condition: 'default', target: value });
      continue;
    }
    for (const [condition, target] of Object.entries(value)) {
      if (typeof target === 'string') {
        out.push({ subpath, condition, target });
        continue;
      }
      for (const [kind, file] of Object.entries(target)) {
        out.push({ subpath, condition: `${condition}.${kind}`, target: file });
      }
    }
  }
  return out;
}

const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

/** Bare (non-relative, non-builtin) specifiers imported anywhere in dist. */
function bareSpecifiers(files) {
  const found = new Set();
  for (const rel of files) {
    if (!/\.(mjs|cjs|js)$/.test(rel)) continue;
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const patterns = [
      /\bfrom\s*["']([^"']+)["']/g,
      /\brequire\(\s*["']([^"']+)["']\s*\)/g,
      /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    ];
    for (const re of patterns) {
      for (const m of src.matchAll(re)) {
        const spec = m[1];
        if (spec.startsWith('.') || spec.startsWith('/') || builtins.has(spec)) continue;
        found.add(`${rel}: ${spec}`);
      }
    }
  }
  return [...found].sort();
}

/** Load the real built artifacts for every declared subpath (require + import). */
async function assertLoadable(exportsMap, emitted) {
  const require_ = createRequire(import.meta.url);
  const loaded = [];
  for (const [subpath, value] of Object.entries(exportsMap)) {
    if (subpath === './package.json') continue;
    const conditions = typeof value === 'string' ? { default: value } : value;
    for (const [condition, target] of Object.entries(conditions)) {
      const t = typeof target === 'string' ? { default: target } : target;
      const file = t.default;
      if (!file || !file.startsWith('./dist/')) continue;
      const abs = resolve(ROOT, file);
      if (!existsSync(abs)) continue; // already reported by the target check
      try {
        if (condition === 'require') require_(abs);
        else await import(pathToFileURL(abs).href);
        loaded.push(`${subpath} (${condition})`);
      } catch (err) {
        fail('loadable', `${subpath} ${condition} target ${file} does not load: ${err && err.message}`);
      }
    }
  }
  record('loadable', { subpaths: loaded.length });
  return loaded;
}

async function main() {
  const pkg = readJson('package.json');
  const exportsMap = pkg.exports ?? {};
  const entries = tsupEntries();
  const emitted = distFiles();

  if (emitted.length === 0) {
    fail('dist', 'dist/ is empty or missing — run: npm run build');
  }

  // --- 1. subpath set (derived from tsup entries) ---------------------------
  if (!entries) {
    fail('subpaths', 'tsup.config.ts has no parseable entry map — cannot derive the expected subpath set');
  } else {
    const expected = expectedSubpaths(entries.map((e) => e.key));
    const declared = new Set(Object.keys(exportsMap));
    for (const sub of expected) {
      if (!declared.has(sub)) fail('subpaths', `tsup emits an entry for ${sub} but package.json exports has no ${sub} subpath`);
    }
    for (const sub of declared) {
      if (sub === './package.json') continue;
      if (!expected.has(sub)) fail('subpaths', `package.json exports declares ${sub} but no tsup entry emits it`);
    }
    record('subpaths', { expected: [...expected].sort(), declared: [...declared].sort() });
  }

  // --- 2. every declared target is an emitted file --------------------------
  const targets = declaredTargets(exportsMap);
  for (const { subpath, condition, target } of targets) {
    const rel = target.replace(/^\.\//, '');
    if (target === './package.json') continue;
    if (!emitted.includes(rel)) {
      fail('targets', `exports["${subpath}"].${condition} -> ${target} is not an emitted file (run npm run build, or fix the export)`);
    }
  }
  record('targets', { declared: targets.length, missing: failures.filter((f) => f.rule === 'targets').length });

  // --- 3. the deep subpaths actually load ----------------------------------
  const loaded = await assertLoadable(exportsMap, emitted);

  // --- 4. runtime dependency set is empty (native fetch only) ---------------
  const deps = pkg.dependencies ?? {};
  if (Object.keys(deps).length > 0) {
    fail('dependencies', `package.json declares runtime dependencies (${Object.keys(deps).join(', ')}) — the SDK must be dependency-free (native fetch only)`);
  }
  const bare = bareSpecifiers(emitted);
  if (bare.length > 0) {
    fail('dependencies', `dist imports non-builtin bare specifiers: ${bare.join('; ')}`);
  }
  record('dependencies', { packageDependencies: Object.keys(deps).length, bareSpecifiers: bare.length });

  // --- report ---------------------------------------------------------------
  const report = {
    ok: failures.length === 0,
    distFiles: emitted.length,
    subpaths: [...new Set(Object.keys(exportsMap))].sort(),
    loadable: loaded,
    checks,
    failures,
  };
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (failures.length > 0) {
    console.error(`public-surface: FAIL — ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  [${f.rule}] ${f.message}`);
    if (!quiet) console.error('Fix the export/entry drift above, then re-run (a shrunk surface is a reviewable event).');
  } else if (!quiet) {
    console.log(`public-surface: OK — ${report.subpaths.length} subpaths (${loaded.length} targets load), dist intact (${emitted.length} files), 0 runtime dependencies`);
  } else {
    console.log('public-surface: OK');
  }
  return failures.length === 0 ? 0 : 1;
}

process.exit(await main());
