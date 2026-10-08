#!/usr/bin/env node
/**
 * scripts/derive-plan.mjs — derive capabilities.plan.json from api-docs.json
 * + the source tree (Kimai Pro API v1.1).
 *
 * DERIVABLE COLUMNS ONLY. Judgement columns (helper, helperBasis,
 * helperRationale, flags, metadata, compact, resolution, staleCheck,
 * redaction, errors, tests) are owned by the Architect/coordinator and are
 * PRESERVED verbatim on every re-run. Ported from the node-hudu line
 * (scripts/derive-plan.mjs), adapted to the Kimai spec (OpenAPI 3.0, /api/*
 * paths) and the PascalCase client files.
 *
 * Idempotent: re-running with unchanged inputs produces byte-identical output
 * (generatedAt only advances when the derived content actually changes) and
 * never wipes a judgement column.
 *
 * Usage:
 *   node scripts/derive-plan.mjs                     # all known resources
 *   node scripts/derive-plan.mjs --resource timesheets
 *                                                     # rewrite only that
 *                                                     # resource's rows; all
 *                                                     # other rows copied
 *                                                     # through verbatim
 *   node scripts/derive-plan.mjs --out <path>        # write to <path>
 *                                                     # (the committed plan
 *                                                     # still supplies the
 *                                                     # preserved judgement
 *                                                     # columns)
 *
 * Policy: ~/.prime/agent/skills/api-node-squad/references/agent-execution-layer.md
 * §4 / §4.2 (plan shape is normative there).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_PATH = join(ROOT, 'api-docs.json');
const PLAN_PATH = join(ROOT, 'capabilities.plan.json'); // read base: prior state / judgement columns
const RES_DIR = join(ROOT, 'src', 'resources');

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));

/* ------------------------------------------------------------------ *
 * 1. Endpoint -> owning SDK resource + primitive + specialOp.
 *    The generic rule covers uniform CRUD shapes; the table below lists
 *    every endpoint whose SDK method name is NOT uniform (Kimai clients).
 * ------------------------------------------------------------------ */
const OVERRIDES = {
  // --- timesheets (pilot) ---
  'GET /api/timesheets':                  [['timesheets', 'list', null]],
  'POST /api/timesheets':                 [['timesheets', 'create', null]],
  'GET /api/timesheets/active':           [['timesheets', 'getActive', 'active']],
  'GET /api/timesheets/recent':           [['timesheets', 'getRecent', 'recent']],
  'GET /api/timesheets/{id}':             [['timesheets', 'get', null]],
  'DELETE /api/timesheets/{id}':          [['timesheets', 'delete', null]],
  'PATCH /api/timesheets/{id}':           [['timesheets', 'update', null]],
  'PATCH /api/timesheets/{id}/duplicate': [['timesheets', 'duplicate', 'duplicate']],
  'PATCH /api/timesheets/{id}/export':    [['timesheets', 'toggleExport', 'toggle-export']],
  'PATCH /api/timesheets/{id}/meta':      [['timesheets', 'updateMeta', 'meta']],
  'PATCH /api/timesheets/{id}/restart':   [['timesheets', 'restart', 'restart']],
  'PATCH /api/timesheets/{id}/stop':      [['timesheets', 'stop', 'stop']],

  // --- activities ---
  'GET /api/activities':                    [['activities', 'list', null]],
  'GET /api/activities/{id}':               [['activities', 'get', null]],
  'POST /api/activities':                   [['activities', 'create', null]],
  'PATCH /api/activities/{id}':             [['activities', 'update', null]],
  'DELETE /api/activities/{id}':            [['activities', 'delete', null]],
  'PATCH /api/activities/{id}/meta':        [['activities', 'updateMeta', 'meta']],
  'GET /api/activities/{id}/rates':         [['activities', 'getRates', 'rates']],
  'POST /api/activities/{id}/rates':        [['activities', 'createRate', 'create-rate']],
  'DELETE /api/activities/{id}/rates/{rateId}': [['activities', 'deleteRate', 'delete-rate']],
  'POST /api/activities/{id}/team':         [['activities', 'addToTeam', 'add-to-team']],

  // --- customers ---
  'GET /api/customers':                     [['customers', 'list', null]],
  'GET /api/customers/{id}':                [['customers', 'get', null]],
  'POST /api/customers':                    [['customers', 'create', null]],
  'PATCH /api/customers/{id}':              [['customers', 'update', null]],
  'DELETE /api/customers/{id}':             [['customers', 'delete', null]],
  'PATCH /api/customers/{id}/meta':         [['customers', 'updateMeta', 'meta']],
  'GET /api/customers/{id}/rates':          [['customers', 'getRates', 'rates']],
  'POST /api/customers/{id}/rates':         [['customers', 'createRate', 'create-rate']],
  'DELETE /api/customers/{id}/rates/{rateId}': [['customers', 'deleteRate', 'delete-rate']],
  'GET /api/customers/{id}/comments':       [['customers', 'listComments', 'comments']],
  'POST /api/customers/{id}/comments':      [['customers', 'createComment', 'create-comment']],
  'DELETE /api/customers/{id}/comments/{comment}': [['customers', 'deleteComment', 'delete-comment']],
  'PATCH /api/customers/{id}/comments/{comment}/pin': [['customers', 'pinComment', 'pin-comment']],
  'POST /api/customers/{id}/team':          [['customers', 'addToTeam', 'add-to-team']],

  // --- projects ---
  'GET /api/projects':                      [['projects', 'list', null]],
  'GET /api/projects/{id}':                 [['projects', 'get', null]],
  'POST /api/projects':                     [['projects', 'create', null]],
  'PATCH /api/projects/{id}':               [['projects', 'update', null]],
  'DELETE /api/projects/{id}':              [['projects', 'delete', null]],
  'PATCH /api/projects/{id}/meta':          [['projects', 'updateMeta', 'meta']],
  'GET /api/projects/{id}/rates':           [['projects', 'getRates', 'rates']],
  'POST /api/projects/{id}/rates':          [['projects', 'createRate', 'create-rate']],
  'DELETE /api/projects/{id}/rates/{rateId}': [['projects', 'deleteRate', 'delete-rate']],
  'GET /api/projects/{id}/comments':        [['projects', 'listComments', 'comments']],
  'POST /api/projects/{id}/comments':       [['projects', 'createComment', 'create-comment']],
  'DELETE /api/projects/{id}/comments/{comment}': [['projects', 'deleteComment', 'delete-comment']],
  'PATCH /api/projects/{id}/comments/{comment}/pin': [['projects', 'pinComment', 'pin-comment']],
  'POST /api/projects/{id}/team':           [['projects', 'addToTeam', 'add-to-team']],

  // --- users ---
  'GET /api/users':                         [['users', 'list', null]],
  'GET /api/users/{id}':                    [['users', 'get', null]],
  'GET /api/users/me':                      [['users', 'getMe', 'me']],
  'POST /api/users':                        [['users', 'create', null]],
  'PATCH /api/users/{id}':                  [['users', 'update', null]],
  'PATCH /api/users/{id}/preferences':      [['users', 'updatePreferences', 'preferences']],
  'DELETE /api/users/api-token/{id}':       [['users', 'deleteApiToken', 'delete-api-token']],

  // --- tags: the SDK routes both list() and find() through /api/tags/find;
  //     GET /api/tags is the vendor-equivalent collection and is unserved.
  'GET /api/tags':                          [],
  'GET /api/tags/find':                     [['tags', 'list', null], ['tags', 'find', 'find-by-name']],
  'POST /api/tags':                         [['tags', 'create', null]],
  'DELETE /api/tags/{id}':                  [['tags', 'delete', null]],

  // --- teams ---
  'GET /api/teams':                         [['teams', 'list', null]],
  'GET /api/teams/{id}':                    [['teams', 'get', null]],
  'POST /api/teams':                        [['teams', 'create', null]],
  'PATCH /api/teams/{id}':                  [['teams', 'update', null]],
  'DELETE /api/teams/{id}':                 [['teams', 'delete', null]],
  'POST /api/teams/{id}/members/{userId}':      [['teams', 'addMember', 'add-member']],
  'DELETE /api/teams/{id}/members/{userId}':    [['teams', 'removeMember', 'remove-member']],
  'POST /api/teams/{id}/customers/{customerId}':   [['teams', 'grantCustomerAccess', 'grant-customer']],
  'DELETE /api/teams/{id}/customers/{customerId}': [['teams', 'revokeCustomerAccess', 'revoke-customer']],
  'POST /api/teams/{id}/projects/{projectId}':     [['teams', 'grantProjectAccess', 'grant-project']],
  'DELETE /api/teams/{id}/projects/{projectId}':   [['teams', 'revokeProjectAccess', 'revoke-project']],
  'POST /api/teams/{id}/activities/{activityId}':  [['teams', 'grantActivityAccess', 'grant-activity']],
  'DELETE /api/teams/{id}/activities/{activityId}': [['teams', 'revokeActivityAccess', 'revoke-activity']],

  // --- invoices ---
  'GET /api/invoices':                      [['invoices', 'list', null]],
  'GET /api/invoices/{id}':                 [['invoices', 'get', null]],
  'GET /api/invoices/{id}/download':        [['invoices', 'download', 'download']],
  'PATCH /api/invoices/{id}/custom-fields': [['invoices', 'updateCustomFields', 'custom-fields']],

  // --- approval-bundle ---
  'POST /api/approval-bundle/add_to_approve': [['approvalBundle', 'addToApprove', 'add-to-approve']],
  'GET /api/approval-bundle/next-week':       [['approvalBundle', 'nextWeek', 'next-week']],
  'GET /api/approval-bundle/week-status':     [['approvalBundle', 'weekStatus', 'week-status']],
  'GET /api/approval-bundle/overtime_year':   [['approvalBundle', 'overtimeYear', 'overtime-year']],
  'GET /api/approval-bundle/weekly_overtime': [['approvalBundle', 'weeklyOvertime', 'weekly-overtime']],

  // --- config / system / export / actions ---
  'GET /api/config/colors':                 [['config', 'getColors', 'colors']],
  'GET /api/config/timesheet':              [['config', 'getTimesheetConfig', 'timesheet-config']],
  'GET /api/ping':                          [['system', 'ping', 'ping']],
  'GET /api/version':                       [['system', 'getVersion', 'version']],
  'GET /api/plugins':                       [['system', 'getPlugins', 'plugins']],
  'DELETE /api/export/{id}':                [['export', 'deleteTemplate', 'delete-template']],
  'GET /api/actions/activity/{id}/{view}/{locale}':  [['actions', 'getActions', 'activity']],
  'GET /api/actions/customer/{id}/{view}/{locale}':  [['actions', 'getActions', 'customer']],
  'GET /api/actions/project/{id}/{view}/{locale}':   [['actions', 'getActions', 'project']],
  'GET /api/actions/timesheet/{id}/{view}/{locale}': [['actions', 'getActions', 'timesheet']],
};

/** SDK resource key -> client class file (the Kimai line uses PascalCase files). */
const SOURCE_FILES = {
  timesheets: 'TimesheetClient',
  activities: 'ActivityClient',
  customers: 'CustomerClient',
  projects: 'ProjectClient',
  users: 'UserClient',
  tags: 'TagClient',
  teams: 'TeamClient',
  invoices: 'InvoiceClient',
  approvalBundle: 'ApprovalBundleClient',
  config: 'ConfigClient',
  system: 'SystemClient',
  export: 'ExportClient',
  actions: 'ActionsClient',
};

/** SDK resource key -> test file base name (test/resources/<name>.test.ts). */
const TEST_FILES = {
  timesheets: 'timesheet',
  activities: 'activity',
  customers: 'customer',
  projects: 'project',
  users: 'user',
  tags: 'tag',
  teams: 'team',
  invoices: 'invoice',
  approvalBundle: 'approval_bundle',
  config: 'config',
  system: 'system',
  export: 'export',
  actions: 'actions',
};

/** The group a resource belongs to: in the Kimai pilot each resource is its own group. */
const GROUP_OF = {};
const RES_ORDER = Object.keys(SOURCE_FILES);
for (const r of RES_ORDER) GROUP_OF[r] = r;

/* ------------------------------------------------------------------ *
 * 2. Errors: the SCREAMING_SNAKE codes the SDK throws for a documented
 *    status. Mirrors src/errors.ts (createApiError / defaultCodeForStatus).
 *    The Kimai spec documents only success responses, so the failure set
 *    is the SDK's status mapping, not a spec enumeration.
 * ------------------------------------------------------------------ */
function errorsFor(method, path) {
  const out = new Set(['CONFIG_ERROR']); // universal: every op validates its inputs before the wire
  const hasId = path.includes('{');
  if (method === 'GET') {
    if (hasId) out.add('NOT_FOUND');
    out.add('RATE_LIMITED');
    out.add('SERVER_ERROR');
  } else {
    out.add('BAD_REQUEST');
    out.add('NOT_FOUND');
    out.add('RATE_LIMITED');
    out.add('SERVER_ERROR');
    out.add('VALIDATION_FAILED');
  }
  return [...out].sort();
}

/* ------------------------------------------------------------------ *
 * 3. Tests skeleton — the normative rows of agent-execution-layer.md §11,
 *    expressed as {id, file, title}. Preserved verbatim once non-empty.
 * ------------------------------------------------------------------ */
function testsSkeleton(resource, primitive, shape, file, paginated = false) {
  const t = (c, title) => ({ id: `${primitive}.${c}`, file, title });
  const out = [];
  if (shape === 'list') {
    // D2 (node-hudu convergence): `list` is an AsyncIterable STREAM, `listAll`
    // collects every page, and `listPages` (paginated resources only) exposes Page<T>.
    out.push(t('success', `streams the unwrapped ${resource} records`));
    out.push(paginated
      ? t('listAll', 'listAll collects every page')
      : t('listAll', 'listAll collects the single non-paginated batch'));
    if (paginated) out.push(t('listPages', 'listPages yields pages with hasMore from a full page'));
    // A paginated endpoint walks pages; a non-paginated one must NOT be sent page/size.
    if (!paginated) out.push(t('non-paginated', 'does not send page/size params for this non-paginated endpoint'));
  } else if (shape === 'get') {
    out.push(t('success', `returns the unwrapped ${resource} record`));
    out.push(t('not-found', 'normalises a 404 into NOT_FOUND'));
  } else if (shape === 'create') {
    out.push(t('success', `returns the created ${resource} record`));
    out.push(t('dry-run', 'dry-run issues no mutating request and returns simulated: true'));
  } else if (shape === 'update') {
    out.push(t('success', `returns the updated ${resource} record`));
    out.push(t('dry-run', 'dry-run issues no PATCH request and returns simulated: true'));
  } else if (shape === 'delete') {
    out.push(t('success', 'resolves void after a successful delete'));
    out.push(t('dry-run', 'dry-run issues no DELETE request and returns simulated: true'));
  } else if (shape === 'write-special') {
    out.push(t('success', `calls the ${primitive} endpoint and normalises the result`));
    out.push(t('dry-run', 'dry-run issues no mutating request and returns simulated: true'));
  } else {
    out.push(t('success', `calls the ${primitive} endpoint and returns the documented shape`));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 4. Existing primitives in the source tree -> status "implemented".
 * ------------------------------------------------------------------ */
function sourceMethods(resource) {
  const cls = SOURCE_FILES[resource];
  if (!cls) return new Set();
  const p = join(RES_DIR, `${cls}.ts`);
  if (!existsSync(p)) return new Set();
  const src = readFileSync(p, 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/^\s{2}(?:(?:public|protected|private|override|static|async)\s+)*([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\(/gm)) out.add(m[1]);
  return out;
}
const METHODS = {};
for (const r of RES_ORDER) METHODS[r] = sourceMethods(r);

/* ------------------------------------------------------------------ *
 * 5. Derive rows.
 * ------------------------------------------------------------------ */
const SPEC_VERSION = (spec.info?.version ?? 'unknown').toString();
const derived = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [rawMethod, op] of Object.entries(item)) {
    const method = rawMethod.toUpperCase();
    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) continue;
    const key = `${method} ${path}`;
    const overrides = OVERRIDES[key];
    if (!overrides || overrides.length === 0) continue; // not part of the known SDK surface
    for (const [resource, primitive, specialOp] of overrides) {
    const params = (op.parameters || []).filter((p) => p.in === 'query');
    const names = params.map((p) => p.name);
    const vendorFilters = names.filter((n) => !['page', 'size'].includes(n)).sort();
    const search = names.includes('term') ? 'term' : names.includes('name') ? 'name' : null;
      const effect = method === 'GET' ? 'read' : method === 'DELETE' ? 'destructive' : 'write';
      const shape = specialOp !== null
        ? (method === 'GET' ? 'read-special' : 'write-special')
        : (primitive === 'list' ? 'list' : primitive === 'get' ? 'get' : primitive);
      const file = `test/resources/${TEST_FILES[resource] ?? resource}.test.ts`;
      const purpose = (op.summary || op.description || `${method} ${path}`).split('\n')[0].trim().replace(/\.$/, '') + '.';
      derived.push({
        endpoint: key,
        primitive: `${resource}.${primitive}`,
        specialOp,
        vendorFilters,
        search,
        helper: null,
        helperBasis: null,
        helperRationale: null,
        effect,
        flags: [],
        dryRun: effect !== 'read',
        metadata: {
          purpose,
          usage: method === 'GET'
            ? `Read path for ${resource}. Primitives return the full typed record.`
            : `Mutating path for ${resource}; supports { dryRun: true }, which validates without issuing the write.`,
          preferredWhen: null,
          related: [],
        },
        compact: null,
        resolution: null,
        staleCheck: null,
        redaction: null,
        errors: errorsFor(method, path),
        tests: testsSkeleton(resource, `${resource}.${primitive}`, shape, file, names.includes('page') || names.includes('size')),
        group: GROUP_OF[resource] ?? null,
        status: METHODS[resource].has(primitive) ? 'implemented' : 'planned',
        _resource: resource,
      });
    }
  }
}

/* Fold rows that share a primitive id (one SDK method serving several vendor
 * endpoints, e.g. actions.getActions over the four /api/actions paths): keep
 * the first row and record the sibling endpoints it also serves. */
const byPrimitive = new Map();
for (const row of derived) {
  const existing = byPrimitive.get(row.primitive);
  if (!existing) { byPrimitive.set(row.primitive, row); continue; }
  (existing._alsoServes ??= []).push(row.endpoint);
}

const folded = [...byPrimitive.values()];
folded.sort((a, b) => String(a.endpoint).localeCompare(String(b.endpoint)));
derived.length = 0;
derived.push(...folded);

/* ------------------------------------------------------------------ *
 * 6. Preserve: never wipe a judgement column, never downgrade a status,
 *    never regenerate test rows the Tests stage has refined.
 * ------------------------------------------------------------------ */
const STATUS_RANK = { planned: 0, implemented: 1, tested: 2 };
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const JUDGEMENT = ['helper', 'helperBasis', 'helperRationale', 'flags', 'compact', 'resolution', 'staleCheck', 'redaction', 'errors', 'tests'];

function preserve(row) {
  const before = row._before;
  delete row._before;
  delete row._resource;
  if (!before) return row;
  for (const k of JUDGEMENT) {
    if (isEmpty(before[k])) continue;
    if (k === 'flags' && !Array.isArray(before[k])) continue; // a malformed prior flags is re-derived
    row[k] = before[k];
  }
  if (before.metadata && typeof before.metadata === 'object') {
    const m = before.metadata;
    row.metadata = {
      purpose: typeof m.purpose === 'string' && m.purpose.trim() !== '' ? m.purpose : row.metadata.purpose,
      usage: typeof m.usage === 'string' && m.usage.trim() !== '' ? m.usage : row.metadata.usage,
      preferredWhen: m.preferredWhen ?? null,
      related: Array.isArray(m.related) ? m.related : [],
    };
  }
  if ((STATUS_RANK[before.status] ?? 0) > (STATUS_RANK[row.status] ?? 0)) row.status = before.status;
  return row;
}

/* ------------------------------------------------------------------ *
 * 7. Main
 * ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const only = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--resource') only.push(args[++i]);
const OUT_I = args.indexOf('--out');
const PLAN_OUT = OUT_I === -1 ? PLAN_PATH : resolve(ROOT, args[OUT_I + 1]);

let prior = null;
if (existsSync(PLAN_PATH)) prior = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
/** Stable row identity: the primitive/helper id (one endpoint may serve several primitives). */
const rowId = (r) => r.primitive ?? r.helper ?? `endpoint:${r.endpoint}`;
const priorById = new Map((prior?.operations ?? []).map((r) => [rowId(r), r]));

const selected = derived.filter((r) => only.length === 0 || only.includes(r._resource));
for (const r of selected) r._before = priorById.get(rowId(r));
const preservedCount = selected.filter((r) => r._before).length;
const rows = selected.map(preserve);

/** Helper rows (endpoint: null) are AUTHORED by the coordinator, never derived: keep them. */
const priorHelpers = (prior?.operations ?? []).filter((r) => r.endpoint === null || r.endpoint === undefined);
const sortRows = (list) => list.sort((a, b) => {
  const g = String(a.group).localeCompare(String(b.group));
  if (g !== 0) return g;
  const ra = RES_ORDER.indexOf(((a.primitive ?? a.helper) ?? '').split('.')[0]);
  const rb = RES_ORDER.indexOf(((b.primitive ?? b.helper) ?? '').split('.')[0]);
  if (ra !== rb) return ra - rb;
  const ha = a.helper ? 1 : 0, hb = b.helper ? 1 : 0;
  if (ha !== hb) return ha - hb;
  return String(a.endpoint ?? '').localeCompare(String(b.endpoint ?? ''));
});

let operations;
if (only.length === 0 && !prior) operations = [...rows, ...priorHelpers];
else {
  const rewritten = new Map(rows.map((r) => [rowId(r), r]));
  operations = (prior?.operations ?? []).map((r) => rewritten.get(rowId(r)) ?? r);
  for (const r of rows) if (!operations.some((o) => rowId(o) === rowId(r))) operations.push(r);
}
operations = sortRows(operations);

/* Per-resource pagination — a derivable spec fact (not a judgement column):
 * a `list` endpoint paginates in vendor page mode (default 50, max 500) only
 * when the spec declares `page`/`size` query params; every other list endpoint
 * returns a single non-paginated batch. Consumed by generate-capabilities.mjs. */
const listPaginationFor = (r) => {
  const row = derived.find((row) => row.primitive === `${r}.list`);
  if (!row) return { mode: 'none' };
  const [method, path] = row.endpoint.split(' ');
  const names = ((spec.paths[path]?.[method.toLowerCase()]?.parameters) ?? [])
    .filter((p) => p.in === 'query')
    .map((p) => p.name);
  const paginated = names.includes('page') || names.includes('size');
  return paginated
    ? { mode: 'page', vendorDefaultPageSize: 50, vendorMaxPageSize: 500 }
    : { mode: 'none' };
};

const resources = {};
for (const r of only.length > 0 ? only : RES_ORDER) {
  if (!SOURCE_FILES[r]) continue;
  const prev = prior?.resources?.[r];
  resources[r] = {
    helperCap: prev?.helperCap ?? 4,
    compact: prev?.compact ?? null,
    workflowResource: prev?.workflowResource ?? false,
    pagination: listPaginationFor(r),
  };
}

const head = { spec: { source: 'api-docs.json', version: SPEC_VERSION }, generatedAt: null, resources, operations };
/** Hash the content with generatedAt neutralised on BOTH sides, so a re-run is a no-op in git. */
const strip = (o) => JSON.stringify({ ...o, generatedAt: null });
const contentHash = createHash('sha256').update(strip(head)).digest('hex');
const priorHash = prior ? createHash('sha256').update(strip(prior)).digest('hex') : null;
// Keep generatedAt stable when nothing else changed: a re-run must be a no-op in git.
head.generatedAt = contentHash === priorHash && prior?.generatedAt ? prior.generatedAt : new Date().toISOString();
const out = `${JSON.stringify(head, null, 2)}\n`;
writeFileSync(PLAN_OUT, out);

/* ------------------------------------------------------------------ *
 * 8. Report
 * ------------------------------------------------------------------ */
const byStatus = { planned: 0, implemented: 0, tested: 0 };
for (const r of operations) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
const notFound = operations.filter((r) => r.status === 'planned');
console.log(`plan:derive -> ${PLAN_OUT === PLAN_PATH ? 'capabilities.plan.json' : PLAN_OUT}`);
console.log(`  spec                 : ${SPEC_PATH} (openapi ${spec.openapi}, ${Object.keys(spec.paths).length} paths)`);
console.log(`  operations           : ${operations.length} rows (${derived.length} derivable, ${operations.filter((r) => r.helper && !r.primitive).length} authored helper rows preserved)`);
console.log(`  status tested        : ${byStatus.tested}`);
console.log(`  status implemented   : ${byStatus.implemented}`);
console.log(`  status planned       : ${byStatus.planned}${notFound.length ? ' -> ' + notFound.slice(0, 8).map((r) => r.primitive ?? r.helper).join(', ') : ''}`);
console.log(`  rows re-derived      : ${selected.length} (judgement columns preserved on ${preservedCount})`);
console.log(`  plan bytes           : ${Buffer.byteLength(out)}  sha256 ${createHash('sha256').update(out).digest('hex').slice(0, 16)}`);
