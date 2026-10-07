#!/usr/bin/env node
/**
 * scripts/project-mcp-tools.mjs — `npm run mcp:project`
 *                                  `npm run mcp:project:check`
 *
 * Mechanical MCP projection of the generated capability registry (capabilities.json) into
 * MCP_TOOL_MANIFEST.md, plus the curated tool surface selected on top of it.
 *
 * Normative standard: ~/.prime/agent/skills/api-node-squad/references/mcp-tool-manifest.md
 * (the five required properties of progressive disclosure) and agent-execution-layer.md
 * §4.2 (registry -> manifest projection) and §9 (compact shapes).
 *
 * It is a PROJECTION, not curation:
 *   - tool name        = kimai_<verb>_<scope>, derived mechanically from the registry record
 *                        (an explicit, documented operation -> verb table below);
 *   - title            = mechanical title-case of the tool name;
 *   - description      = registry `metadata.purpose` + `metadata.usage`, VERBATIM, plus one
 *                        mechanical bounds/annotations sentence derived from effect, flags,
 *                        pagination, resolution and compact — never re-derived from source;
 *   - backingOperation = the registry record id the tool serves;
 *   - inputSchema      = the registry record's own params/target fields (helpers gain the
 *                        bounded `limit` and the `expand` escape hatch; mutations gain the
 *                        `dry_run` affordance and, where required, the `confirm` flag);
 *   - outputSchema     = the registry `outputSchema` (compact shape + the fields it drops);
 *   - annotations      = derived from `effect` + `flags` only (`openWorldHint` states that the
 *                        tool reaches the Kimai instance over the network);
 *   - the always-on CORE tier is COMPUTED from the written CORE_RULE, never a hand list;
 *   - the CATALOG is generated for EVERY non-core registry operation (drift check:
 *                        registry - core <= catalog), so an unexposed capability stays
 *                        reachable and discoverable.
 *
 * Curation lives ONLY in MCP_TOOL_OVERRIDES.json (repo root): an array of
 * { tool, field, newValue, reason } records. `field: "exclude"` with `newValue: true` drops a
 * projected tool (reported, never silent). An override naming an unknown tool/field, or a
 * registry operation in neither the core nor the catalog, exits non-zero.
 *
 * Usage:
 *   node scripts/project-mcp-tools.mjs            # write MCP_TOOL_MANIFEST.md
 *   node scripts/project-mcp-tools.mjs --check    # rebuild-and-diff, exit non-zero on drift
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IS_MAIN = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = process.cwd();
const argv = process.argv.slice(2);
const argValue = (flag, fallback) => { const i = argv.indexOf(flag); return i === -1 ? fallback : argv[i + 1]; };
const REGISTRY = path.resolve(ROOT, argValue('--registry', 'capabilities.json'));
const OUT = path.resolve(ROOT, argValue('--out', 'MCP_TOOL_MANIFEST.md'));
const OVERRIDES_PATH = path.resolve(ROOT, 'MCP_TOOL_OVERRIDES.json');
const CHECK = argv.includes('--check');
const TOOL_PREFIX = 'kimai_';

// ---------------------------------------------------------------------------- naming

/** Singular scope per registry resource (single-record verbs). */
const SINGULAR = {
  actions: 'action', activities: 'activity', approvalBundle: 'approval_bundle', config: 'config',
  customers: 'customer', export: 'export', invoices: 'invoice', projects: 'project', system: 'system',
  tags: 'tag', teams: 'team', timesheets: 'timesheet', users: 'user',
};
/** Collection scope per registry resource (list/search verbs). */
const PLURAL = {
  actions: 'actions', activities: 'activities', approvalBundle: 'approval_bundles', config: 'config',
  customers: 'customers', export: 'export', invoices: 'invoices', projects: 'projects', system: 'system',
  tags: 'tags', teams: 'teams', timesheets: 'timesheets', users: 'users',
};
const sing = (r) => SINGULAR[r] ?? r;
const plur = (r) => PLURAL[r] ?? r;

/**
 * Explicit, documented operation -> name-suffix table (the mechanical naming rule).
 * `<prefix>_<verb>_<scope>` with verb in {list,get,create,update,delete} plus one explicit
 * verb per special op. No operation falls through: an unknown operation is a defect.
 */
const OPERATION_NAME = {
  list: (r) => `list_${plur(r)}`,
  get: (r) => `get_${sing(r)}`,
  find: (r) => `find_${plur(r)}`,
  resolve: (r) => `resolve_${sing(r)}`,
  search: (r) => `search_${plur(r)}`,
  getContext: (r) => `get_${sing(r)}_context`,
  create: (r) => `create_${sing(r)}`,
  update: (r) => `update_${sing(r)}`,
  delete: (r) => `delete_${sing(r)}`,
  updateMeta: (r) => `update_${sing(r)}_meta`,
  createRate: (r) => `create_${sing(r)}_rate`,
  getRates: (r) => `get_${sing(r)}_rates`,
  deleteRate: (r) => `delete_${sing(r)}_rate`,
  createComment: (r) => `create_${sing(r)}_comment`,
  listComments: (r) => `list_${sing(r)}_comments`,
  deleteComment: (r) => `delete_${sing(r)}_comment`,
  pinComment: (r) => `pin_${sing(r)}_comment`,
  addToTeam: (r) => `add_${sing(r)}_to_team`,
  addMember: () => 'add_team_member',
  removeMember: () => 'remove_team_member',
  grantActivityAccess: () => 'grant_team_activity_access',
  grantCustomerAccess: () => 'grant_team_customer_access',
  grantProjectAccess: () => 'grant_team_project_access',
  revokeActivityAccess: () => 'revoke_team_activity_access',
  revokeCustomerAccess: () => 'revoke_team_customer_access',
  revokeProjectAccess: () => 'revoke_team_project_access',
  duplicate: (r) => `duplicate_${sing(r)}`,
  stop: (r) => `stop_${sing(r)}`,
  restart: (r) => `restart_${sing(r)}`,
  toggleExport: (r) => `toggle_${sing(r)}_export`,
  getActive: (r) => `get_active_${plur(r)}`,
  getRecent: (r) => `get_recent_${plur(r)}`,
  getMe: () => 'get_current_user',
  getVersion: () => 'get_version',
  getPlugins: () => 'list_plugins',
  getColors: () => 'get_colors',
  getTimesheetConfig: () => 'get_timesheet_config',
  updateCustomFields: (r) => `update_${sing(r)}_custom_fields`,
  updatePreferences: () => 'update_user_preferences',
  deleteApiToken: () => 'delete_user_api_token',
  deleteTemplate: () => 'delete_export_template',
  getActions: () => 'get_actions',
  ping: () => 'ping',
  download: (r) => `download_${sing(r)}`,
  weekStatus: () => 'get_week_status',
  nextWeek: () => 'get_next_approval_week',
  overtimeYear: () => 'get_overtime_year',
  weeklyOvertime: () => 'get_weekly_overtime',
  addToApprove: () => 'submit_for_approval',
};

const ACRONYMS = new Set(['api', 'id', 'url', 'json', 'csv', 'meta']);
const titleCase = (name) => name.replace(/^kimai_/, '').split('_')
  .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  .join(' ');

/** Tool name for a registry record; throws when an operation has no naming rule. */
function toolNameFor(rec) {
  const rule = OPERATION_NAME[rec.operation];
  if (!rule) throw new Error(`no tool-name rule for operation "${rec.operation}" (${rec.id}) — add it to OPERATION_NAME`);
  return `${TOOL_PREFIX}${rule(rec.resource)}`;
}

// ---------------------------------------------------------------------------- rules

const isBinary = (rec) => rec.operation === 'download' || rec.outputSchema?.type === 'ArrayBuffer';

/** Read primitives fully covered by a helper on the same resource (tools back onto the helper tier). */
function subsumedBy(rec, helpers) {
  if (rec.kind !== 'primitive') return null;
  const forRes = helpers.get(rec.resource) ?? {};
  if (rec.operation === 'list' && forRes.search) return `subsumed by the helper ${forRes.search} (bounded search covers list + filter; name one read tool per resource)`;
  if (rec.operation === 'get' && forRes.resolve) return `subsumed by the helper ${forRes.resolve} (resolve covers get-by-id, compact with an expand escape hatch)`;
  if (rec.operation === 'find' && forRes.search) return `subsumed by the helper ${forRes.search} (one search tool per resource)`;
  return null;
}

/** One mechanical bounds sentence per record, derived from registry fields only. */
function boundsSentence(rec) {
  const parts = [];
  const pag = rec.pagination ?? { mode: 'none' };
  if (rec.kind === 'helper' && rec.operation === 'search') parts.push('Bounded: limit default 25, hard max 100.');
  if (rec.resolution) parts.push(`Bounded: resolution scans up to ${rec.resolution.maxScanRecords} records / ${rec.resolution.maxScanPages} page(s) (${rec.resolution.basis}).`);
  if (rec.kind === 'helper' && rec.compact) parts.push(`Compact ${rec.compact} by default; expand: true returns the full record.`);
  if (rec.kind === 'helper' && rec.operation === 'getContext') parts.push('Compact by default; expand: true for the full child records.');
  if (rec.effect === 'read' && rec.operation === 'list') {
    parts.push(pag.mode === 'page'
      ? `Bounded: vendor page mode (default page size ${pag.vendorDefaultPageSize ?? '?'}, max ${pag.vendorMaxPageSize ?? '?'}).`
      : 'Returns all matching records (the endpoint is non-paginated); prefer a search helper where one exists.');
  }
  if (rec.effect === 'write') parts.push('Dry-run first (dry_run: true validates and returns the plan; the request is never issued).');
  if (rec.effect === 'destructive') parts.push('Irreversible.');
  if (rec.effect === 'destructive' || (rec.flags ?? []).includes('requiresApproval')) parts.push(`Requires confirmation (confirm: ${rec.id}).`);
  if ((rec.flags ?? []).includes('sensitive')) parts.push('Sensitive: the gateway must gate this call.');
  if ((rec.flags ?? []).includes('idempotent')) parts.push('Idempotent by semantics (no vendor idempotency-key mechanism).');
  return parts.join(' ');
}

function annotationsFor(rec) {
  if (rec.effect === 'read') return { readOnlyHint: true, destructiveHint: false, idempotentHint: (rec.flags ?? []).includes('idempotent'), openWorldHint: true };
  return {
    readOnlyHint: false,
    destructiveHint: rec.effect === 'destructive',
    idempotentHint: (rec.flags ?? []).includes('idempotent'),
    openWorldHint: true,
  };
}

/** The projected input fields for one record (registry params + the mechanical affordances). */
function inputFields(rec) {
  const fields = [];
  for (const [name, spec] of Object.entries(rec.inputSchema ?? {})) {
    if (name === 'opts') continue; // folded into limit / expand / dry_run below
    fields.push({ name, type: spec.type, required: !!spec.required, description: spec.description ?? null });
  }
  if (rec.kind === 'helper') {
    // Faithful to the registry opts bag: only the affordances the record's own `opts`
    // description declares are exposed (never a limit the SDK method does not take).
    const optsDesc = rec.inputSchema?.opts?.description ?? '';
    if (optsDesc.includes('limit')) fields.push({ name: 'limit', type: 'number', required: false, description: 'Max rows (default 25, hard max 100; out of range throws KimaiConfigError — never clamped).' });
    if (optsDesc.includes('expand')) fields.push({ name: 'expand', type: 'boolean', required: false, description: 'true = return the full typed record instead of the compact shape.' });
    if (optsDesc.includes('resolutionDetails')) fields.push({ name: 'resolution_details', type: 'boolean', required: false, description: 'true = return the Resolution wrapper (cost, scanned, scanTruncated) instead of the bare record.' });
  }
  if (rec.effect !== 'read') {
    fields.push({ name: 'dry_run', type: 'boolean', required: false, description: 'true = validate the write and return the DryRunResult plan; the mutating request is never issued.' });
  }
  if (rec.effect === 'destructive' || (rec.flags ?? []).includes('requiresApproval')) {
    fields.push({ name: 'confirm', type: 'string', required: true, description: `Must equal "${rec.id}" exactly (the deliberate act is the call); a mismatch is refused before any request.` });
  }
  return fields;
}

function outputSpec(rec) {
  const type = rec.outputSchema?.type ?? 'unknown';
  const drops = rec.outputSchema?.drops ?? [];
  const compact = drops.length > 0 ? ` (drops ${drops.join(', ')} — expand: true returns them)` : '';
  const dry = type.includes('DryRunResult') ? ' | DryRunResult<...> when dry_run: true' : '';
  return `${type.replace(/ \| DryRunResult<[^>]*>/g, '')}${dry}${compact}`;
}

function renderFields(fields) {
  if (fields.length === 0) return 'none';
  return fields.map((f) => `${f.name}: ${f.type}${f.required ? ' (required)' : ''}`).join(', ');
}

function renderFieldsFull(fields) {
  if (fields.length === 0) return '| _none_ | | | |';
  return fields.map((f) => `| \`${f.name}\` | \`${f.type}\` | ${f.required ? 'yes' : 'no'} | ${oneLine(f.description ?? '')} |`).join('\n');
}

function exampleOf(rec) {
  return Array.isArray(rec.examples) && rec.examples.length ? rec.examples[0] : null;
}

// ---------------------------------------------------------------------------- core rule

/**
 * CORE_RULE (mcp-tool-manifest.md "Progressive disclosure", property 3) — computed, never a
 * hand list. Above ~10 projected tools the surface discloses progressively.
 *   R1  the five META tools (catalog / describe / read / write / delete) — the mechanism,
 *       with no registry backing (they serve every operation);
 *   R2  identify the API-key owner (`users.getMe`);
 *   R3  discovery is R1's catalog (Kimai's registry has no cross-resource resolve operation);
 *   R4  one bounded helper-tier read per `workflowResource: true` resource; where the resource
 *       has no search helper, its bounded week/status read stands in.
 * Writes are NOT in core: they are reachable through the write/delete dispatch, dry-run first.
 */
function coreRule(records, plan) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const core = [];
  const add = (opId, requirement, note) => {
    const rec = byId.get(opId);
    if (!rec) throw new Error(`CORE_RULE: registry record "${opId}" is missing — the core tier cannot be built`);
    core.push({ op: opId, name: toolNameFor(rec), requirement, note: note ?? '', effect: rec.effect });
  };
  const META = [
    ['kimai_catalog', 'Discover Operations (Catalog)'],
    ['kimai_describe', 'Describe One Operation'],
    ['kimai_read', 'Read One Registry Operation (read mode)'],
    ['kimai_write', 'Write One Registry Operation (write mode)'],
    ['kimai_delete', 'Delete One Registry Operation (delete mode)'],
  ];
  for (const [name, title] of META) core.push({ op: null, name, requirement: 'R1', note: `META tool — ${title}`, effect: 'meta' });
  add('users.getMe', 'R2', 'identify the API-key owner');
  for (const [key, entry] of Object.entries(plan.resources ?? {})) {
    if (!entry.workflowResource) continue;
    const helpers = records.filter((r) => r.resource === key && r.kind === 'helper');
    const search = helpers.find((h) => h.operation === 'search');
    const bounded = search ?? records.find((r) => r.resource === key && r.effect === 'read' && r.operation === 'weekStatus');
    if (!bounded) throw new Error(`CORE_RULE: workflow resource "${key}" has no bounded read — the core tier cannot be built`);
    core.push({ op: bounded.id, name: toolNameFor(bounded), requirement: 'R4', note: `workflowResource: ${key}`, effect: bounded.effect });
  }
  return core;
}

// ---------------------------------------------------------------------------- projection

function project(registry, overrides) {
  const records = [];
  for (const section of Object.values(registry.groups ?? {})) for (const r of section.records) records.push(r);
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byId = new Map(records.map((r) => [r.id, r]));

  const planRaw = existsSync(path.resolve(ROOT, 'capabilities.plan.json'))
    ? JSON.parse(readFileSync(path.resolve(ROOT, 'capabilities.plan.json'), 'utf8'))
    : { resources: {} };
  const planHash = Object.values(registry.groups ?? {})[0]?.planHash ?? '';

  // helpers per resource (for the subsumption / helper-tier rules)
  const helpers = new Map();
  for (const r of records) {
    if (r.kind !== 'helper') continue;
    const entry = helpers.get(r.resource) ?? {};
    entry[r.operation] = r.id;
    helpers.set(r.resource, entry);
  }

  const excluded = [];   // binary rules
  const subsumed = [];   // read primitives covered by a helper
  const tools = [];
  for (const rec of records) {
    if (isBinary(rec)) { excluded.push({ operation: rec.id, reason: 'binary/download output (ArrayBuffer) — cannot map to MCP text content' }); continue; }
    const why = subsumedBy(rec, helpers);
    if (why) { subsumed.push({ operation: rec.id, reason: why }); continue; }
    const purpose = rec.metadata?.purpose?.trim() ? rec.metadata.purpose.trim() : '<MISSING purpose>';
    const usage = rec.metadata?.usage?.trim() ?? '';
    const description = usage && usage !== purpose ? `${purpose} ${usage}` : purpose;
    tools.push({
      name: toolNameFor(rec),
      title: titleCase(toolNameFor(rec)),
      backingOperation: rec.id,
      resource: rec.resource,
      kind: rec.kind,
      operation: rec.operation,
      effect: rec.effect,
      flags: rec.flags ?? [],
      description,
      purpose,
      usage,
      bounds: boundsSentence(rec),
      annotations: annotationsFor(rec),
      input: inputFields(rec),
      output: outputSpec(rec),
      example: exampleOf(rec),
      errors: rec.errors ?? [],
      overridden: [],
    });
  }
  const byName = new Map(tools.map((t) => [t.name, t]));

  // ---- curation overrides (the only place a name/description/tier may change)
  const applied = [];
  const unresolved = [];
  const curationExcluded = [];
  for (const ov of overrides) {
    if (!ov || typeof ov.tool !== 'string' || typeof ov.field !== 'string') { unresolved.push({ ov, why: 'override needs { tool, field, newValue, reason }' }); continue; }
    const tool = byName.get(ov.tool);
    if (!tool) { unresolved.push({ ov, why: `no projected tool named "${ov.tool}"` }); continue; }
    if (ov.field === 'exclude') {
      if (ov.newValue !== true) { unresolved.push({ ov, why: 'exclude expects newValue: true' }); continue; }
      curationExcluded.push({ name: tool.name, backingOperation: tool.backingOperation, effect: tool.effect, reason: ov.reason ?? '' });
      tools.splice(tools.indexOf(tool), 1);
      byName.delete(tool.name);
      applied.push(ov);
      continue;
    }
    if (ov.field === 'description') tool.description = ov.newValue;
    else if (ov.field === 'title') tool.title = ov.newValue;
    else if (ov.field === 'name') { byName.delete(tool.name); tool.name = ov.newValue; byName.set(tool.name, tool); }
    else { unresolved.push({ ov, why: `field "${ov.field}" is not one of name|title|description|exclude` }); continue; }
    tool.overridden.push(ov.field);
    applied.push(ov);
  }

  const core = coreRule(records, planRaw);
  const coreNames = new Set(core.map((c) => c.name));
  const coreOps = new Set(core.filter((c) => c.op).map((c) => c.op));

  // ---- catalog: EVERY non-core registry operation (drift: registry - core <= catalog)
  const catalog = records
    .filter((r) => !coreOps.has(r.id))
    .map((r) => {
      const tool = byName.get(toolNameFor(r));
      return {
        operation: r.id,
        tool: tool ? tool.name : null,
        effect: r.effect,
        kind: r.kind,
        purpose: (r.metadata?.purpose ?? '').trim() || '<MISSING purpose>',
        preferredWhen: (r.metadata?.preferredWhen ?? null),
        reachableVia: tool ? tool.name : dispatchTool(r.effect),
      };
    });

  // drift guard (property 5): every registry operation resolves to a core tool or a catalog row
  for (const r of records) {
    if (coreOps.has(r.id)) continue;
    if (!catalog.some((c) => c.operation === r.id)) unresolved.push({ ov: null, why: `registry operation "${r.id}" is in neither the core nor the catalog` });
  }

  const coreRows = core.map((c) => ({ ...c, tool: c.op ? byName.get(c.name) ?? null : null }));
  const extended = tools.filter((t) => !coreNames.has(t.name)).sort((a, b) => (a.name < b.name ? -1 : 1));

  return { records, tools, core: coreRows, coreNames, extended, catalog, excluded, subsumed, curationExcluded, applied, unresolved, planHash, plan: planRaw };
}

const dispatchTool = (effect) => (effect === 'read' ? 'kimai_read' : effect === 'write' ? 'kimai_write' : 'kimai_delete');

// ---------------------------------------------------------------------------- render

const FENCE = '```';

function render(data) {
  const md = [];
  const nl = () => md.push('');
  md.push('# MCP Tool Manifest — node-kimai');
  nl();
  md.push('> **Machine-generated** by `scripts/project-mcp-tools.mjs` (`npm run mcp:project`) from');
  md.push(`> \`capabilities.json\` (planHash \`${data.planHash.slice(0, 16)}…\`). Do not hand-edit.`);
  md.push('> Curation is recorded in `MCP_TOOL_OVERRIDES.json` and re-applied by the script.');
  nl();
  md.push('## Projection summary');
  nl();
  md.push(`- registry records: ${data.records.length}`);
  md.push(`- projected tools: ${data.tools.length + data.curationExcluded.length} (${data.tools.length} after curation exclusions)`);
  md.push(`- always-on core tier: ${data.core.length} tools (${data.core.filter((c) => c.op).length} registry-backed + ${data.core.filter((c) => !c.op).length} META)`);
  md.push(`- catalog entries: ${data.catalog.length} (every non-core registry operation)`);
  md.push(`- excluded by rule: ${data.excluded.length} (binary/download)`);
  md.push(`- subsumed read primitives: ${data.subsumed.length} (covered by a helper — see below)`);
  md.push(`- excluded by curation: ${data.curationExcluded.length}`);
  md.push(`- overrides applied: ${data.applied.length}`);
  md.push(`- projected at: ${new Date().toISOString()}`);
  nl();
  md.push('## Progressive disclosure — the decision');
  nl();
  md.push(`The projected surface is **${data.tools.length} tools**, above the ~10-tool threshold, so the`);
  md.push('surface is disclosed **progressively**, not flat. The always-on core is');
  md.push(`**${data.core.length} tools**; every other registry operation is a GENERATED catalog entry reachable`);
  md.push('through the dispatch meta-tools. A flat surface is NOT justified here.');
  nl();
  md.push('The five required properties (mcp-tool-manifest.md) as implemented:');
  nl();
  md.push('1. **REACHABILITY** — a capability with no dedicated tool is invoked through `kimai_read`');
  md.push('   (effect `read`), `kimai_write` (effect `write`, dry-run first) or `kimai_delete` (effect');
  md.push('   `destructive`, `confirm` required). Dispatch input is validated against the registry');
  md.push("   record's `inputSchema` **before** the SDK call — an argument the record does not declare");
  md.push('   is refused with a typed `CONFIG_ERROR`, never forwarded.');
  md.push('2. **HONESTY** — every registry operation is either in the core or listed in the catalog');
  md.push('   below with its name, purpose and `preferredWhen`, so an agent can learn a capability');
  md.push('   exists and how to reach it instead of concluding the SDK cannot do it.');
  md.push('3. **CORE SET BY EVIDENCE** — the written `CORE_RULE` (R1–R4) below, computed by the');
  md.push('   projection, produces the core list. Two people applying the rule get the same core.');
  md.push('4. **NO GOD-TOOL** — the catalog/dispatch pair is a FALLBACK behind the described core;');
  md.push('   the core alone completes the common read work (identity, bounded search per workflow');
  md.push('   resource). A single unvalidated `operation` dispatcher is never the only tool.');
  md.push('5. **DRIFT** — the catalog and this manifest are generated from `capabilities.json`;');
  md.push('   `npm run mcp:project:check` fails when a registry operation is in neither the core nor');
  md.push(`   the catalog, or when this file differs from a fresh projection.`);
  nl();
  md.push('This manifest specifies the required MCP server contract. node-kimai is an MCP-independent SDK:');
  md.push('the server that registers these tools lives in a separate package (see `examples/mcp-usage.ts`');
  md.push('for the data-layer patterns). The dispatch safety rules in property 1 are requirements on that');
  md.push('server, not claims about code in this repository. A host MAY also load any extended tool');
  md.push('on demand in addition to the always-on core.');
  nl();
  md.push('### CORE_RULE');
  nl();
  md.push('- **R1** the five META tools (catalog / describe / read / write / delete) — the mechanism.');
  md.push('- **R2** identify the API-key owner (`users.getMe`).');
  md.push('- **R3** discovery is R1: the generated catalog (`kimai_catalog`) + `kimai_describe`. The');
  md.push('  Kimai registry has no cross-resource `resolve`/`searchAcrossResources` operation.');
  md.push('- **R4** one bounded helper-tier read per `workflowResource: true` resource');
  md.push('  (`resources[].workflowResource` in `capabilities.plan.json`). Where a resource has no');
  md.push('  search helper, its bounded week/status read stands in.');
  md.push('- Writes are NOT in the core: they are reachable through `kimai_write` / `kimai_delete`,');
  md.push('  dry-run first, destructive calls confirmation-gated.');
  nl();
  md.push('## Core tier — always on');
  nl();
  md.push('| # | tool | backingOperation | rule | effect | description |');
  md.push('|---|------|------------------|------|--------|-------------|');
  data.core.forEach((c, i) => {
    const desc = c.tool ? `${c.tool.description}${c.tool.bounds ? ' ' + c.tool.bounds : ''}` : META_DESCRIPTION[c.name];
    md.push(`| ${i + 1} | \`${c.name}\` | ${c.op ?? '— (serves every operation)'} | ${c.requirement} | ${c.effect} | ${oneLine(desc)} |`);
  });
  nl();
  md.push('### Core tool detail');
  nl();
  for (const c of data.core) {
    md.push(`#### \`${c.name}\` — ${c.tool ? c.tool.title : META_TITLE[c.name]}`);
    nl();
    md.push(`**Backing operation:** ${c.op ? '`' + c.op + '`' : 'none (the disclosure mechanism itself)'}`);
    nl();
    md.push(`**Description:** ${c.tool ? `${c.tool.description}${c.tool.bounds ? ' ' + c.tool.bounds : ''}` : META_DESCRIPTION[c.name]}`);
    nl();
    if (c.tool) {
      md.push('**Input:**');
      nl();
      md.push('| field | type | required | notes |');
      md.push('|-------|------|----------|-------|');
      md.push(renderFieldsFull(c.tool.input));
      nl();
      md.push(`**Output:** \`${c.tool.output}\``);
      nl();
      md.push(`**Annotations:** ${renderAnnotations(c.tool.annotations)}${c.tool.flags.length ? ` · flags: ${c.tool.flags.join(', ')}` : ''}`);
      nl();
      if (c.tool.example) { md.push(`**Example:** \`${c.tool.example}\``); nl(); }
      md.push(`**Errors:** ${c.tool.errors.join(', ') || '—'}`);
      nl();
    } else {
      md.push('**Input:**');
      nl();
      md.push('| field | type | required | notes |');
      md.push('|-------|------|----------|-------|');
      const fields = c.name === 'kimai_write' ? [...(META_INPUT[c.name] ?? []), metaWriteConfirmField(data.records)] : (META_INPUT[c.name] ?? []);
      md.push(renderFieldsFull(fields));
      nl();
      md.push(`**Annotations:** ${renderAnnotations(META_ANNOTATIONS[c.name])}`);
      nl();
    }
    md.push('---');
    nl();
  }
  md.push('## Catalog — every non-core registry operation (generated)');
  nl();
  md.push('One row per registry operation outside the core. `tool` is the dedicated tool when one');
  md.push('exists; otherwise the operation is reachable through the dispatch tool named in');
  md.push('`reachable via`. `preferredWhen` is the registry guidance verbatim.');
  nl();
  md.push('| operation | dedicated tool | effect | purpose | preferredWhen | reachable via |');
  md.push('|-----------|----------------|--------|---------|---------------|---------------|');
  for (const c of data.catalog) {
    md.push(`| \`${c.operation}\` | ${c.tool ? '`' + c.tool + '`' : '—'} | ${c.effect} | ${oneLine(c.purpose)} | ${c.preferredWhen ? oneLine(c.preferredWhen) : '—'} | \`${c.reachableVia}\` |`);
  }
  nl();
  md.push('## Extended tools (projected beyond the core)');
  nl();
  md.push('Dedicated tools outside the always-on core. They are loadable on demand and remain');
  md.push('reachable through the dispatch tools regardless. All read tools back onto the helper tier');
  md.push('where one exists; every mutation carries the `dry_run` affordance.');
  nl();
  for (const effect of ['read', 'write', 'destructive']) {
    const rows = data.extended.filter((t) => t.effect === effect);
    md.push(`### ${effect} — ${rows.length} tools`);
    nl();
    if (rows.length === 0) { md.push('(none)'); nl(); continue; }
    md.push('| tool | backingOperation | kind | input | output | annotations |');
    md.push('|------|------------------|------|-------|--------|-------------|');
    for (const t of rows) {
      md.push(`| \`${t.name}\` | \`${t.backingOperation}\` | ${t.kind} | ${inline(renderFields(t.input))} | ${inline(t.output)} | ${renderAnnotations(t.annotations)} |`);
    }
    nl();
  }
  md.push('## Excluded by rule');
  nl();
  md.push('### Binary / download (never an MCP tool)');
  nl();
  if (data.excluded.length === 0) md.push('(none)');
  else for (const e of data.excluded) md.push(`- \`${e.operation}\` — ${e.reason}`);
  nl();
  md.push('### Read primitives subsumed by a helper (tools back onto the helper tier)');
  nl();
  if (data.subsumed.length === 0) md.push('(none)');
  else for (const s of data.subsumed) md.push(`- \`${s.operation}\` — ${s.reason}`);
  nl();
  md.push('### Excluded by curation (`MCP_TOOL_OVERRIDES.json`)');
  nl();
  if (data.curationExcluded.length === 0) md.push('(none)');
  else for (const c of data.curationExcluded) md.push(`- \`${c.name}\` (\`${c.backingOperation}\`, ${c.effect}) — ${c.reason}`);
  nl();
  md.push('## Annotations and the error contract');
  nl();
  md.push('- `readOnlyHint` ← `effect === "read"`; `destructiveHint` ← `effect === "destructive"`;');
  md.push('  `idempotentHint` ← the registry `idempotent` flag. The registry records');
  md.push('  `retry.idempotencySupport: "none"` for every operation: Kimai exposes no');
  md.push('  idempotency-key mechanism, so `idempotentHint` states natural semantic idempotency');
  md.push('  (update/delete by id), not a vendor guarantee.');
  md.push('- `openWorldHint: true` on every tool: each call reaches the Kimai instance over the network.');
  md.push('- `sensitive` and `requiresApproval` records say so in their description; the SDK does');
  md.push('  not enforce approval policy — the manifest advertises the need so the gateway can gate it.');
  md.push('- Errors surface the SDK `ApiError` fields `code`, `category`, `status`/`httpStatus`,');
  md.push('  `retryable`, `suggestedAction`, `operation`, `request` (the request PATH only) and');
  md.push('  `retryAfter`. A tool NEVER returns the request headers, the API token, or the raw vendor');
  md.push('  error body, so a credential cannot leak through an error block.');
  md.push('- Reads are search-first: `kimai_catalog`/`kimai_describe` name the bounded helper for a');
  md.push('  resource; `limit` is capped at 100 on every read tool.');
  nl();
  md.push('## Overrides applied (`MCP_TOOL_OVERRIDES.json`)');
  nl();
  if (data.applied.length === 0) md.push('None — the projection is faithful to the registry text.');
  else {
    md.push('| tool | field | reason |');
    md.push('|------|-------|--------|');
    for (const o of data.applied) md.push(`| \`${o.tool}\` | ${o.field}${o.field === 'exclude' ? ' (drop)' : ''} | ${oneLine(o.reason ?? '')} |`);
  }
  nl();
  md.push('## Meta');
  nl();
  md.push(`- planHash: \`${data.planHash}\``);
  md.push(`- registry records: ${data.records.length}`);
  md.push(`- projected tools: ${data.tools.length}`);
  md.push(`- core tier: ${data.core.length}`);
  md.push(`- catalog entries: ${data.catalog.length}`);
  md.push('');
  return md.join('\n');
}

const oneLine = (s) => String(s ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();
const inline = (s) => '`' + String(s ?? '').replace(/`/g, "'") + '`';
const renderAnnotations = (a) => Object.entries(a).filter(([, v]) => v === true).map(([k]) => k).join(', ') || '—';

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
  kimai_read: [
    { name: 'operation', type: 'string', required: true, description: 'A registry key whose effect is "read".' },
    { name: 'input', type: 'object', required: false, description: "Closed per-operation contract: exactly the operation's declared fields, nothing else." },
  ],
  kimai_write: [
    { name: 'operation', type: 'string', required: true, description: 'A registry key whose effect is "write".' },
    { name: 'input', type: 'object', required: false, description: "Closed per-operation contract: exactly the operation's declared fields, nothing else." },
    { name: 'dry_run', type: 'boolean', required: false, description: 'true (default) = return the plan without issuing the write.' },
  ],
  kimai_delete: [
    { name: 'operation', type: 'string', required: true, description: 'A registry key whose effect is "destructive".' },
    { name: 'input', type: 'object', required: false, description: "Closed per-operation contract: exactly the operation's declared fields, nothing else." },
    { name: 'confirm', type: 'string', required: true, description: 'Must equal the operation key exactly; otherwise the call is refused.' },
  ],
};
/**
 * The confirmation-gated WRITE operations (registry `flags: ['requiresApproval']`). They carry a
 * `confirm` argument in the write dispatcher's schema, so the manifest must declare it too - the
 * catalog row's `confirm_required: true` and the tool's declared arguments are one claim.
 */
function metaWriteConfirmField(records) {
  const gated = records.filter((r) => r.effect === 'write' && (r.flags ?? []).includes('requiresApproval')).map((r) => r.id).sort();
  return {
    name: 'confirm',
    type: 'string',
    required: false,
    description: `Required for the approval-gated write operations (${gated.join(', ')}): must equal the operation key exactly, otherwise the call is refused; a plain mutation does not need it.`,
  };
}
const META_ANNOTATIONS = {
  kimai_catalog: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  kimai_describe: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  kimai_read: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  kimai_write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  kimai_delete: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
};

const META_TITLE = {
  kimai_catalog: 'Discover Operations (Catalog)',
  kimai_describe: 'Describe One Operation',
  kimai_read: 'Read One Registry Operation',
  kimai_write: 'Write One Registry Operation',
  kimai_delete: 'Delete One Registry Operation',
};
const META_DESCRIPTION = {
  kimai_catalog: 'List the capabilities the node-kimai registry implements with the tool that exposes each one (when it has one), its effect, whether it needs a dry run or a confirmation flag, and the arguments it requires. The tool list on this server is a SUBSET: this is a curated core profile, and the catalog is how you discover a capability that has no tool of its own — find the row, call kimai_describe for the exact schema, then kimai_read/kimai_write/kimai_delete. Bounded: limit defaults to 40 and is hard-capped at 100; prefer a filter over dumping the catalog.',
  kimai_describe: 'Return the full input schema, effect, flags, dry-run support, error vocabulary, related operations and preferredWhen guidance for ONE registry operation, so a capability can be called correctly without carrying every schema in context. Use it after kimai_catalog named the operation and before kimai_read/kimai_write/kimai_delete. Takes the canonical operation key exactly as the catalog prints it (for example "timesheets.search") — never a tool name, and there is no fuzzy matching: an unknown key is a CONFIG_ERROR naming the nearest catalog keys.',
  kimai_read: 'Execute only effect "read" operations by canonical registry key. Prefer the dedicated bounded search/resolve tools where they exist; use this dispatch for a read with no dedicated tool. `input` is a CLOSED per-operation contract: exactly the operation\'s declared fields — an unknown field is refused with a typed CONFIG_ERROR before any request. Reads have no dry run and never mutate.',
  kimai_write: 'Execute only effect "write" operations by canonical registry key. Mutations default to a dry-run preview (dry_run: true returns the plan; the request is never issued); dry_run: false executes. `input` is a CLOSED per-operation contract — an unknown field is refused before any request. A destructive operation is REFUSED here; use kimai_delete.',
  kimai_delete: 'Execute only effect "destructive" operations by canonical registry key. Destructive calls are irreversible and REFUSED without `confirm` equal to the operation key. `input` is a CLOSED per-operation contract. Neither the preview nor the confirmation string is human consent: the host must enforce its own approval policy.',
};

// ---------------------------------------------------------------------------- main

function main() {
  if (!existsSync(REGISTRY)) { console.error(`mcp:project: registry not found at ${REGISTRY} — run \`npm run capabilities:build\` first.`); return 1; }
  let registry;
  try { registry = JSON.parse(readFileSync(REGISTRY, 'utf8')); }
  catch (err) { console.error(`mcp:project: registry is not valid JSON: ${err.message}`); return 1; }
  let overrides = [];
  if (existsSync(OVERRIDES_PATH)) {
    try { overrides = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')); }
    catch (err) { console.error(`mcp:project: MCP_TOOL_OVERRIDES.json is not valid JSON: ${err.message}`); return 1; }
    if (!Array.isArray(overrides)) { console.error('mcp:project: MCP_TOOL_OVERRIDES.json must be an array of { tool, field, newValue, reason }'); return 1; }
  }
  const data = project(registry, overrides);
  if (data.unresolved.length > 0) {
    console.error(`mcp:project: ${data.unresolved.length} unresolved record(s):`);
    for (const u of data.unresolved.slice(0, 10)) console.error(`  - ${u.why}`);
    return 1;
  }
  const md = render(data);
  if (CHECK) {
    const strip = (t) => t.replace(/^- projected at: .*$/m, '- projected at: -');
    if (!existsSync(OUT) || strip(readFileSync(OUT, 'utf8')) !== strip(md)) {
      console.error('mcp:project --check: FAIL — committed MCP_TOOL_MANIFEST.md differs from a fresh projection (stale or hand-edited) — re-run `npm run mcp:project`');
      return 1;
    }
    console.log(`mcp:project --check: OK (${data.tools.length} tools projected, core ${data.core.length}, catalog ${data.catalog.length}, ${data.applied.length} overrides)`);
    return 0;
  }
  writeFileSync(OUT, md);
  console.log(`mcp:project: wrote ${OUT} — ${data.tools.length} projected tools (core ${data.core.length}; catalog rows ${data.catalog.length}; ${data.curationExcluded.length} curation exclusions; ${data.applied.length} overrides applied)`);
  return 0;
}

if (IS_MAIN) process.exit(main());
export { project, render, toolNameFor, coreRule, boundsSentence, inputFields, outputSpec, TOOL_PREFIX };
