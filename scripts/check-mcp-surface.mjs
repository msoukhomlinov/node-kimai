#!/usr/bin/env node
/**
 * scripts/check-mcp-surface.mjs - scripted invariants of the SERVED MCP surface.
 *
 * Usage: node scripts/check-mcp-surface.mjs [--json]
 *
 * Ported from the node-autotask line (scripts/check-mcp-surface.mjs, G8 gate) with the transport
 * half REPLACED by a static half: node-kimai ships no reference MCP server in this repository
 * (MCP_TOOL_MANIFEST.md documents that the server lives in a separate package), so there is no
 * process to spawn. What is checkable here - and what actually regresses - is the generated
 * surface the server is built from: `dist/mcp/index.js` (the compiled bytes a tarball install
 * imports) plus `MCP_TOOL_CATALOG.json` and `MCP_TOOL_MANIFEST.md`.
 *
 * Invariants checked (exit 1 on any violation):
 *   1. the effect-split dispatch tools exist and are exactly kimai_read / kimai_write / kimai_delete;
 *   2. every registry operation has a catalog row, and no row is unreachable without a reason;
 *   3. every reachable operation is dispatchable through the dispatcher matching its effect;
 *   4. the always-on core is the DOCUMENTED size (counts cross-read from MCP_TOOL_MANIFEST.md);
 *   5. every META tool description matches the manifest VERBATIM (no silent re-wording);
 *   6. no credential value can reach a tool result or a tool schema: the generated module and the
 *      artifact carry no bearer header, no `token=`-style assignment, no key-shaped literal, and
 *      no served schema declares a credential field.
 *
 * Exit codes: 0 ok, 1 a violated invariant.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');

const failures = [];
const checks = [];
const fail = (rule, message) => failures.push({ rule, message });
const record = (rule, detail) => checks.push({ rule, ...detail });
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

/** The compiled surface a tarball install imports; the artifact is the machine-readable mirror. */
async function loadSurface() {
  const built = path.join(ROOT, 'dist', 'mcp', 'index.js');
  if (!existsSync(built)) {
    fail('source', 'dist/mcp/index.js is missing - run `npm run build` first (the served surface is the compiled bytes).');
    return null;
  }
  try {
    return await import(pathToFileURL(built).href);
  } catch (err) {
    fail('source', `dist/mcp/index.js does not load: ${err && err.message}`);
    return null;
  }
}

const DISPATCH = { read: 'kimai_read', write: 'kimai_write', destructive: 'kimai_delete' };

async function main() {
  const surface = await loadSurface();
  if (surface === null) return report();

  const artifact = readJson('MCP_TOOL_CATALOG.json');
  const registry = readJson('capabilities.json');
  const manifest = readFileSync(path.join(ROOT, 'MCP_TOOL_MANIFEST.md'), 'utf8');
  const records = Object.values(registry.groups || {}).flatMap((g) => g.records);
  const registryIds = new Set(records.map((r) => r.id));
  const recordById = new Map(records.map((r) => [r.id, r]));

  // --- 1. the effect-split dispatch tools -----------------------------------
  const metaNames = (surface.META_TOOLS || []).map((m) => m.name);
  const coreNames = surface.CORE_TOOLS || [];
  for (const [effect, name] of Object.entries(DISPATCH)) {
    if (!metaNames.includes(name) || !coreNames.includes(name)) fail('dispatch-tools', `${name} (the ${effect} dispatcher) is not in META_TOOLS + CORE_TOOLS`);
  }
  const dispatchEffects = Object.keys(surface.DISPATCH_OPERATIONS || {}).sort();
  if (dispatchEffects.join(',') !== 'destructive,read,write') fail('dispatch-tools', `DISPATCH_OPERATIONS effects are ${dispatchEffects.join(', ') || '(none)'} - expected read, write, destructive`);
  const readOnlyNames = metaNames.filter((n) => /^kimai_(read|write|delete)$/.test(n));
  if (readOnlyNames.length !== 3) fail('dispatch-tools', `expected exactly 3 effect-split dispatch tools, found ${readOnlyNames.length}`);
  record('dispatch-tools', { metaTools: metaNames.length, dispatchers: Object.values(DISPATCH) });

  // --- 2 + 3. reachability and dispatch coverage ----------------------------
  const catalog = surface.CATALOG || [];
  const seen = new Set();
  for (const row of catalog) {
    seen.add(row.op);
    if (row.reachable === true && row.tool === null && !row.reason) fail('reachability', `${row.op}: reachable with no tool and no reason`);
    if (row.reachable === false && !row.reason) fail('reachability', `${row.op}: refused with no reason string`);
  }
  for (const id of registryIds) if (!seen.has(id)) fail('reachability', `${id}: no catalog row`);
  for (const row of catalog) if (!registryIds.has(row.op)) fail('reachability', `${row.op}: catalog row with no registry record`);
  if (catalog.length !== registryIds.size) fail('reachability', `catalog rows (${catalog.length}) != registry operations (${registryIds.size})`);
  const artifactRows = artifact.catalog || [];
  if (artifactRows.length !== catalog.length) fail('reachability', `MCP_TOOL_CATALOG.json rows (${artifactRows.length}) != module rows (${catalog.length})`);

  for (const row of catalog) {
    if (row.reachable !== true) continue;
    const rec = recordById.get(row.op);
    if (!rec) continue;
    if (!(surface.DISPATCH_OPERATIONS[rec.effect] || []).includes(row.op)) fail('dispatch-coverage', `${row.op} (${rec.effect}): reachable but absent from the ${rec.effect} dispatcher enum`);
  }
  for (const [effect, ops] of Object.entries(surface.DISPATCH_OPERATIONS || {})) {
    for (const op of ops) {
      const rec = recordById.get(op);
      if (!rec) fail('dispatch-coverage', `${op}: in the ${effect} dispatcher enum but not a registry operation`);
      else if (rec.effect !== effect) fail('dispatch-coverage', `${op}: in the ${effect} dispatcher enum but the registry effect is ${rec.effect}`);
    }
  }
  record('reachability', { operations: registryIds.size, catalogRows: catalog.length, refused: catalog.filter((r) => r.reachable !== true).length });

  // --- 4. the core is the documented size -----------------------------------
  const manifestCount = (label) => {
    const m = new RegExp(`^- ${label}: (\\d+)`, 'm').exec(manifest);
    return m ? Number(m[1]) : null;
  };
  const documentedCore = manifestCount('always-on core tier');
  if (documentedCore === null) fail('core-size', 'MCP_TOOL_MANIFEST.md does not state the always-on core tier size');
  else if (documentedCore !== coreNames.length) fail('core-size', `manifest documents a core of ${documentedCore} tools, the served module has ${coreNames.length}`);
  const documentedRegistry = manifestCount('registry records');
  if (documentedRegistry !== null && documentedRegistry !== registryIds.size) fail('core-size', `manifest documents ${documentedRegistry} registry records, capabilities.json has ${registryIds.size}`);
  // The manifest's "catalog entries" = every non-core registry operation (the dispatch long tail).
  const coreRegistryOps = coreNames.filter((n) => !metaNames.includes(n)).map((n) => Object.keys(surface.EXPOSED).find((op) => surface.EXPOSED[op] === n)).filter(Boolean);
  const documentedCatalog = manifestCount('catalog entries');
  if (documentedCatalog !== null && documentedCatalog !== registryIds.size - coreRegistryOps.length) {
    fail('core-size', `manifest documents ${documentedCatalog} catalog entries, the registry implies ${registryIds.size - coreRegistryOps.length}`);
  }
  if ((surface.META_TOOLS || []).length !== 5) fail('core-size', `expected 5 META tools, found ${(surface.META_TOOLS || []).length}`);
  const documentedMeta = manifestCount('always-on core tier') === null ? null : new RegExp('\\+(\\d+) META').exec(manifest);
  if (documentedMeta && Number(documentedMeta[1]) !== (surface.META_TOOLS || []).length) fail('core-size', `manifest documents ${documentedMeta[1]} META tools, the module has ${(surface.META_TOOLS || []).length}`);
  if (artifact.counts.coreTools !== coreNames.length) fail('core-size', `artifact coreTools (${artifact.counts.coreTools}) != module CORE_TOOLS (${coreNames.length})`);
  record('core-size', { core: coreNames.length, meta: (surface.META_TOOLS || []).length, documented: documentedCore });

  // --- 5. META descriptions are the manifest's, verbatim --------------------
  // The manifest wraps prose across lines and escapes table pipes; compare on the normalised form.
  const normalise = (s) => String(s).replace(/\\\|/g, '|').replace(/\s+/g, ' ').trim();
  const manifestFlat = normalise(manifest);
  for (const meta of surface.META_TOOLS || []) {
    if (!manifestFlat.includes(normalise(meta.description))) fail('meta-descriptions', `${meta.name}: its description does not appear verbatim in MCP_TOOL_MANIFEST.md`);
    if (typeof meta.description !== 'string' || meta.description.length < 40) fail('meta-descriptions', `${meta.name}: description is missing or too short to be LLM-directed`);
  }
  record('meta-descriptions', { checked: (surface.META_TOOLS || []).length });

  // --- 6. no credential value can reach a result or a schema ----------------
  const generatedText = readFileSync(path.join(ROOT, 'src', 'mcp', 'catalog.generated.ts'), 'utf8');
  const artifactText = readFileSync(path.join(ROOT, 'MCP_TOOL_CATALOG.json'), 'utf8');
  const scans = [
    ['/\\bBearer\\s/i', 'a bearer authorization header'],
    ['/api[_-]?token\\s*[:=]/i', 'an api_token assignment'],
    ['/(password|secret|api[_-]?key|token)\\s*[:=]\\s*[\'"][^\'"]{6,}[\'"]/i', 'a credential-shaped literal'],
    ['/\\b[a-f0-9]{32,}\\b/i', 'a key-shaped hex literal'],
  ];
  for (const [pattern, what] of scans) {
    const re = new RegExp(pattern);
    if (re.test(generatedText)) fail('credential-leak', `catalog.generated.ts contains ${what}`);
    if (re.test(artifactText)) fail('credential-leak', `MCP_TOOL_CATALOG.json contains ${what}`);
    if (re.test(manifest)) fail('credential-leak', `MCP_TOOL_MANIFEST.md contains ${what}`);
  }
  const CREDENTIAL_FIELDS = new Set(['token', 'api_token', 'apikey', 'api_key', 'password', 'secret', 'authorization']);
  for (const [op, contract] of Object.entries(surface.INPUT_CONTRACTS || {})) {
    if (contract.closed !== true || contract.schema.additionalProperties !== false) fail('credential-leak', `${op}: the input contract is not closed`);
    for (const field of Object.keys(contract.schema.properties || {})) {
      if (CREDENTIAL_FIELDS.has(field.toLowerCase())) fail('credential-leak', `${op}: the served contract declares the credential field "${field}"`);
    }
    for (const field of ['dry_run', 'confirm']) {
      if (contract.schema.properties && contract.schema.properties[field]) fail('credential-leak', `${op}: ${field} is a top-level tool argument, never part of the closed contract`);
    }
  }
  const dispatchOps = new Set(Object.values(surface.DISPATCH_OPERATIONS || {}).flat());
  for (const op of dispatchOps) if (!surface.INPUT_CONTRACTS[op]) fail('credential-leak', `${op}: dispatchable but has no closed input contract`);
  record('credential-leak', { contracts: Object.keys(surface.INPUT_CONTRACTS || {}).length, scans: scans.length });

  return report();
}

function report() {
  const ok = failures.length === 0;
  if (AS_JSON) {
    console.log(JSON.stringify({ ok, checks, failures }, null, 2));
  } else if (!ok) {
    console.error(`check-mcp-surface - FAIL (${failures.length} violation(s)):`);
    for (const f of failures) console.error(`  x [${f.rule}] ${f.message}`);
  } else {
    console.log(`check-mcp-surface - PASS: ${checks.map((c) => c.rule).join(', ')}`);
  }
  process.exit(ok ? 0 : 1);
}

await main();
