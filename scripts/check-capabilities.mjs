#!/usr/bin/env node
/**
 * scripts/check-capabilities.mjs — the capability gate for a built group
 * (drift, classification, metadata completeness, test rows, staleness).
 *
 *   node scripts/check-capabilities.mjs --group timesheets   # batch gate
 *   node scripts/check-capabilities.mjs                      # full (all groups)
 *   node scripts/check-capabilities.mjs --ship               # ship gate: no row
 *                                                            # may remain
 *                                                            # planned/implemented
 * Optional overrides (negative-fixture proof):
 *   --plan <path>      read the plan from <path> instead of capabilities.plan.json
 *   --registry <path>  read the registry module from <path> instead of src/capabilities.ts
 *
 * Gates (policy: agent-execution-layer.md §4 / §4.2; every rule traces to a
 * bullet there — a new rule lands in that section in the same edit):
 *   [registry-section]   the group's section exists in capabilities.json
 *   [row-coverage]       every in-scope implemented/tested row has a record
 *                        (status-matched); no record for a planned row; no
 *                        record without a matching row
 *   [mutation-safety]    a mutation has an effect and dryRun true
 *   [judgement]          every plan row key present; closed-set values; a
 *                        helper has a rationale; every mutation answers
 *                        staleCheck and redaction
 *   [metadata]           every record: purpose, dryRun boolean, staleCheck
 *                        block, >=1 example, permissions, (helper) rationale +
 *                        usage + test rows, (compact helper) named drops
 *   [test-rows]          a tested row: every tests[] title present in its
 *                        named file; an implemented row: non-empty tests
 *   [staleness]          section planHash matches the plan bytes; per-record
 *                        source/test hashes match; the registry module equals
 *                        a fresh re-render (normalised timestamps)
 *   [ship]               under --ship no row remains planned/implemented
 *
 * Exit 0 when the scope passes; 1 with a failure list otherwise.
 * `runCheck` is exported so the vitest proof drives the checker against a
 * drifted fixture without touching the real files.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderCapabilitiesTs, normalizeBuiltAt } from './generate-capabilities.mjs';

const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');

/** The canonical plan row schema — every key present on every row (a missing
 *  key is a defect; `null` means "explicitly none"). */
const ROW_KEYS = [
  'endpoint', 'primitive', 'specialOp', 'vendorFilters', 'search',
  'helper', 'helperBasis', 'helperRationale', 'effect', 'flags', 'dryRun',
  'metadata', 'compact', 'resolution', 'staleCheck', 'redaction', 'errors',
  'tests', 'group', 'status',
];
const EFFECTS = ['read', 'write', 'destructive'];
const STATUSES = ['planned', 'implemented', 'tested'];
const HELPER_BASES = ['server-filter', 'client-scan', 'composite', 'workflow'];
const REDACTIONS = ['none', 'credentials'];

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/**
 * Run the gate. `readFile` is injectable (the vitest proof / the negative
 * fixture feed drifted files through it). Returns { failures, passed, checks }.
 * `opts.group` scopes to one group; `opts.ship` enables the ship gate;
 * `opts.registry` overrides the registry file path for the drift diff.
 */
export function runCheck(planBytes, caps, readFile, opts = {}) {
  const failures = [];
  const checks = [];
  const fail = (rule, message) => failures.push(`[${rule}] ${message}`);
  const shaFile = (p) => {
    try {
      return sha256Hex(readFile(p));
    } catch {
      return null;
    }
  };

  if (!caps || typeof caps !== 'object' || !caps.groups) {
    fail('registry-section', 'capabilities.json missing or unparsable — run capabilities:build');
    return { failures, passed: false, checks };
  }

  const group = opts.group;
  const groups = group !== undefined ? [group] : Object.keys(caps.groups);
  for (const g of groups) {
    if (!caps.groups[g]) fail('registry-section', `group ${g} section missing from capabilities.json — run capabilities:build --group ${g}`);
  }
  if (failures.length > 0) return { failures, passed: false, checks };

  const plan = JSON.parse(planBytes);
  const planHash = sha256Hex(planBytes);

  // --- scope the rows ------------------------------------------------------
  const rowsInScope = plan.operations.filter((o) => group === undefined || o.group === group);
  const recordsInScope = [];
  for (const g of groups) {
    for (const rec of caps.groups[g]?.records ?? []) recordsInScope.push(rec);
  }
  const recById = new Map(recordsInScope.map((r) => [r.id, r]));

  // --- [row-coverage] ------------------------------------------------------
  const missing = [];
  const staleStatus = [];
  const recordsForPlanned = [];
  for (const row of rowsInScope) {
    const id = row.primitive ?? row.helper;
    if (id === null || id === undefined) {
      fail('judgement', 'a plan row has neither primitive nor helper');
      continue;
    }
    const rec = recById.get(id);
    if (row.status === 'planned') {
      if (rec) recordsForPlanned.push(id);
      continue;
    }
    if (!rec) {
      missing.push(id);
      continue;
    }
    if (rec.status !== row.status) staleStatus.push(`${id} (plan ${row.status} vs registry ${rec.status})`);
  }
  for (const rec of recordsInScope) {
    const row = plan.operations.find((o) => (o.primitive ?? o.helper) === rec.id);
    if (!row) fail('row-coverage', `registry record ${rec.id} has no matching plan row (hand-written registry?)`);
    else if (row.status === 'planned') recordsForPlanned.push(rec.id);
  }
  if (missing.length > 0) fail('row-coverage', `implemented/tested rows missing from the registry: ${missing.join(', ')}`);
  if (staleStatus.length > 0) fail('row-coverage', `records with a status that lags the plan: ${staleStatus.join('; ')}`);
  if (recordsForPlanned.length > 0) fail('row-coverage', `records for planned (unbuilt) rows: ${[...new Set(recordsForPlanned)].join(', ')}`);

  // --- [mutation-safety] ---------------------------------------------------
  const mutationProblems = [];
  for (const row of rowsInScope) {
    const id = row.primitive ?? row.helper;
    if (row.effect !== 'write' && row.effect !== 'destructive') continue;
    if (!EFFECTS.includes(row.effect)) mutationProblems.push(`${id} (no effect)`);
    else if (row.dryRun !== true) mutationProblems.push(`${id} (dryRun ${String(row.dryRun)} — every mutation must accept { dryRun: true })`);
  }
  if (mutationProblems.length > 0) fail('mutation-safety', mutationProblems.join('; '));

  // --- [judgement] (plan rows, in scope) ------------------------------------
  const judgementProblems = [];
  for (const row of rowsInScope) {
    const id = row.primitive ?? row.helper ?? row.endpoint ?? '<unnamed row>';
    for (const k of ROW_KEYS) {
      if (!(k in row)) judgementProblems.push(`${id} (missing key ${k})`);
    }
    if (!EFFECTS.includes(row.effect)) judgementProblems.push(`${id} (effect not in the closed set)`);
    if (!STATUSES.includes(row.status)) judgementProblems.push(`${id} (status not in the closed set)`);
    if (!Array.isArray(row.flags)) judgementProblems.push(`${id} (flags must be an array)`);
    if (!Array.isArray(row.vendorFilters)) judgementProblems.push(`${id} (vendorFilters must be an array)`);
    if (!Array.isArray(row.errors)) judgementProblems.push(`${id} (errors must be an array)`);
    if (!Array.isArray(row.tests)) judgementProblems.push(`${id} (tests must be an array)`);
    if (row.metadata === null || typeof row.metadata !== 'object') {
      judgementProblems.push(`${id} (metadata must be an object)`);
    } else {
      if (typeof row.metadata.purpose !== 'string' || row.metadata.purpose.trim() === '') judgementProblems.push(`${id} (metadata.purpose blank)`);
      if (typeof row.metadata.usage !== 'string' && row.metadata.usage !== null) judgementProblems.push(`${id} (metadata.usage must be a string or null)`);
      if (row.metadata.preferredWhen !== null && typeof row.metadata.preferredWhen !== 'string') judgementProblems.push(`${id} (metadata.preferredWhen must be a string or null)`);
      if (!Array.isArray(row.metadata.related)) judgementProblems.push(`${id} (metadata.related must be an array)`);
    }
    const isHelperRow = row.primitive === null || row.primitive === undefined;
    if (row.helper !== null && row.helper !== undefined) {
      if (!HELPER_BASES.includes(row.helperBasis)) judgementProblems.push(`${id} (helper set but helperBasis ${String(row.helperBasis)} not in the closed set)`);
      if (isBlank(row.helperRationale)) judgementProblems.push(`${id} (helper without a rationale)`);
    } else if (row.helperBasis !== null || row.helperRationale !== null) {
      judgementProblems.push(`${id} (helperBasis/helperRationale set but no helper)`);
    }
    if (row.effect === 'write' || row.effect === 'destructive') {
      if (typeof row.staleCheck !== 'string' || row.staleCheck.trim() === '') judgementProblems.push(`${id} (mutation without a staleCheck answer — a field name or the explicit "unavailable")`);
    }
    if (!REDACTIONS.includes(row.redaction)) judgementProblems.push(`${id} (redaction must be "none" or "credentials")`);
  }
  if (judgementProblems.length > 0) fail('judgement', judgementProblems.join('; '));

  // --- [metadata] (registry records) ----------------------------------------
  const metadataProblems = [];
  for (const rec of recordsInScope) {
    const problems = [];
    if (typeof rec.metadata?.purpose !== 'string' || rec.metadata.purpose.trim() === '') problems.push('metadata.purpose');
    if (typeof rec.dryRun !== 'boolean') problems.push('dryRun');
    if (rec.staleCheck === undefined || rec.staleCheck.planHash === undefined) problems.push('staleCheck');
    if (!Array.isArray(rec.examples) || rec.examples.length === 0) problems.push('examples');
    if (typeof rec.permissions !== 'string' || rec.permissions.trim() === '') problems.push('permissions');
    const row = plan.operations.find((o) => (o.primitive ?? o.helper) === rec.id);
    if (rec.kind === 'helper') {
      if (row && isBlank(row.helperRationale)) problems.push('plan helperRationale');
      if (typeof row?.metadata?.usage !== 'string' || row.metadata.usage.trim() === '') problems.push('plan usage');
      if (!Array.isArray(rec.tests) || rec.tests.length === 0) problems.push('tests');
    }
    if (rec.compact !== null && rec.compact !== undefined) {
      if (!Array.isArray(rec.outputSchema?.drops) || rec.outputSchema.drops.length === 0) problems.push('outputSchema.drops (a compact shape must name the fields it drops)');
    }
    if (problems.length > 0) metadataProblems.push(`${rec.id} (${problems.join(', ')})`);
  }
  if (metadataProblems.length > 0) fail('metadata', metadataProblems.join('; '));

  // --- [test-rows] -----------------------------------------------------------
  const missingTitles = [];
  const emptyTests = [];
  for (const rec of recordsInScope) {
    const row = plan.operations.find((o) => (o.primitive ?? o.helper) === rec.id);
    const tests = row?.tests ?? [];
    if (row?.status === 'implemented' && tests.length === 0) emptyTests.push(rec.id);
    if (rec.status !== 'tested') continue;
    for (const t of tests) {
      let src = null;
      try {
        src = readFile(t.file);
      } catch {
        src = null;
      }
      // the exact title in either quote style (an apostrophe-bearing title
      // can only be written double-quoted — same pinned title, valid it())
      if (src === null || (!src.includes(`it('${t.title}'`) && !src.includes(`it("${t.title}"`))) {
        missingTitles.push(`${rec.id} -> ${t.file}: ${t.title}`);
      }
    }
  }
  if (emptyTests.length > 0) fail('test-rows', `implemented rows with no declared test rows: ${emptyTests.join(', ')}`);
  if (missingTitles.length > 0) fail('test-rows', `tested rows with titles missing from the named test files: ${missingTitles.join('; ')}`);

  // --- [ship] ------------------------------------------------------------------
  if (opts.ship) {
    const stragglers = rowsInScope.filter((o) => o.status === 'planned' || o.status === 'implemented');
    if (stragglers.length > 0) {
      fail('ship', `ship gate: rows still planned/implemented: ${stragglers.map((o) => o.primitive ?? o.helper).join(', ')}`);
    }
  }

  // --- [staleness] ---------------------------------------------------------------
  for (const g of groups) {
    if (caps.groups[g].planHash !== planHash) {
      fail('staleness', `planHash stale for group ${g}: capabilities.json has ${String(caps.groups[g].planHash).slice(0, 12)}..., plan is ${planHash.slice(0, 12)}... — re-run capabilities:build`);
    }
  }
  const staleFiles = [];
  for (const rec of recordsInScope) {
    const sc = rec.staleCheck;
    if (!sc) continue;
    const srcHash = shaFile(sc.sourceFile);
    if (sc.sourceHash !== null && srcHash !== sc.sourceHash) {
      staleFiles.push(`${rec.id} (${sc.sourceFile} changed)`);
      continue;
    }
    if (sc.testFiles?.length > 0 && sc.testHash !== null) {
      const hashes = sc.testFiles.map((f) => shaFile(f));
      if (hashes.some((h) => h === null)) {
        staleFiles.push(`${rec.id} (test file missing: ${sc.testFiles.filter((f, i) => hashes[i] === null).join(', ')})`);
        continue;
      }
      const testHash = sha256Hex(hashes.join('\n'));
      if (testHash !== sc.testHash) staleFiles.push(`${rec.id} (test files changed)`);
    }
  }
  if (staleFiles.length > 0) fail('staleness', `records with stale file hashes: ${staleFiles.join(', ')}`);

  // Registry re-render diff (hand-edited registry = drift): the committed
  // module must equal a fresh re-render of the current capabilities.json
  // sections (timestamps normalised — a re-render must be a no-op in git).
  const registryPath = opts.registry ?? 'src/capabilities.ts';
  let registrySrc = null;
  try {
    registrySrc = readFile(registryPath);
  } catch {
    registrySrc = null;
  }
  if (registrySrc === null) {
    fail('staleness', `${registryPath} missing — re-run capabilities:build`);
  } else {
    const fresh = renderCapabilitiesTs(caps.groups);
    if (normalizeBuiltAt(String(registrySrc)) !== normalizeBuiltAt(fresh)) {
      fail('staleness', `${registryPath} drifts from a fresh re-render of capabilities.json (hand edit?) — re-run capabilities:build`);
    }
  }

  const distinctRules = new Set(failures.map((f) => f.split(']')[0].slice(1)));
  checks.push({
    scope: group ?? 'full',
    rowsInScope: rowsInScope.length,
    records: recordsInScope.length,
    missing: missing.length,
    recordsForPlanned: recordsForPlanned.length,
    missingTitles: missingTitles.length,
    staleFiles: staleFiles.length,
    failures: failures.length,
    distinctRules: distinctRules.size,
  });
  return { failures, passed: failures.length === 0, checks };
}

// ---------------------------------------------------------------------------
// CLI (only when run directly — the vitest proof imports runCheck)
// ---------------------------------------------------------------------------
import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli();
}

function runCli() {
  const args = process.argv.slice(2);
  const argOf = (n) => {
    const i = args.indexOf(n);
    return i === -1 ? undefined : args[i + 1];
  };
  const GROUP = argOf('--group');
  const SHIP = args.includes('--ship');
  const PLAN = argOf('--plan');
  const REGISTRY = argOf('--registry');
  const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
  const planBytes = readFileSync(PLAN !== undefined ? join(ROOT, PLAN) : join(ROOT, 'capabilities.plan.json'), 'utf8');
  let caps = null;
  try {
    caps = JSON.parse(readFileSync(join(ROOT, 'capabilities.json'), 'utf8'));
  } catch {
    caps = null;
  }
  const result = runCheck(planBytes, caps, (p) => readFileSync(join(ROOT, p), 'utf8'), {
    group: GROUP,
    ship: SHIP,
    registry: REGISTRY,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.passed) {
    console.log(`PASS — scope ${GROUP ?? 'full'} clean (${result.checks[0]?.rowsInScope} rows, ${result.checks[0]?.records} records)`);
  } else {
    console.log(`FAIL — ${result.failures.length} failure(s) in ${result.checks[0]?.distinctRules ?? 0} distinct rule(s)`);
  }
  process.exitCode = result.passed ? 0 : 1;
}
