#!/usr/bin/env node
/**
 * scripts/check-negative-fixture.mjs — proof that the capability gate FAILS.
 *
 * A checker that has never failed is an untested checker (policy §4.2 / §12):
 * this script runs the gate against two deliberately drifted inputs and
 * proves the failure is rule-based evidence, not a crash:
 *
 *   Proof 1 — drifted plan. The committed fixture
 *   test/__fixtures__/capabilities.plan.drifted.json (the same rows as
 *   capabilities.plan.json with six pinned defects: a mutation with
 *   dryRun false, a mutation without a staleCheck answer, a helper without
 *   a rationale, a redaction outside the closed set, an implemented row
 *   downgraded to "planned", and a ghost test title) must make the gate
 *   exit non-zero with at least MIN_FAILURES failures across at least
 *   MIN_RULES distinct rules — a fixture satisfiable by deleting one rule
 *   would be a toothless fixture.
 *
 *   Proof 2 — hand-edited registry. A copy of src/capabilities.ts with one
 *   record's dryRun flipped must make the gate exit non-zero via the
 *   [staleness] re-render rule specifically (the committed module must
 *   equal a fresh re-render of capabilities.json).
 *
 * The fixture is a committed artifact: if the plan's shape ever changes,
 * regenerate it from capabilities.plan.json by re-applying the six defects
 * (see the test-rows/plan rows it names) — this script then fails with a
 * clear "fixture is stale" message instead of passing silently.
 *
 * Exit 0: both proofs show the gate failing as intended.
 * Exit 1: the gate passed on a drifted input (toothless gate), the failure
 *   evidence is too thin, or the fixture no longer matches the plan.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'test/__fixtures__/capabilities.plan.drifted.json';
const MIN_FAILURES = 5; // the six pinned defects touch at least five rules
const MIN_RULES = 4;    // ...across at least four distinct rules

const failures = [];
const fail = (msg) => failures.push(msg);

const runChecker = (extraArgs) => {
  const res = spawnSync(process.execPath, ['scripts/check-capabilities.mjs', ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const out = res.stdout ?? '';
  // the checker prints its result JSON and THEN a human PASS/FAIL line —
  // parse only the JSON block
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  let result = null;
  if (start !== -1 && end > start) {
    try {
      result = JSON.parse(out.slice(start, end + 1));
    } catch {
      result = null;
    }
  }
  return { code: res.status, out, err: res.stderr ?? '', result };
};

/** The plan rows the fixture must mirror, by id (staleness guard). */
const rowIds = (planBytes) =>
  JSON.parse(planBytes).operations.map((o) => o.primitive ?? o.helper).sort();

try {
  const planBytes = readFileSync(join(ROOT, 'capabilities.plan.json'), 'utf8');
  const fixtureBytes = readFileSync(join(ROOT, FIXTURE), 'utf8');
  const fixtureRows = JSON.parse(fixtureBytes).operations.map((o) => o.primitive ?? o.helper).sort();
  if (JSON.stringify(rowIds(planBytes)) !== JSON.stringify(fixtureRows)) {
    throw new Error(
      'fixture is stale: its rows no longer match capabilities.plan.json — regenerate ' +
        'test/__fixtures__/capabilities.plan.drifted.json by re-applying the six pinned defects',
    );
  }
} catch (e) {
  console.error(`[negative-fixture] ${e.message}`);
  process.exit(1);
}

/* ---------------------------------------------------------------- *
 * Proof 1 — the drifted plan must fail with rule-based evidence.
 * ---------------------------------------------------------------- */
const p1 = runChecker(['--group', 'timesheets', '--plan', FIXTURE]);
const ruleOf = (line) => line.split(']')[0].slice(1);
const p1Failures = p1.result?.failures ?? [];
const p1Rules = new Set(p1Failures.map(ruleOf));
if (p1.code === 0) {
  fail('proof 1: the gate PASSED on the drifted plan — the checker has no teeth');
} else if (!p1.out.includes('FAIL —')) {
  fail(`proof 1: the gate exited ${p1.code} without its rule-based FAIL summary (a crash is not evidence)\n${p1.err.slice(0, 400)}`);
} else if (p1Failures.length < MIN_FAILURES) {
  fail(`proof 1: only ${p1Failures.length} failure(s) on the drifted plan (< ${MIN_FAILURES}) — the fixture is too thin`);
} else if (p1Rules.size < MIN_RULES) {
  fail(`proof 1: failures span only ${p1Rules.size} distinct rule(s) (< ${MIN_RULES}: ${[...p1Rules].join(', ')}) — satisfiable by deleting one rule`);
} else {
  console.log(`proof 1 OK — drifted plan: exit ${p1.code}, ${p1Failures.length} failures across ${p1Rules.size} rules (${[...p1Rules].join(', ')})`);
}

/* ---------------------------------------------------------------- *
 * Proof 2 — a hand-edited registry must fail the re-render rule.
 * ---------------------------------------------------------------- */
const tmp = mkdtempSync(join(tmpdir(), 'kimai-negative-fixture-'));
try {
  const registry = readFileSync(join(ROOT, 'src/capabilities.ts'), 'utf8');
  // flip the first record's dryRun flag in the generated literal
  const idx = registry.indexOf('"dryRun": true');
  if (idx === -1) {
    fail('proof 2: src/capabilities.ts has no mutable "dryRun": true literal to tamper with');
  } else {
    const tampered = registry.slice(0, idx) + '"dryRun": false' + registry.slice(idx + '"dryRun": true'.length);
    const tamperedPath = join(tmp, 'capabilities.tampered.ts');
    writeFileSync(tamperedPath, tampered);
    const p2 = runChecker(['--group', 'timesheets', '--registry', tamperedPath]);
    const p2Failures = p2.result?.failures ?? [];
    if (p2.code === 0) {
      fail('proof 2: the gate PASSED on a hand-edited registry — the re-render drift check has no teeth');
    } else if (!p2Failures.some((f) => f.startsWith('[staleness]'))) {
      fail(`proof 2: the gate exited ${p2.code} but no [staleness] rule fired — the drift was not detected where the policy says`);
    } else {
      console.log(`proof 2 OK — hand-edited registry: exit ${p2.code}, [staleness] fired (${p2Failures.filter((f) => f.startsWith('[staleness]')).length} failure(s))`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('NEGATIVE-FIXTURE GATE FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('PASS — the capability gate fails on both drifted inputs, with rule-based evidence');
