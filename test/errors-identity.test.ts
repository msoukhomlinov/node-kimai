import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REQUIRED = ['dist/index.js', 'dist/index.cjs', 'dist/errors.js', 'dist/errors.cjs'];

/** Newest mtime (ms) of all .ts files under dir. */
function newestMtime(dir: string): number {
  let newest = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) newest = Math.max(newest, newestMtime(p));
    else if (p.endsWith('.ts')) newest = Math.max(newest, statSync(p).mtimeMs);
  }
  return newest;
}

/** dist is usable when every required entry exists and no source file post-dates the build. */
function distIsFresh(): boolean {
  for (const f of REQUIRED) if (!existsSync(join(ROOT, f))) return false;
  const builtAt = Math.max(...REQUIRED.map((f) => statSync(join(ROOT, f)).mtimeMs));
  return newestMtime(join(ROOT, 'src')) <= builtAt;
}

/**
 * The shape iit-mcp-kimai pins: one `ApiError` class identity shared by the root
 * entry (`node-kimai`) and the `./errors` subpath, so identity guards built on one
 * copy accept instances created by the other. Issue #11: published 2.0.0/2.0.1
 * shipped `splitting: false` bundles where each entry inlined its own class, so
 * these checks returned false — the fix keeps one physical `dist/errors` module
 * and re-exports it (self-reference `node-kimai/errors`) from every entry.
 */
const PROBE = (load: string) => `
const A = ${load}('node-kimai');
const B = ${load}('node-kimai/errors');
const fromB = new B.ApiError({ status: 500, message: 'probe' });
const fromA = new A.ApiError({ status: 503, message: 'probe' });
console.log(JSON.stringify({
  sameClass: A.ApiError === B.ApiError,
  sameSubclass: A.RateLimitError === B.RateLimitError,
  errorsCopyIsInstanceOfRoot: fromB instanceof A.ApiError,
  rootCopyIsInstanceOfErrors: fromA instanceof B.ApiError,
  rootGuardAcceptsErrorsCopy: A.isKimaiError(fromB),
}));`;

type Identity = {
  sameClass: boolean;
  sameSubclass: boolean;
  errorsCopyIsInstanceOfRoot: boolean;
  rootCopyIsInstanceOfErrors: boolean;
  rootGuardAcceptsErrorsCopy: boolean;
};

const IDENTITY_KEYS = [
  'sameClass',
  'sameSubclass',
  'errorsCopyIsInstanceOfRoot',
  'rootCopyIsInstanceOfErrors',
  'rootGuardAcceptsErrorsCopy',
] as const;

function probe(fmt: 'esm' | 'cjs'): Identity {
  const load = fmt === 'esm' ? 'await import' : 'require';
  const args = fmt === 'esm' ? ['--input-type=module', '-e', PROBE(load)] : ['-e', PROBE(load)];
  const out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' }).trim();
  const parsed = JSON.parse(out) as Partial<Record<(typeof IDENTITY_KEYS)[number], boolean>>;
  for (const key of IDENTITY_KEYS) {
    if (parsed[key] !== true) {
      throw new Error(`identity probe (${fmt}) did not return true for ${key}: ${out}`);
    }
  }
  return parsed as unknown as Identity;
}

describe('errors entry identity (issue #11 regression)', () => {
  beforeAll(() => {
    if (!distIsFresh()) execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' });
  });

  it('ESM: root and ./errors export the same class, instanceof works both ways', () => {
    expect(probe('esm')).toEqual({
      sameClass: true,
      sameSubclass: true,
      errorsCopyIsInstanceOfRoot: true,
      rootCopyIsInstanceOfErrors: true,
      rootGuardAcceptsErrorsCopy: true,
    });
  });

  it('CJS: root and ./errors export the same class, instanceof works both ways', () => {
    expect(probe('cjs')).toEqual({
      sameClass: true,
      sameSubclass: true,
      errorsCopyIsInstanceOfRoot: true,
      rootCopyIsInstanceOfErrors: true,
      rootGuardAcceptsErrorsCopy: true,
    });
  });
});
