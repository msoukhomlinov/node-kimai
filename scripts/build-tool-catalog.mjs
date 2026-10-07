#!/usr/bin/env node
// scripts/build-tool-catalog.mjs
//
// `node scripts/build-tool-catalog.mjs [--out <path>] [--artifact <path>] [--check]`
//
// Builds the progressive-disclosure artifacts from the capability registry and writes them as a
// generated consumer-layer module (`src/mcp/catalog.generated.ts`, default - compiled by tsup and
// published as the `node-kimai/mcp` subpath, re-exported through `src/mcp/index.ts`) plus the
// machine-readable mirror `MCP_TOOL_CATALOG.json`:
//
//   - the CATALOG: one row per registry operation (all of them, never a subset), with the tool
//     that exposes it when there is one, its effect, the arguments it requires, whether it is
//     dry-run-first, and - for an operation the projection deliberately never exposes -
//     `reachable: false` plus the reason. This is what closes the reachability hole: an operation
//     with no tool must be DISCOVERABLE, not indistinguishable from an operation that does not
//     exist.
//   - the CORE profile (rule implemented in `scripts/project-mcp-tools.mjs`, never listed by hand)
//     and the five META tools whose descriptions the projection owns.
//   - the runtime DATA helpers a host needs (catalog paging, catalog lookup, describe, the schema
//     reader the describe needs, and the dispatch input schema). They import NOTHING at runtime:
//     the SDK stays MCP-independent, and the host passes the registry record (`getCapability(op)`
//     from `node-kimai/capabilities`).
//     This module deliberately carries NO validator and NO write governor. Validation and
//     governance have exactly ONE implementation; a second one here would be a second chance to
//     be wrong. `dispatchOperation` (src/mcp/dispatch.ts) only adds the effect boundary.
//
// The projection is imported from `scripts/project-mcp-tools.mjs` - one implementation of the
// curation rules, never a second copy. The registry is `capabilities.json` (the same emission the
// SDK's `src/capabilities.ts` is generated from, planHash-gated by `capabilities:check`).
//
// `--check`: verify the generated module on disk is exactly what this script would write, and
// that every registry operation is reachable or explicitly refused. Exit 1 otherwise.
//
// Exit codes: 0 ok, 1 registry missing/unreadable or a reachability violation.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project, inputFields } from './project-mcp-tools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const argValue = (flag, fallback) => { const i = argv.indexOf(flag); return i === -1 ? fallback : argv[i + 1]; };
// The default lives in src/ on purpose: tsup compiles it, so `node-kimai/mcp` ships the catalog as
// compiled JS + .d.ts. Emitting it under examples/ published it as raw TypeScript, which a compiled
// consumer could not import.
const OUT = path.resolve(ROOT, argValue('--out', 'src/mcp/catalog.generated.ts'));
const ARTIFACT = path.resolve(ROOT, argValue('--artifact', 'MCP_TOOL_CATALOG.json'));
const CHECK = argv.includes('--check');
const REGISTRY = path.resolve(ROOT, argValue('--registry', 'capabilities.json'));
const OVERRIDES = path.resolve(ROOT, 'MCP_TOOL_OVERRIDES.json');

/**
 * The written CORE_RULE (mirrors MCP_TOOL_MANIFEST.md). R1-R4 are the requirements the projection
 * computes with; R5 states what is deliberately NOT in the core. `check-mcp-surface.mjs` asserts
 * every core row carries one of the declared ids, so the module cannot drift from the projection.
 */
export const CORE_RULE = {
  threshold: 10,
  requirements: [
    { id: 'R1', text: 'the five META tools (catalog / describe / read / write / delete) - the mechanism.' },
    { id: 'R2', text: 'identify the API-key owner (users.getMe).' },
    { id: 'R3', text: 'discovery is R1: the generated catalog (kimai_catalog) + kimai_describe; the Kimai registry has no cross-resource resolve operation.' },
    { id: 'R4', text: 'one bounded helper-tier read per workflowResource: true resource; where a resource has no search helper, its bounded week/status read stands in.' },
    { id: 'R5', text: 'writes are NOT in the core: they are reachable through kimai_write / kimai_delete, dry-run first, destructive calls confirmation-gated.' },
  ],
  implementedBy: ['R1', 'R2', 'R4'],
};

/** The five META tools; the read/write/delete operation enum is filled from the registry below. */
const META_TITLES = {
  kimai_catalog: 'Discover Operations (Catalog)',
  kimai_describe: 'Describe One Operation',
  kimai_read: 'Read One Registry Operation',
  kimai_write: 'Write One Registry Operation',
  kimai_delete: 'Delete One Registry Operation',
};
/**
 * META tool descriptions. These mirror MCP_TOOL_MANIFEST.md's META table VERBATIM (the projection
 * owns the text; this module is the consumer-layer copy a tarball-only install can read).
 * `check-mcp-surface.mjs` asserts each description still appears verbatim in the manifest.
 */
const META_DESCRIPTIONS = {
  kimai_catalog: 'List the capabilities the node-kimai registry implements with the tool that exposes each one (when it has one), its effect, whether it needs a dry run or a confirmation flag, and the arguments it requires. The tool list on this server is a SUBSET: this is a curated core profile, and the catalog is how you discover a capability that has no tool of its own — find the row, call kimai_describe for the exact schema, then kimai_read/kimai_write/kimai_delete. Bounded: limit defaults to 40 and is hard-capped at 100; prefer a filter over dumping the catalog.',
  kimai_describe: 'Return the full input schema, effect, flags, dry-run support, error vocabulary, related operations and preferredWhen guidance for ONE registry operation, so a capability can be called correctly without carrying every schema in context. Use it after kimai_catalog named the operation and before kimai_read/kimai_write/kimai_delete. Takes the canonical operation key exactly as the catalog prints it (for example "timesheets.search") — never a tool name, and there is no fuzzy matching: an unknown key is a CONFIG_ERROR naming the nearest catalog keys.',
  kimai_read: 'Execute only effect "read" operations by canonical registry key. Prefer the dedicated bounded search/resolve tools where they exist; use this dispatch for a read with no dedicated tool. `input` is a CLOSED per-operation contract: exactly the operation\'s declared fields — an unknown field is refused with a typed CONFIG_ERROR before any request. Reads have no dry run and never mutate.',
  kimai_write: 'Execute only effect "write" operations by canonical registry key. Mutations default to a dry-run preview (dry_run: true returns the plan; the request is never issued); dry_run: false executes. `input` is a CLOSED per-operation contract — an unknown field is refused before any request. A destructive operation is REFUSED here; use kimai_delete.',
  kimai_delete: 'Execute only effect "destructive" operations by canonical registry key. Destructive calls are irreversible and REFUSED without `confirm` equal to the operation key. `input` is a CLOSED per-operation contract. Neither the preview nor the confirmation string is human consent: the host must enforce its own approval policy.',
};
const META_ANNOTATIONS = {
  kimai_catalog: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  kimai_describe: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  kimai_read: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  kimai_write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  kimai_delete: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
};
const META_INPUT = {
  kimai_catalog: [
    { name: 'limit', type: 'number', required: false, description: 'Rows per page (default 40, hard max 100).' },
    { name: 'offset', type: 'number', required: false, description: 'Row offset for paging through the catalog.' },
    { name: 'effect', type: 'string', required: false, description: 'Filter to one effect: read | write | destructive.' },
    { name: 'resource', type: 'string', required: false, description: 'Filter to one registry resource (e.g. timesheets).' },
    { name: 'unexposed_only', type: 'boolean', required: false, description: 'true = only capabilities with no dedicated tool.' },
  ],
  kimai_describe: [
    { name: 'operation', type: 'string', required: true, description: 'Canonical registry key exactly as the catalog prints it (e.g. "timesheets.search").' },
  ],
};
const META_EFFECT_OF = { kimai_read: 'read', kimai_write: 'write', kimai_delete: 'destructive' };
const REFUSAL_REASON =
  'binary/download surface - the SDK returns bytes, which is not an MCP tool result, and the dispatch tools refuse it so the projection rule cannot be bypassed';

const DISPATCH_TOOLS = { read: 'kimai_read', write: 'kimai_write', destructive: 'kimai_delete' };

/** Map a registry field descriptor to the JSON Schema keyword subset the projection emits. */
function schemaNodeFor(field) {
  const t = field && field.type;
  const type = t === 'number' ? 'number' : t === 'string' ? 'string' : t === 'boolean' ? 'boolean' : 'object';
  return { type };
}

function requireNonEmpty(value, what) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`projection returned no ${what}`);
  return value;
}

function main() {
  if (!existsSync(REGISTRY)) {
    console.error(`build-tool-catalog: registry not found at ${REGISTRY} - run \`npm run capabilities:build\` first.`);
    process.exit(1);
  }
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : [];
  const data = project(registry, overrides);
  const records = data.records;
  const violations = [];

  // ---------------------------------------------------------------- exposure / refusal
  const exposedByOp = new Map();
  for (const t of data.tools) if (!exposedByOp.has(t.backingOperation)) exposedByOp.set(t.backingOperation, t.name);
  const refusals = data.excluded.map((e) => ({ op: e.operation, reachable: false, reason: REFUSAL_REASON, alternative: null, why: e.reason }));
  const refusalByOp = new Map(refusals.map((r) => [r.op, r]));
  const curationExcludedByOp = new Map((data.curationExcluded || []).map((e) => [e.backingOperation, e]));

  // ---------------------------------------------------------------- catalog rows
  const requiredNames = (rec) => Object.entries(rec.inputSchema || {}).filter(([, a]) => a && a.required === true).map(([n]) => n);
  const catalog = records.map((rec) => {
    const refusal = refusalByOp.get(rec.id);
    const tool = exposedByOp.get(rec.id) ?? null;
    const destructive = rec.effect === 'destructive' || (rec.flags || []).includes('requiresApproval');
    const row = {
      op: rec.id,
      tool,
      summary: (rec.metadata && rec.metadata.purpose) || null,
      when: (rec.metadata && rec.metadata.preferredWhen) || null,
      effect: rec.effect,
      requires: requiredNames(rec),
      dry_run: rec.dryRun === true,
      confirm_required: rec.effect !== 'read' && destructive,
      reachable: refusal ? false : true,
    };
    if (refusal) {
      row.reason = refusal.reason;
    } else if (tool === null) {
      const curated = curationExcludedByOp.get(rec.id);
      row.reason = curated && curated.reason
        ? `no tool of its own (curated out: ${curated.reason}) - reachable through ${DISPATCH_TOOLS[rec.effect] || 'kimai_read'}`
        : `no tool of its own (curated out as a duplicate outcome) - reachable through ${DISPATCH_TOOLS[rec.effect] || 'kimai_read'}`;
    }
    return row;
  });
  catalog.sort((a, b) => (a.op < b.op ? -1 : a.op > b.op ? 1 : 0));

  // ---------------------------------------------------------------- the invariant
  const registryKeys = new Set(records.map((r) => r.id));
  const seen = new Set();
  for (const row of catalog) {
    seen.add(row.op);
    const refusal = refusalByOp.get(row.op);
    if (row.reachable === true && row.tool === null && !refusal && row.reason === undefined) {
      violations.push(`${row.op}: reachable but neither exposed as a tool nor explained`);
    }
    if (row.reachable === false && !row.reason) violations.push(`${row.op}: refused with no reason string`);
  }
  for (const key of registryKeys) if (!seen.has(key)) violations.push(`${key}: no catalog row (the reachability hole this feature exists to close)`);
  for (const t of data.tools) {
    if (!registryKeys.has(t.backingOperation)) violations.push(`${t.name}: exposed tool backs an operation that is not a registry key (${t.backingOperation})`);
  }
  for (const e of data.excluded) if (!refusalByOp.has(e.operation)) violations.push(`${e.operation}: excluded by rule but not refused with a reason in the catalog`);
  const coreNames = new Set(data.core.map((c) => c.name));
  const declaredRequirements = new Set(CORE_RULE.requirements.map((r) => r.id));
  for (const c of data.core) if (!declaredRequirements.has(c.requirement)) violations.push(`${c.name}: CORE row carries an undeclared requirement "${c.requirement}"`);

  // ---------------------------------------------------------------- dispatch surface
  // The dispatchers serve the long tail: every registry operation whose effect matches, minus the
  // operations the projection refuses outright (binary). A core operation stays dispatchable too,
  // so nothing is unreachable if the host loads only the core.
  const dispatchOperations = { read: [], write: [], destructive: [] };
  for (const rec of records) {
    if (refusalByOp.has(rec.id)) continue;
    if (!dispatchOperations[rec.effect]) continue;
    dispatchOperations[rec.effect].push(rec.id);
  }
  for (const key of Object.keys(dispatchOperations)) dispatchOperations[key].sort();
  if (dispatchOperations.read.length + dispatchOperations.write.length + dispatchOperations.destructive.length !== records.length - refusals.length) {
    violations.push('dispatch surface: not every reachable registry operation is dispatchable');
  }
  for (const row of catalog) {
    if (row.reachable === true && row.effect && !(dispatchOperations[row.effect] || []).includes(row.op)) {
      violations.push(`${row.op}: reachable but absent from the ${row.effect} dispatcher enum`);
    }
  }

  // ---------------------------------------------------------------- closed input contracts
  const inputContracts = {};
  for (const [effect, ops] of Object.entries(dispatchOperations)) {
    for (const op of ops) {
      const rec = records.find((r) => r.id === op);
      const fields = inputFields(rec).filter((f) => f.name !== 'dry_run' && f.name !== 'confirm');
      const properties = {};
      const required = [];
      for (const f of fields) {
        properties[f.name] = schemaNodeFor(f);
        if (f.description) properties[f.name].description = f.description;
        if (f.required === true) required.push(f.name);
      }
      const declared = Object.keys(properties);
      const schema = { type: 'object', additionalProperties: false, properties };
      if (required.length) schema.required = required;
      inputContracts[op] = {
        op,
        effect,
        closed: true,
        note: declared.length
          ? `Closed contract for ${op}: exactly these fields - ${declared.join(', ')}. An unknown field is refused before any request. dry_run / confirm are the tool's top-level arguments, never part of this contract.`
          : `Closed contract for ${op}: this operation takes no argument. dry_run / confirm are the tool's top-level arguments, never part of this contract.`,
        schema,
      };
    }
  }
  if (Object.keys(inputContracts).length !== records.length - refusals.length) violations.push('input contracts: not every reachable registry operation has a contract');

  // ---------------------------------------------------------------- META tools
  const metaTool = (name) => {
    const effect = META_EFFECT_OF[name];
    const fields = effect === undefined
      ? META_INPUT[name]
      : [
          { name: 'operation', type: 'string', required: true, description: `A registry key whose effect is "${effect}".`, enum: dispatchOperations[effect] },
          { name: 'input', type: 'object', required: false, description: "Closed per-operation contract: exactly the operation's declared fields, nothing else." },
          ...(effect === 'read' ? [] : effect === 'write'
            ? [{ name: 'dry_run', type: 'boolean', required: false, description: 'true (default) = return the plan without issuing the write.' }]
            : [{ name: 'confirm', type: 'string', required: true, description: 'Must equal the operation key exactly; otherwise the call is refused.' }]),
        ];
    return {
      name,
      title: META_TITLES[name],
      effect: 'meta',
      annotations: META_ANNOTATIONS[name],
      description: META_DESCRIPTIONS[name],
      inputSchema: { fields },
    };
  };
  const metaTools = ['kimai_catalog', 'kimai_describe', 'kimai_read', 'kimai_write', 'kimai_delete'].map(metaTool);
  for (const tool of metaTools) {
    if (data.tools.some((t) => t.name === tool.name)) violations.push(`${tool.name}: a META tool name collides with a curated tool`);
  }

  // ---------------------------------------------------------------- core tool descriptions
  const toolDescriptions = {};
  for (const c of data.core) {
    if (c.op === null) {
      toolDescriptions[c.name] = META_DESCRIPTIONS[c.name];
      continue;
    }
    const t = data.tools.find((x) => x.name === c.name);
    const rec = records.find((r) => r.id === c.op);
    toolDescriptions[c.name] = t ? `${t.description}${t.bounds ? ' ' + t.bounds : ''}` : String((rec.metadata && rec.metadata.purpose) || '');
  }
  const coreTools = data.core.map((c) => c.name);
  if (coreTools.some((n) => typeof n !== 'string' || n.length === 0)) violations.push('core tier: a core row has no tool name');

  // ---------------------------------------------------------------- the artifact
  const artifact = {
    sdk: 'node-kimai',
    generatedBy: 'scripts/build-tool-catalog.mjs',
    planHash: data.planHash,
    counts: {
      registryOperations: records.length,
      exposedTools: data.tools.length,
      coreTools: coreTools.length,
      metaTools: metaTools.length,
      catalogRows: catalog.length,
      reachableOnlyThroughDispatch: catalog.filter((r) => r.reachable === true && r.tool === null).length,
      refused: refusals.length,
    },
    coreRule: CORE_RULE,
    coreTools,
    metaTools: metaTools.map((m) => ({ name: m.name, title: m.title, description: m.description })),
    dispatchOperations,
    exposed: Object.fromEntries([...exposedByOp.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    refusals: refusals.map((r) => ({ op: r.op, reachable: false, reason: r.reason, why: r.why })),
    catalog,
  };

  const output = renderModule({ data, catalog, refusals, dispatchOperations, inputContracts, metaTools, toolDescriptions, coreTools, records });
  const artifactText = JSON.stringify(artifact, null, 2) + '\n';

  if (violations.length) {
    console.error(`build-tool-catalog - REACHABILITY VIOLATIONS (${violations.length}):`);
    for (const v of violations) console.error(`  x ${v}`);
    process.exit(1);
  }
  if (CHECK) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
    const currentArtifact = existsSync(ARTIFACT) ? readFileSync(ARTIFACT, 'utf8') : null;
    if (current === null) {
      console.error(`build-tool-catalog --check - FAILED: ${path.relative(ROOT, OUT)} is missing - run \`node scripts/build-tool-catalog.mjs\``);
      process.exit(1);
    }
    if (currentArtifact === null) {
      console.error(`build-tool-catalog --check - FAILED: ${path.relative(ROOT, ARTIFACT)} is missing - run \`node scripts/build-tool-catalog.mjs\``);
      process.exit(1);
    }
    if (current !== output) {
      console.error(`build-tool-catalog --check - FAILED: ${path.relative(ROOT, OUT)} is stale - run \`node scripts/build-tool-catalog.mjs\``);
      process.exit(1);
    }
    if (currentArtifact !== artifactText) {
      console.error(`build-tool-catalog --check - FAILED: ${path.relative(ROOT, ARTIFACT)} is stale - run \`node scripts/build-tool-catalog.mjs\``);
      process.exit(1);
    }
    console.log(`build-tool-catalog --check - PASS: catalog.generated.ts + MCP_TOOL_CATALOG.json are current; ${catalog.length} catalog row(s), ${data.tools.length} exposed, ${catalog.filter((r) => r.reachable === true && r.tool === null).length} reachable via the dispatch tools only, ${refusals.length} refused with a reason`);
    process.exit(0);
  }
  writeFileSync(OUT, output);
  writeFileSync(ARTIFACT, artifactText);
  console.log(`build-tool-catalog - operations=${catalog.length}; exposed as a tool=${data.tools.length}; reachable via the dispatch tools only=${catalog.filter((r) => r.reachable === true && r.tool === null).length}; refused with a reason=${refusals.length}`);
  console.log(`build-tool-catalog - CORE=${coreTools.length} tools (${coreTools.join(', ')})`);
  console.log(`build-tool-catalog - wrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, ARTIFACT)}`);
}

// ---------------------------------------------------------------------------------------------
// Module renderer
// ---------------------------------------------------------------------------------------------
function renderModule({ data, catalog, refusals, dispatchOperations, inputContracts, metaTools, toolDescriptions, coreTools, records }) {
  const lines = [];
  const nl = () => lines.push('');
  lines.push('// MACHINE-GENERATED by scripts/build-tool-catalog.mjs - DO NOT HAND-EDIT.');
  lines.push('// Regenerate with: node scripts/build-tool-catalog.mjs');
  lines.push(`// Source of truth: capabilities.json (planHash ${data.planHash}) + MCP_TOOL_OVERRIDES.json,`);
  lines.push('// projected by scripts/project-mcp-tools.mjs. `node scripts/build-tool-catalog.mjs --check` fails on a stale copy.');
  lines.push('//');
  lines.push(`// ${catalog.length} operations, ${data.tools.length} exposed as their own tool, ${catalog.filter((r) => r.reachable === true && r.tool === null).length} reachable only through the dispatch tools,`);
  lines.push(`// ${refusals.length} deliberately refused (binary/download). CORE = ${coreTools.length} tools including ${metaTools.length} META.`);
  lines.push('//');
  lines.push('// This module lives in src/ so tsup compiles it and `node-kimai/mcp` ships it to a consumer that');
  lines.push('// only has the tarball. It is re-exported by src/mcp/index.ts and must never be hand-edited.');
  lines.push('');
  lines.push("import type { CapabilityArgSchema, CapabilityRecord } from '../capabilities.js';");
  nl();
  lines.push(`export const CATALOG_PLAN_HASH = '${data.planHash}';`);
  nl();
  lines.push(`export const CORE_RULE = ${JSON.stringify(CORE_RULE, null, 2)};`);
  nl();
  lines.push('/** The CORE profile: always-present tools, generated from the rule above. */');
  lines.push(`export const CORE_TOOLS = ${JSON.stringify(coreTools, null, 2)};`);
  nl();
  lines.push('/** The five META tools. Their descriptions are owned by the projection (scripts/project-mcp-tools.mjs). */');
  lines.push(`export const META_TOOLS = ${JSON.stringify(metaTools, null, 2)};`);
  nl();
  lines.push('/** Curated descriptions of the CORE tools, so a consumer never re-types (or drifts from) them. */');
  lines.push('export const TOOL_DESCRIPTIONS: Record<string, string> = {');
  for (const name of coreTools) lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(toolDescriptions[name] ?? '')},`);
  lines.push('};');
  nl();
  lines.push('/** operation -> the tool that exposes it (an operation absent here has no tool of its own). */');
  lines.push('export const EXPOSED: Record<string, string> = {');
  for (const row of catalog) if (row.tool) lines.push(`  ${JSON.stringify(row.op)}: ${JSON.stringify(row.tool)},`);
  lines.push('};');
  nl();
  lines.push('/** operation -> why the dispatch tools refuse it (the projection rule, preserved through the escape hatch). */');
  lines.push('export const REFUSALS: Record<string, { reachable: false; reason: string; alternative: string | null }> = {');
  for (const r of refusals) lines.push(`  ${JSON.stringify(r.op)}: ${JSON.stringify({ reachable: false, reason: r.reason, alternative: r.alternative })},`);
  lines.push('};');
  nl();
  lines.push('/** effect -> the registry operations the matching dispatch tool accepts (sorted; refused operations excluded). */');
  lines.push(`export const DISPATCH_OPERATIONS: Record<'read' | 'write' | 'destructive', string[]> = ${JSON.stringify(dispatchOperations, null, 2)};`);
  nl();
  lines.push('/** One row per registry operation. `requires` = the required top-level argument names. */');
  lines.push('export const CATALOG: CatalogRow[] = [');
  for (const row of catalog) lines.push(`  ${JSON.stringify(row)},`);
  lines.push('];');
  nl();
  lines.push(runtimeSource(inputContracts));
  return lines.join('\n');
}

function runtimeSource(inputContracts) {
  return RUNTIME_TYPES + '\n' + RUNTIME_CONTRACTS(inputContracts) + '\n' + RUNTIME_SCHEMA_FN + '\n' + RUNTIME_HELPERS;
}

// ---- the generated module's runtime half (appended by renderModule) -----------------------
const RUNTIME_TYPES = `
/** Bounded catalog page: default 40 rows, hard cap 100. */
export const DEFAULT_CATALOG_LIMIT = 40;
export const MAX_CATALOG_LIMIT = 100;

/** The filters \`catalogPage\` honours. All optional, all ANDed. */
export interface CatalogPageOptions {
  limit?: number;
  offset?: number;
  effect?: string;
  resource?: string;
  unexposed_only?: boolean;
}

/** One catalog row. \`reason\` is present on every row without a tool of its own. */
export interface CatalogRow {
  op: string;
  tool: string | null;
  summary: string | null;
  when: string | null;
  effect: string | null;
  requires: string[];
  dry_run: boolean;
  confirm_required: boolean;
  reachable: boolean;
  reason?: string;
  alternative?: string;
}

/**
 * A JSON Schema (2020-12) node, in the keyword subset the projection emits. No $schema, $ref,
 * $id, default or format keyword anywhere.
 */
export interface InputJsonSchema {
  type?: string | string[];
  const?: string;
  enum?: string[];
  description?: string;
  additionalProperties?: boolean;
  properties?: Record<string, InputJsonSchema>;
  required?: string[];
  items?: InputJsonSchema;
  anyOf?: InputJsonSchema[];
  oneOf?: InputJsonSchema[];
}

/**
 * One operation's CLOSED input contract: exactly the operation's declared fields,
 * \`additionalProperties: false\` at the top level. A field the operation does not declare is
 * refused BEFORE any request. \`dry_run\` / \`confirm\` are the tool's own top-level arguments and
 * are never part of the served contract. The contract is NOT a second validator: the host's
 * argument check and the SDK's own refuse-unknown-keys path stay the single implementation.
 */
export interface InputContract {
  op: string;
  effect: 'read' | 'write' | 'destructive';
  closed: true;
  note: string;
  schema: InputJsonSchema;
}

/** One META tool spec (name, title, annotations, input schema). */
export interface MetaToolSpec {
  name: string;
  title: string;
  effect: 'meta';
  description: string;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
  inputSchema: { fields: Array<ReflexiveField> };
}

/** A field descriptor in a META tool's input schema (the registry vocabulary plus an optional enum). */
export interface ReflexiveField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: string[];
}

/** The full description of one registry operation, for the \`kimai_describe\` tool. */
export interface OperationDescription {
  op: string;
  kind: 'primitive' | 'helper';
  resource: string;
  effect: 'read' | 'write' | 'destructive';
  flags: string[];
  dry_run: boolean;
  confirm_required: boolean;
  permissions: string;
  requires: string[];
  input_schema: Record<string, CapabilityArgSchema>;
  input_contract: InputContract | null;
  example: string | null;
  errors: string[];
  related: string[];
  purpose: string | null;
  usage: string | null;
  preferred_when: string | null;
  exposed_tool: string | null;
  reachable: boolean;
  why_not: string | null;
  bounded_alternative: string | null;
  pagination: CapabilityRecord['pagination'];
  resolution: CapabilityRecord['resolution'];
}
`;
const RUNTIME_CONTRACTS = (inputContracts) => `
/** op -> the closed input contract, for exactly the dispatch tool enums (compact by design). */
export const INPUT_CONTRACTS: Record<string, InputContract> = ` + JSON.stringify(inputContracts, null, 0) + `;
`;
const RUNTIME_SCHEMA_FN = `
/**
 * The input JSON Schema (2020-12) to serve as the \`kimai_read\` / \`kimai_write\` / \`kimai_delete\`
 * \`inputSchema\` (pass it to the MCP SDK's \`fromJsonSchema\`). Pure projection over
 * INPUT_CONTRACTS + the META tool enums: it re-derives nothing the registry and projection do
 * not already know.
 */
export function kimaiDispatchInputSchema(effect: 'read' | 'write' | 'destructive'): InputJsonSchema {
  const meta = META_TOOLS.find((tool) => tool.name === (effect === 'destructive' ? 'kimai_delete' : 'kimai_' + effect));
  const operationEnum: string[] = (meta && meta.inputSchema.fields.find((f) => f.name === 'operation')?.enum) || [];
  const top: InputJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['operation'],
    description:
      "input is a CLOSED per-operation contract: exactly the operation's declared fields - an unknown field is refused before any request. "
      + (effect === 'read' ? 'Reads have no dry run. ' : 'Mutations default to a dry-run preview: dry_run: false executes.' + (effect === 'destructive' ? ' Destructive operations also need confirm equal to the operation key. ' : ''))
      + 'Call kimai_describe for the per-operation field table (the same contract, served).',
    properties: {
      operation: { type: 'string', enum: operationEnum, description: 'Canonical registry key (exact, never a tool name; there is no fuzzy match).' },
      input: { type: 'object', description: "The operation's closed input contract: per-operation branches below (oneOf on operation)." },
      ...(effect === 'read' ? {} : {
        dry_run: { type: 'boolean', description: 'Validate without executing (default true); dry_run: false executes the write.' },
        confirm: { type: 'string', description: 'Must equal the operation key exactly for destructive/approval-gated operations.' },
      }),
    },
  };
  top.oneOf = operationEnum.map((op) => {
    const contract = INPUT_CONTRACTS[op];
    const branch: InputJsonSchema = {
      properties: {
        operation: { const: op },
        input: contract ? contract.schema : { type: 'object' },
      },
    };
    if (contract && contract.schema.required && contract.schema.required.length) branch.required = ['operation', 'input'];
    return branch;
  });
  return top;
}
`;
const RUNTIME_HELPERS = `
/** Config refusal, same code the SDK uses for a caller-side configuration error. */
export function configError(message: string): Error {
  const err = new Error(message);
  err.name = 'ConfigError';
  return err;
}

/** One catalog row by canonical operation key, or null. */
export function catalogRow(operation: string): CatalogRow | null {
  for (const row of CATALOG) if (row.op === operation) return row;
  return null;
}

/** The nearest catalog keys to an unknown one (exact-key lookup, but a useful refusal). */
export function nearestKeys(operation: string, limit?: number): string[] {
  const want = String(operation).toLowerCase();
  const head = want.split('.')[0];
  const wantTail = want.split('.')[1] || '';
  const scored = CATALOG.map((row) => {
    const op = row.op.toLowerCase();
    const tail = op.split('.')[1] || '';
    let score = 0;
    if (op.indexOf(want) !== -1 || want.indexOf(op) !== -1) score += 4;
    if (op.split('.')[0] === head) score += 3;
    // A near-miss operation NAME ("timesheet.stop" for "timesheets.stop") must outrank the rest
    // of the resource's operations, so the refusal names the intended key first.
    if (tail !== '' && wantTail !== '' && (tail.startsWith(wantTail) || wantTail.startsWith(tail))) score += 2;
    if (op.indexOf(want.slice(0, 4)) !== -1) score += 1;
    return { op: row.op, score };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  return scored.map((r) => r.op).concat(CATALOG.map((r) => r.op).slice(0, 3)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, limit === undefined ? 5 : limit);
}

/**
 * A bounded, filterable page of the catalog. Filters are ANDed. \`unexposed_only\` is the
 * "what can I reach that has no tool?" question, which is the whole point of the mechanism.
 */
export function catalogPage(options?: CatalogPageOptions) {
  const o: CatalogPageOptions = options || {};
  const limit = o.limit === undefined ? DEFAULT_CATALOG_LIMIT : o.limit;
  const offset = o.offset === undefined ? 0 : o.offset;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_CATALOG_LIMIT) {
    throw configError('kimai_catalog: limit must be an integer from 1 to ' + MAX_CATALOG_LIMIT + ' (got ' + JSON.stringify(o.limit) + '); the catalog is never dumped whole by default.');
  }
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) {
    throw configError('kimai_catalog: offset must be an integer >= 0 (got ' + JSON.stringify(o.offset) + ').');
  }
  const rows = CATALOG.filter((row) => {
    if (o.effect !== undefined && row.effect !== o.effect) return false;
    if (o.resource !== undefined && row.op.split('.')[0] !== o.resource) return false;
    if (o.unexposed_only === true && row.reachable !== true) return false;
    if (o.unexposed_only === true && row.tool !== null) return false;
    return true;
  });
  return {
    total_operations: CATALOG.length,
    reachable_operations: CATALOG.filter((r) => r.reachable === true).length,
    unexposed_operations: CATALOG.filter((r) => r.reachable === true && r.tool === null).length,
    unreachable_operations: CATALOG.filter((r) => r.reachable !== true).length,
    matched: rows.length,
    offset,
    limit,
    has_more: offset + limit < rows.length,
    rows: rows.slice(offset, offset + limit),
  };
}

/** Resolve an operation key to its catalog row, refusing an unknown key by naming the nearest. */
export function requireCatalogRow(operation: string): CatalogRow {
  if (typeof operation !== 'string' || operation.length === 0) {
    throw configError('operation must be a non-empty canonical registry key, for example "timesheets.search".');
  }
  const row = catalogRow(operation);
  if (row !== null) return row;
  const near = nearestKeys(operation, 5);
  throw configError('Unknown operation "' + operation + '". Operation keys are exact registry keys (never a tool name, never fuzzy). Nearest keys: ' + (near.length ? near.join(', ') : '(none)') + '. Call kimai_catalog to list every operation.');
}

// ---- the registry schema reader --------------------------------------------------------------
// \`inputSchema\` is NOT JSON Schema: it is the generator's own vocabulary. This module reads it
// (top-level fields, for \`describeOperation\`'s \`requires\`); it does NOT validate a call against
// it. Validation stays the SDK's, one implementation.

/** The field list of a registry \`inputSchema\`, in either declared shape. */
export function inputFields(inputSchema: unknown): ReflexiveField[] {
  if (inputSchema === null || inputSchema === undefined) return [];
  if (Array.isArray(inputSchema)) return inputSchema as ReflexiveField[];
  const schema = inputSchema as Record<string, unknown>;
  const fields = schema.fields;
  if (Array.isArray(fields)) return fields as ReflexiveField[];
  const out: ReflexiveField[] = [];
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' || k === 'fields' || k === 'name') continue;
    if (v !== null && typeof v === 'object') out.push(v as ReflexiveField);
  }
  return out;
}

/**
 * One operation's full description, from the registry record the host passes in. The generic
 * registry vocabulary is echoed verbatim; \`reachable\` / \`why_not\` come from the generated catalog.
 */
export function describeOperation(record: CapabilityRecord): OperationDescription {
  const row = requireCatalogRow(record.id);
  const required: string[] = [];
  for (const field of inputFields(record.inputSchema)) if (field.required === true) required.push(field.name);
  const meta = (record.metadata || {}) as Record<string, unknown>;
  const related = Array.isArray(meta.related) ? (meta.related as string[]) : [];
  return {
    op: record.id,
    kind: record.kind,
    resource: record.resource,
    effect: record.effect,
    flags: record.flags || [],
    dry_run: row.dry_run,
    confirm_required: row.confirm_required === true,
    permissions: record.permissions,
    requires: required,
    input_schema: record.inputSchema,
    input_contract: INPUT_CONTRACTS[record.id] || null,
    example: (record.examples || [])[0] || null,
    errors: record.errors || [],
    related,
    purpose: typeof meta.purpose === 'string' ? meta.purpose : null,
    usage: typeof meta.usage === 'string' ? meta.usage : null,
    preferred_when: typeof meta.preferredWhen === 'string' ? meta.preferredWhen : null,
    exposed_tool: row.tool,
    reachable: row.reachable,
    why_not: row.reason === undefined ? null : row.reason,
    bounded_alternative: row.alternative === undefined ? null : row.alternative,
    pagination: record.pagination || null,
    resolution: record.resolution || null,
  };
}
`;

function mainGuard() { return ''; }

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
export { renderModule };
