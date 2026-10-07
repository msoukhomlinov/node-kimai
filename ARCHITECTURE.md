# ARCHITECTURE.md — node-kimai SDK

**SINGLE SOURCE OF TRUTH** — All stages (Types, Core, Resources, Tests, Docs, Review, Ship, Toolsmith) MUST read this file before working.

Generated: 2026-08-10

## 1. Library Overview

- **Package name:** `node-kimai`
- **Display name:** Kimai API Client SDK
- **API:** Kimai Pro API v1.1 (66 paths, 52 schemas, 13 resources)
- **Target Node:** >=24 (native fetch only)
- **Runtime deps:** Zero (native fetch)
- **Module format:** Dual ESM+CJS via tsup — **ESM-first**: the ESM artifacts use the plain `.js` / `.d.ts` extensions and the CJS artifacts use `.cjs` / `.d.cts`
- **License:** MIT

### Design Goals

1. **MCP-first, n8n-compatible:** Plain `T` / `T[]` returns (no wrapper leaks). Transport-injectable for n8n reuse.
2. **Full spec coverage:** Every path, every resource, every endpoint.
3. **Zero runtime deps:** Native fetch only; no validation lib (zod stays consumer-side).
4. **Dual ESM+CJS:** Deep-import subpaths (`./resources`, `./types`, `./errors`).

---

## 2. Module Structure

```
src/
  index.ts                    # Public API barrel (ApiClient + all resource clients)
  client.ts                   # Base ApiClient class + transport abstraction
  errors.ts                   # Typed error hierarchy + the structured error contract (policy §8)
  guards.ts                   # isKimaiError + credential-shape checks (re-exported from the root)
  capabilities.ts             # GENERATED capability registry (zero imports; the ./capabilities subpath)
  operations/                 # Registry-validated invoke layer (the ./operations subpath)
    index.ts                  # re-exports invokeOperation / planInvoke / REFUSAL_CODES / ...
    invoke.ts                 # resolve → validate → govern → dispatch; the ONE write governor
  mcp/                        # Generated MCP tool catalog + dispatcher (the ./mcp subpath)
    index.ts                  # re-exports the catalog and dispatchOperation
    dispatch.ts               # effect-split dispatch (read | write | destructive) → invokeOperation
    catalog.generated.ts      # MACHINE-WRITTEN by scripts/build-tool-catalog.mjs; never hand-edit
  untrusted.ts                # untrusted-content marking helpers (the ./untrusted subpath)
  types/
    index.ts                  # Barrel export for all types
    common.ts                 # Shared types (ListParams, TimesheetListParams, etc.)
    activity.ts               # Activity, ActivityCollection, ActivityRate, etc.
    customer.ts               # Customer, CustomerCollection, CustomerRate, Comment, etc.
    project.ts                # Project, ProjectCollection, ProjectRate, etc.
    timesheet.ts              # Timesheet, TimesheetCollection, TimesheetConfig, etc.
    user.ts                   # User, UserCollection, UserEntity, etc.
    tag.ts                    # TagEntity
    team.ts                   # Team, TeamCollection, TeamMember, TeamMembership
    invoice.ts                # Invoice, InvoiceCollection, InvoiceMeta
    approval_bundle.ts        # Approval bundle types (inline response shapes)
    system.ts                 # Version, Plugin, PageAction
    export.ts                 # Export-related types
  resources/
    index.ts                  # Barrel export for all resource clients
    ActivityClient.ts
    CustomerClient.ts
    ProjectClient.ts
    TimesheetClient.ts
    UserClient.ts
    TagClient.ts
    TeamClient.ts
    InvoiceClient.ts
    ApprovalBundleClient.ts
    ConfigClient.ts
    SystemClient.ts
    ExportClient.ts
    ActionsClient.ts
test/
  __fixtures__/               # Mock API responses per resource (bare arrays, NOT {items:[...]})
  client.test.ts              # Base client, transport, error handling
  resources/
    activity.test.ts
    customer.test.ts
    project.test.ts
    timesheet.test.ts
    user.test.ts
    tag.test.ts
    team.test.ts
    invoice.test.ts
    approval_bundle.test.ts
    config.test.ts
    system.test.ts
    export.test.ts
    actions.test.ts
scripts/
  derive-plan.mjs             # derive capabilities.plan.json from api-docs.json + the source tree
  generate-capabilities.mjs   # render capabilities.json + src/capabilities.ts from the plan
  check-capabilities.mjs      # the capability gate (row coverage, staleness, --ship)
  check-negative-fixture.mjs  # proves the gate can fail (negative fixture)
  project-mcp-tools.mjs       # project the registry into MCP_TOOL_MANIFEST.md (npm run mcp:project)
  build-tool-catalog.mjs      # generate src/mcp/catalog.generated.ts + MCP_TOOL_CATALOG.json (catalog:check)
  check-mcp-surface.mjs       # guard the served MCP tool surface (mcp:check-surface)
  public-surface.mjs          # guard the published surface (exports x dist x runtime deps)
dist/                         # build output — one entry per package.json subpath
  index.{js,d.ts,cjs,d.cts}
  resources/index.{js,d.ts,cjs,d.cts}
  types/index.{js,d.ts,cjs,d.cts}
  errors.{js,d.ts,cjs,d.cts}
  capabilities.{js,d.ts,cjs,d.cts}
  operations/index.{js,d.ts,cjs,d.cts}
  mcp/index.{js,d.ts,cjs,d.cts}
  untrusted.{js,d.ts,cjs,d.cts}
MCP_TOOL_CATALOG.json         # generated MCP catalog (the ./mcp data on disk)
MCP_TOOL_MANIFEST.md          # projected tool manifest
MCP_TOOL_OVERRIDES.json       # hand-written catalog overrides (inputs to the generator)
```

---

## 3. Naming Conventions

- **Types:** PascalCase interfaces, no `I` prefix (`Activity`, `Customer`, `TimesheetConfig`)
- **Resource clients:** PascalCase class names (`ActivityClient`, `CustomerClient`)
- **Files:** snake_case for types (`activity.ts`), PascalCase for clients (`ActivityClient.ts`)
- **Functions:** camelCase (`listAll`, `get`, `list`, `listPages`, `create`, `updateMeta`)
- **List params:** `{Resource}ListParams` (`ActivityListParams`, `TimesheetListParams`)
- **Form types:** `{Resource}CreateInput` / `{Resource}UpdateInput` (derived from EditForm schemas)

---

## 4. Public API Surface

```typescript
// Main export
import { ApiClient } from 'node-kimai';

const client = new ApiClient({ baseUrl: 'https://kimai.example.com', token: '...' });
const activities = await client.activities.listAll();
for await (const activity of client.activities.list()) { /* one record at a time */ }

// Resource-specific imports
import { ActivityClient, TimesheetClient } from 'node-kimai/resources';

// Type imports
import type { Activity, Timesheet, User } from 'node-kimai/types';

// Error imports
import { ApiError, NotFoundError, RateLimitError } from 'node-kimai/errors';

// Capability registry (zero-import, static data — safe to read from any runtime)
import { CAPABILITY_GROUPS, CAPABILITIES, CAPABILITY_PLAN_HASHES } from 'node-kimai/capabilities';
import type { CapabilityRecord, CapabilityArgSchema } from 'node-kimai/capabilities';
```

The published subpaths are `.`, `./resources`, `./types`, `./errors`, `./capabilities`,
`./operations`, `./mcp`, `./untrusted` and `./package.json` — one per `tsup` entry.
`scripts/public-surface.mjs` proves the declared `exports` map and the built `dist/` tree agree,
and loads each subpath for both `import` and `require`.

### ApiClient Interface

```typescript
interface ApiClientOptions {
  baseUrl: string;
  token: string;
  transport?: HttpTransport;
}

class ApiClient {
  constructor(options: ApiClientOptions);

  // Resource clients (auto-wired)
  activities: ActivityClient;
  customers: CustomerClient;
  projects: ProjectClient;
  timesheets: TimesheetClient;
  users: UserClient;
  tags: TagClient;
  teams: TeamClient;
  invoices: InvoiceClient;
  approvalBundle: ApprovalBundleClient;
  config: ConfigClient;
  system: SystemClient;
  export: ExportClient;
  actions: ActionsClient;
}
```

---

## 5. Error Hierarchy

```
ApiError (base)
  ├── BadRequestError (400)
  ├── UnauthorizedError (401)
  ├── ForbiddenError (403)
  ├── NotFoundError (404)
  ├── UnprocessableEntityError (422)
  ├── RateLimitError (429)
  └── ServerError (5xx)
```

`KimaiConfigError` (local argument refusal, zero fetch) and `ResolutionError` (the bounded
`resolve` contract) join the hierarchy in Phase F — see §15.5.

All errors expose:
- `status: number` — HTTP status code
- `message: string` — Human-readable error
- `data: unknown` — Raw error body from API
- `request: RequestInfo` — The failed request URL
- `code?: string` — API-specific error code (if present)
- `category: ErrorCategory` — the closed structured-error vocabulary (Phase F, §15.5)
- plus `operation`, `httpStatus`, `retryable`, `vendorError`, `resourceIds`, `suggestedAction`,
  `correlationId` and `retryAfter` (all additive; Phase F)

---

## 6. Pagination Strategy

### Paginated Endpoints (use `page` / `size` params)

- `GET /api/timesheets` — page (default: 1), size (default: 100, max: 500)
- `GET /api/invoices` — page (default: 1), size (default: 100)

### Non-Paginated Endpoints (single fetch, NEVER send page params)

These endpoints return all results in one call. The client MUST NOT send `page`/`size` params:

- `GET /api/activities` — no page/size params
- `GET /api/customers` — no page/size params
- `GET /api/projects` — no page/size params
- `GET /api/users` — no page/size params
- `GET /api/teams` — no page/size params
- `GET /api/tags` — no page/size params
- `GET /api/plugins` — no page/size params
- `GET /api/timesheets/active` — no page/size params
- `GET /api/timesheets/recent` — no page/size params
- All rate endpoints (`GET /api/activities/{id}/rates`, etc.)
- All comment endpoints (`GET /api/customers/{id}/comments`, etc.)
- All approval-bundle endpoints
- All system/config endpoints

### Client Methods

For each resource client:

```typescript
class ActivityClient {
  // Stream every record: walks every page on a paginated resource, one batch otherwise
  list(params?: ActivitySearchParams): AsyncIterable<Activity>;

  // Collect the complete set (all pages concatenated)
  async listAll(params?: ActivitySearchParams): Promise<Activity[]>;
}

class TimesheetClient {
  list(params?: TimesheetListParams): AsyncIterable<Timesheet>;
  async listAll(params?: TimesheetListParams): Promise<Timesheet[]>;
  // Paginated resources only: stream whole pages
  listPages(params?: TimesheetListParams): AsyncIterable<Page<Timesheet>>;
}
```

`Page<T> = { items, page, size, hasMore }`, where `hasMore = items.length === size`: Kimai
returns a bare array with no totals, so a full page is the only continuation signal. `page` and
`size` must be positive integers or the client throws `KimaiConfigError` (never silently clamped;
`size` defaults to 100). On non-paginated endpoints `list()` yields the single batch, `listAll()`
returns it as an array, and `listPages()` is not available.

---

## 7. Transport Layer

### Injectable HTTP Transport

The SDK uses an injectable transport interface for n8n compatibility:

```typescript
interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

interface TransportRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | string[]>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'text';
}
```

### Default Transport (native fetch)

```typescript
class FetchTransport implements HttpTransport {
  constructor(baseUrl: string, token: string);
  request<T>(options: TransportRequest): Promise<T>;
}
```

### n8n Transport (for reuse)

n8n consumers inject their own transport wrapping `this.helpers.httpRequest`:

```typescript
class N8nTransport implements HttpTransport {
  constructor(private helpers: ILoadOptionsFunctions);
  request<T>(options: TransportRequest): Promise<T>;
}
```

---

### Secondary consumer: n8n — recorded deviation (`references/mcp-server-surface.md` §6)

`SCOPING.md` names an n8n community node as a secondary consumer, and the agent-execution-layer policy
is in scope for every variant. This SDK does **not** ship an n8n projection (manifest + curation + drift
check), and that is a deliberate, recorded skip rather than an omission:

- The n8n node is a **separate, pre-existing package** (`n8n-nodes-kimai-pro`, ~87 operations) that
  consumes this SDK **only through the injectable transport** above. It carries its own operation list and
  never reads `capabilities.json`, the registry, or any projected surface.
- A projection emitted here would therefore have **no reader**, and would become a second operation list
  to keep in sync — the exact drift the registry exists to prevent.
- The skill's trigger is the consumer **reading the registry**, not the word "n8n".

**If that changes** — the node starts deriving its operations from this package — the projection becomes
required: project it from the same registry and gate the drift (`n8n:project:check` in the node-autotask
lineage), never by hand-maintaining a list.

---

## 8. Response Envelope / Capability Table

**CRITICAL: This table is authoritative.** All implementation MUST derive response handling from it.

The Kimai API returns **bare arrays** for lists and **bare objects** for single items. There are NO wrapper envelopes like `{activities: [...]}`.

| Resource | singleKey | listKey | createType | paginated | supportsDelete |
|----------|-----------|---------|------------|-----------|----------------|
| activity | — | — | raw | false | true |
| customer | — | — | raw | false | true |
| project | — | — | raw | false | true |
| timesheet | — | — | raw | true (/timesheets only) | true |
| user | — | — | raw | false | false (no DELETE /users/{id}) |
| tag | — | — | raw | false | true |
| team | — | — | raw | false | true |
| invoice | — | — | n/a (read-only) | true | false (no DELETE /invoices/{id}) |
| activity_rate | — | — | raw | false | true |
| customer_rate | — | — | raw | false | true |
| project_rate | — | — | raw | false | true |
| customer_comment | — | — | raw | false | true |
| project_comment | — | — | raw | false | true |
| approval_bundle | — | — | void | false | false |
| config | — | — | n/a (read-only) | false | false |
| system (ping/version/plugins) | — | — | n/a (read-only) | false | false |
| export_template | — | — | n/a | false | true (DELETE /export/{id}) |
| actions | — | — | n/a (read-only) | false | false |

### Key Notes

- **NO envelopes:** All list endpoints return bare arrays `[...]`. All single-item endpoints return bare objects `{...}`.
- **createType = raw:** POST returns the created object directly (e.g., `ActivityEntity`), not wrapped.
- **createType = void:** POST returns non-standard response (approval-bundle returns URL string or status object).
- **createType = n/a:** Resource has no create endpoint (invoices are read-only via API, config/system are read-only).
- **User has no DELETE:** There is no `DELETE /api/users/{id}` endpoint.
- **Invoice has no DELETE:** There is no `DELETE /api/invoices/{id}` endpoint.
- **Timesheet pagination:** Only `GET /api/timesheets` is paginated. `GET /api/timesheets/active` and `GET /api/timesheets/recent` are NOT paginated.

---

## 9. Special Endpoints

### 9.1 Approval Bundle (non-CRUD workflow)

The approval-bundle resource is NOT a standard CRUD resource. It provides week-based approval operations:

```typescript
class ApprovalBundleClient {
  addToApprove(params: { user?: number; date: string }): Promise<string>;
  nextWeek(params: { user?: number }): Promise<ApprovalWeekStatus>;
  weekStatus(params: { user?: number; date: string }): Promise<ApprovalWeekStatus>;
  overtimeYear(params: { user?: number; date: string }): Promise<ApprovalOvertimeYear>;
  weeklyOvertime(params: { user?: number; date: string }): Promise<ApprovalWeeklyOvertime[]>;
}
```

- `addToApprove` returns a URL string (the URL of the submitted week).
- Other endpoints return inline objects (no named schema in spec — types derived from observed response shapes).
- All endpoints accept optional `user` query param (defaults to API key owner).

### 9.2 Rate Sub-Endpoints

Activities, customers, and projects each have rate sub-resources:

```typescript
// On ActivityClient
getRates(activityId: number): Promise<ActivityRate[]>;
createRate(activityId: number, input: ActivityRateForm): Promise<ActivityRate>;
deleteRate(activityId: number, rateId: number): Promise<void>;

// On CustomerClient
getRates(customerId: number): Promise<CustomerRate[]>;
createRate(customerId: number, input: CustomerRateForm): Promise<CustomerRate>;
deleteRate(customerId: number, rateId: number): Promise<void>;

// On ProjectClient
getRates(projectId: number): Promise<ProjectRate[]>;
createRate(projectId: number, input: ProjectRateForm): Promise<ProjectRate>;
deleteRate(projectId: number, rateId: number): Promise<void>;
```

### 9.3 Team Membership Endpoints

Two patterns for team membership:

**Pattern A: Add resource to a team** (POST /api/{resource}/{id}/team)
```typescript
// On ActivityClient
addToTeam(activityId: number, input: { teams?: number[] }): Promise<Team>;

// On CustomerClient
addToTeam(customerId: number, input: { teams?: number[] }): Promise<Team>;

// On ProjectClient
addToTeam(projectId: number, input: { teams?: number[] }): Promise<Team>;
```

**Pattern B: Manage team members/access** (on TeamClient)
```typescript
class TeamClient {
  // Members
  addMember(teamId: number, userId: number): Promise<Team>;
  removeMember(teamId: number, userId: number): Promise<Team>;

  // Resource access
  grantCustomerAccess(teamId: number, customerId: number): Promise<Team>;
  revokeCustomerAccess(teamId: number, customerId: number): Promise<Team>;
  grantProjectAccess(teamId: number, projectId: number): Promise<Team>;
  revokeProjectAccess(teamId: number, projectId: number): Promise<Team>;
  grantActivityAccess(teamId: number, activityId: number): Promise<Team>;
  revokeActivityAccess(teamId: number, activityId: number): Promise<Team>;
}
```

### 9.4 Meta Field Updates (PATCH /meta)

Activities, customers, projects, and timesheets support custom-field updates via a dedicated meta endpoint:

```typescript
// On ActivityClient
updateMeta(activityId: number, meta: Record<string, unknown>): Promise<Activity>;

// On CustomerClient
updateMeta(customerId: number, meta: Record<string, unknown>): Promise<Customer>;

// On ProjectClient
updateMeta(projectId: number, meta: Record<string, unknown>): Promise<Project>;

// On TimesheetClient
updateMeta(timesheetId: number, meta: Record<string, unknown>): Promise<Timesheet>;
```

Body is a plain object with field name → value pairs. No wrapper key.

### 9.5 Comment Endpoints

Customers and projects have comment sub-resources:

```typescript
// On CustomerClient
listComments(customerId: number): Promise<Comment[]>;
createComment(customerId: number, input: CommentForm): Promise<Comment>;
deleteComment(customerId: number, commentId: number): Promise<void>;
pinComment(customerId: number, commentId: number): Promise<Comment>;

// On ProjectClient
listComments(projectId: number): Promise<Comment[]>;
createComment(projectId: number, input: CommentForm): Promise<Comment>;
deleteComment(projectId: number, commentId: number): Promise<void>;
pinComment(projectId: number, commentId: number): Promise<Comment>;
```

### 9.6 Export Endpoint

```typescript
class ExportClient {
  deleteTemplate(templateId: number): Promise<void>;
}
```

Note: `GET /api/export` exists in the spec but returns binary/file. The SDK does NOT implement this endpoint — binary export is not suitable for SDK consumption. n8n can handle it directly via its HTTP request helpers.

### 9.7 System / Info Endpoints

```typescript
class SystemClient {
  ping(): Promise<boolean>;           // Returns [] → normalise to true
  getVersion(): Promise<Version>;
  getPlugins(): Promise<Plugin[]>;
}
```

### 9.8 Config Endpoints

```typescript
class ConfigClient {
  getTimesheetConfig(): Promise<TimesheetConfig>;
  getColors(): Promise<Record<string, string>>;
}
```

### 9.9 Actions Endpoints

Locale/view-specific UI actions for resources:

```typescript
class ActionsClient {
  getActions(resource: 'activity' | 'customer' | 'project' | 'timesheet',
             id: number, view: string, locale: string): Promise<PageAction[]>;
}
```

### 9.10 Timesheet Special Operations

```typescript
class TimesheetClient {
  // Standard CRUD + streaming lists
  list(params?: TimesheetListParams): AsyncIterable<Timesheet>;
  async listAll(params?: TimesheetListParams): Promise<Timesheet[]>;
  listPages(params?: TimesheetListParams): AsyncIterable<Page<Timesheet>>;
  async get(id: number): Promise<Timesheet>;
  create(input: TimesheetEditForm): Promise<Timesheet>;
  update(id: number, input: TimesheetEditForm): Promise<Timesheet>;
  delete(id: number): Promise<void>;

  // Special endpoints
  getActive(): Promise<Timesheet[]>;           // GET /timesheets/active
  getRecent(): Promise<Timesheet[]>;           // GET /timesheets/recent
  stop(id: number): Promise<Timesheet>;        // PATCH /timesheets/{id}/stop
  restart(id: number, input?: { begin?: string }): Promise<Timesheet>;
  duplicate(id: number): Promise<Timesheet>;   // PATCH /timesheets/{id}/duplicate
  toggleExport(id: number): Promise<Timesheet>;// PATCH /timesheets/{id}/export
  updateMeta(id: number, meta: Record<string, unknown>): Promise<Timesheet>;
}
```

### 9.11 Invoice Custom Fields

```typescript
class InvoiceClient {
  list(params?: InvoiceListParams): AsyncIterable<Invoice>;
  async listAll(params?: InvoiceListParams): Promise<Invoice[]>;
  listPages(params?: InvoiceListParams): AsyncIterable<Page<Invoice>>;
  async get(id: number): Promise<Invoice>;
  updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice>;
  download(id: number): Promise<ArrayBuffer>;
}
```

### 9.12 User Special Endpoints

```typescript
class UserClient {
  list(params?: UserListParams): AsyncIterable<User>;
  async listAll(params?: UserListParams): Promise<User[]>;
  async get(id: number): Promise<User>;
  getMe(): Promise<User>;                    // GET /users/me
  create(input: UserCreateInput): Promise<User>;
  update(id: number, input: UserUpdateInput): Promise<User>;
  updatePreferences(id: number, prefs: UserPreference[]): Promise<User>;
  deleteApiToken(tokenId: number): Promise<void>;
}
```

---

## 10. User-Filter Override

**CRITICAL RULE (from SCOPING.md):**

When operations offer filtering by user, if no user is specified the API defaults to the API key owner. The SDK MUST explicitly override this to return **all users** when no user filter is given.

### Implementation

For `GET /api/timesheets`, if the caller does NOT provide a `user` or `users[]` param, the SDK MUST pass `user=all` to fetch timesheets for all users (requires `view_other_timesheet` permission):

```typescript
class TimesheetClient {
  async list(params?: TimesheetListParams): Promise<Timesheet[]> {
    const query = { ...params };
    // Override: if no user filter given, fetch ALL users
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    return this.client.get<Timesheet[]>('/api/timesheets', { query });
  }
}
```

This applies to:
- `GET /api/timesheets` — primary user-filter override
- Approval-bundle endpoints with `user` param — do NOT override (they are user-specific queries)

---

## 11. Resource Grouping

The 13 resources are divided into 4 coherent groups for implementers:

### Group 1: Core Entities (CRUD resources)
- **Activity** — activities, rates, team assignment, meta
- **Customer** — customers, rates, comments, team assignment, meta
- **Project** — projects, rates, comments, team assignment, meta

These share patterns: rates, meta updates, team endpoints.

### Group 2: Time Tracking & Billing
- **Timesheet** — timesheets with special ops (stop, restart, duplicate, active, recent)
- **Invoice** — read-only invoices with custom-field updates and pagination

These are the primary business objects users interact with.

### Group 3: Administration
- **User** — users with me endpoint, preferences, API token management
- **Team** — teams with member/access management
- **Tag** — tags with find endpoint

These manage the system's organisational structure.

### Group 4: System & Special
- **ApprovalBundle** — week-based approval workflow (non-CRUD)
- **Config** — system configuration (timesheet config, colors)
- **System** — ping, version, plugins (health/info)
- **Export** — export template deletion
- **Actions** — UI action discovery

These handle system-level operations and special workflows.

---

## 12. Build & Test Strategy

### Build

- **tsup** with one entry per `package.json` subpath:
  - `index` → `src/index.ts`
  - `resources/index` → `src/resources/index.ts`
  - `types/index` → `src/types/index.ts`
  - `errors` → `src/errors.ts`
  - `capabilities` → `src/capabilities.ts` (zero-import generated registry)
  - `operations/index` → `src/operations/index.ts` (registry-validated invoke)
  - `mcp/index` → `src/mcp/index.ts` (generated catalog + dispatcher)
  - `untrusted` → `src/untrusted.ts` (untrusted-content marking)
- Dual ESM+CJS + dts + sourcemaps
- Target: node24
- Artifact layout is **ESM-first** (`outExtension`: esm → `.js`/`.d.ts`, cjs → `.cjs`/`.d.cts`),
  matching the node-hudu / node-autotask line. `package.json` sets `"type": "module"`, so the
  bare `.js` files are ESM; CJS consumers are routed to the explicit `.cjs` targets by the
  `exports` conditions.
- **Deliberate deviation from the line:** `tsconfig.json` keeps `module: ESNext` +
  `moduleResolution: bundler` and is NOT switched to `NodeNext`. This package is `tsup`-bundled
  from extensionless relative imports and has no per-file emit, so `NodeNext` would only demand
  `.js` specifiers in the source without changing the published surface.

### Type Checking

- Run `tsc --noEmit` after EVERY generation batch
- Build tsconfig includes only `src/` (rootDir: src)
- Separate `tsconfig.test.json` for test files

### Testing

- **vitest** with `@vitest/coverage-v8`
- Fixtures MUST match real spec shapes: bare arrays `[...]`, NOT `{items:[...]}`
- Non-paginated resources must NOT send page params in tests
- Coverage gate: 90% lines/statements, 80% functions
- eslint overrides for `test/**`: allow `no-explicit-any`, `no-unused-vars`

### Validation Gates

- **Architect:** ARCHITECTURE.md complete with capability table
- **Types:** `tsc --noEmit` passes, all types exported from barrel
- **Core:** Transport interface + ApiClient + error hierarchy working
- **Resources:** `tsc --noEmit` passes, all 66 paths covered
- **Tests:** All tests pass, coverage gate met
- **Docs:** README + docs/API.md complete
- **Review:** Cross-checked against spec and ARCHITECTURE.md
- **Capabilities:** `npm run capabilities:check` green (row coverage, mutation safety, staleness
  of the plan/source/test hashes, registry = re-render); `--ship` leaves no row planned
- **Surface:** `node scripts/public-surface.mjs` green (exports × dist × runtime dependency set)
- **Ship:** `npm run build` succeeds, `npm run verify` green, exports resolve

---

## 13. MCP Consumer Contract

- Every read returns plain `T` or `T[]` — never `this`, never raw envelopes
- `listAll()` is the MCP-preferred all-in-one read method; `list()` is the full stream
- No runtime validation lib (zod stays consumer-side)
- Transport-injectable for n8n reuse without SDK modifications
- Error types are catchable and typed for structured error handling
- The projected tool surface is the generated capability registry (`./capabilities`,
  `capabilities.json`): every tool is one registry record — `id`, `inputSchema`,
  `outputSchema`, `effect`, `flags`, `dryRun`, `pagination`, `retry`, `errors`. The
  rendered tool manifest (`MCP_TOOL_MANIFEST.md`) and the machine-readable catalog
  (`MCP_TOOL_CATALOG.json`, the `./mcp` subpath) are projections of that registry, not
  hand-written lists (see §15.6 and §16).

---

## 14. Endpoint Coverage Checklist

All 66 paths must be implemented:

- [x] `/api/activities` — GET, POST
- [x] `/api/activities/{id}` — GET, PATCH, DELETE
- [x] `/api/activities/{id}/meta` — PATCH
- [x] `/api/activities/{id}/rates` — GET, POST
- [x] `/api/activities/{id}/rates/{rateId}` — DELETE
- [x] `/api/activities/{id}/team` — POST
- [x] `/api/customers` — GET, POST
- [x] `/api/customers/{id}` — GET, PATCH, DELETE
- [x] `/api/customers/{id}/meta` — PATCH
- [x] `/api/customers/{id}/rates` — GET, POST
- [x] `/api/customers/{id}/rates/{rateId}` — DELETE
- [x] `/api/customers/{id}/comments` — GET, POST
- [x] `/api/customers/{id}/comments/{comment}` — DELETE
- [x] `/api/customers/{id}/comments/{comment}/pin` — PATCH
- [x] `/api/customers/{id}/team` — POST
- [x] `/api/projects` — GET, POST
- [x] `/api/projects/{id}` — GET, PATCH, DELETE
- [x] `/api/projects/{id}/meta` — PATCH
- [x] `/api/projects/{id}/rates` — GET, POST
- [x] `/api/projects/{id}/rates/{rateId}` — DELETE
- [x] `/api/projects/{id}/comments` — GET, POST
- [x] `/api/projects/{id}/comments/{comment}` — DELETE
- [x] `/api/projects/{id}/comments/{comment}/pin` — PATCH
- [x] `/api/projects/{id}/team` — POST
- [x] `/api/timesheets` — GET, POST
- [x] `/api/timesheets/{id}` — GET, PATCH, DELETE
- [x] `/api/timesheets/{id}/meta` — PATCH
- [x] `/api/timesheets/{id}/stop` — PATCH
- [x] `/api/timesheets/{id}/restart` — PATCH
- [x] `/api/timesheets/{id}/duplicate` — PATCH
- [x] `/api/timesheets/{id}/export` — PATCH
- [x] `/api/timesheets/active` — GET
- [x] `/api/timesheets/recent` — GET
- [x] `/api/users` — GET, POST
- [x] `/api/users/{id}` — GET, PATCH
- [x] `/api/users/{id}/preferences` — PATCH
- [x] `/api/users/me` — GET
- [x] `/api/users/api-token/{id}` — DELETE
- [x] `/api/tags` — GET, POST
- [x] `/api/tags/{id}` — DELETE
- [x] `/api/tags/find` — GET
- [x] `/api/teams` — GET, POST
- [x] `/api/teams/{id}` — GET, PATCH, DELETE
- [x] `/api/teams/{id}/members/{userId}` — POST, DELETE
- [x] `/api/teams/{id}/customers/{customerId}` — POST, DELETE
- [x] `/api/teams/{id}/projects/{projectId}` — POST, DELETE
- [x] `/api/teams/{id}/activities/{activityId}` — POST, DELETE
- [x] `/api/invoices` — GET
- [x] `/api/invoices/{id}` — GET
- [x] `/api/invoices/{id}/custom-fields` — PATCH
- [x] `/api/invoices/{id}/download` — GET (NOT implemented — binary)
- [x] `/api/approval-bundle/add_to_approve` — POST
- [x] `/api/approval-bundle/next-week` — GET
- [x] `/api/approval-bundle/overtime_year` — GET
- [x] `/api/approval-bundle/weekly_overtime` — GET
- [x] `/api/approval-bundle/week-status` — GET
- [x] `/api/config/timesheet` — GET
- [x] `/api/config/colors` — GET
- [x] `/api/ping` — GET
- [x] `/api/version` — GET
- [x] `/api/plugins` — GET
- [x] `/api/export/{id}` — DELETE
- [x] `/api/actions/activity/{id}/{view}/{locale}` — GET
- [x] `/api/actions/customer/{id}/{view}/{locale}` — GET
- [x] `/api/actions/project/{id}/{view}/{locale}` — GET
- [x] `/api/actions/timesheet/{id}/{view}/{locale}` — GET

Total: 66 paths, with 1 binary endpoint (`/api/invoices/{id}/download`) excluded from SDK implementation.

---

## 15. Agent Execution Layer (Phase F — shipped)

The layer that makes this SDK directly drivable by an LLM agent. It is **additive**: every
pre-existing primitive, type and error class keeps working unchanged, and the whole layer is
described by the machine-readable capability registry (policy §5–§9).
`capabilities.json` is the running inventory: **13 groups, 108 rows — 90 primitives + 18 helpers**;
every row is `status: "tested"`.

### 15.1 Two layers, one surface

- **Primitives** — one method per endpoint (the endpoint surface generated from `api-docs.json`);
  full typed records in, full typed records out. Unchanged by Phase F.
- **Helpers** — agent-facing methods co-located on the same client, on top of the primitives:
  resolve a record from a human identifier, scan a filtered page, fetch a workflow context
  in one call. A helper never adds a new endpoint — it composes primitives.

Both layers take/return plain data, so a tool wrapper can project either without knowing about
this SDK (see §13).

### 15.2 Helper floor per resource

The plan fixes `helperCap: 4` per named resource; the shipped floor is:

| Resource | Helpers |
| --- | --- |
| `timesheets` | `resolve`, `search`, `getContext` |
| `customers` | `resolve`, `search`, `getContext` |
| `projects` | `resolve`, `search`, `getContext` |
| `activities` | `resolve`, `search` |
| `invoices` | `resolve`, `search` |
| `tags` | `resolve`, `search` |
| `users` | `resolve`, `search` |
| `teams` | `resolve` |

`getContext` exists only for the three workflow resources (timesheets, customers, projects).
`teams` carries `resolve` only — team records are not name-searchable. The remaining five
resources (`approvalBundle`, `config`, `system`, `export`, `actions`) are primitives-only
(non-CRUD or single-endpoint surfaces); the plan records that decision per row.

### 15.3 Resolution and scan caps

- `resolve(identifier)` accepts `{ id }`, `{ name }`, a bare numeric id or an exact name.
- Resolution basis (registry `resolution.basis`, plan `helperBasis`):
  `server-filter` (one server-side filtered page — most resources), `client-scan`
  (`tags.resolve`, `users.resolve` — a composite fetch + in-memory exact match),
  `workflow` (`getContext`).
- **Cap: one page of at most 500 records** (`RESOLVE_SCAN_PAGE_SIZE = 500`;
  registry `resolution: { maxScanRecords: 500, maxScanPages: 1 }`). A bounded scan never
  runs unbounded.
- **Outcomes are explicit — a `null` is never a silent truncation**:
  - one exact match → the record;
  - a complete page with no exact match → `null`;
  - several exact matches → `ResolutionError.ambiguous` (`RESOLUTION_AMBIGUOUS`), candidate ids
    on `resourceIds`;
  - a *full* page with no exact match → `ResolutionError.truncated` (`RESOLUTION_TRUNCATED`) —
    the scan stopped at its cap before the data ran out;
  - an id miss keeps throwing `NotFoundError` (unchanged).
- `search(params, { limit })`: default **25**, hard maximum **100**
  (`DEFAULT_HELPER_LIMIT` / `MAX_HELPER_LIMIT`). A `limit` outside 1…100 throws
  `KimaiConfigError` — it is never silently clamped.
- **Compact by default.** Each helper returns its compact summary shape (e.g. `TimesheetSummary`);
  `{ expand: true }` returns the full record; `{ resolutionDetails: true }` returns the
  `Resolution<T>` wrapper (`value`, `scanned`, `scanTruncated`, `candidates`). The registry's
  `outputSchema.drops` names honestly which fields the compact shape drops.

### 15.4 Mutation classification and dry-run

- **Every mutation accepts `{ dryRun: true }`** and returns a `DryRunResult<T>` with
  `simulated: true`, `target`, `request`, `checks`, `impact` and `warnings`. The dry-run path
  issues **zero wire calls** — it validates the arguments and echoes what it would send; the
  warnings say that referenced resources are unverified and the impact is best-effort.
- **Classification** lives on each registry record: `effect: read | write | destructive`
  (53 / 38 / 17 rows) and `flags: sensitive | idempotent | requiresApproval`
  (15 / 23 / 21 rows). A caller can therefore gate on data instead of prose.
- `retry.retryableStatuses` states which statuses are safe to re-issue; the transport itself
  **retries nothing**.

### 15.5 Structured error contract (policy §8)

`ApiError` carries the closed `ErrorCategory` vocabulary (`auth`, `not_found`, `validation`,
`conflict`, `rate_limit`, `server`, `network`, `timeout`, `resolution`, `policy`) plus
`operation`, `httpStatus`, `retryable`, `vendorError`, `resourceIds`, `suggestedAction`,
`correlationId` and `retryAfter`. The legacy `status`/`data`/`request`/`code` fields are
untouched.

- `correlationId` — one `crypto.randomUUID()` per request, minted in `FetchTransport`.
- `retryAfter` — `parseRetryAfter()` reads the RFC 9110 `Retry-After` header (delta-seconds or
  HTTP-date) and surfaces it on a 429.
- Derived defaults: `categoryForStatus()`, `retryableForStatus()`, `defaultCodeForStatus()`,
  `suggestedActionForStatus()`; `createApiError()` assembles the whole contract.
- `KimaiConfigError` (`CONFIG_ERROR`) — a caller-supplied argument the SDK refuses **locally**,
  before any wire activity (zero fetch); `category: "validation"`, non-retryable.
- `ResolutionError` — the two closed resolution codes above; non-retryable, because retrying the
  identical identifier reproduces the same resolution cost.

### 15.6 Capability plan, registry, emitted artifacts and gates

| Artifact | Produced by | Content |
| --- | --- | --- |
| `capabilities.plan.json` | `scripts/derive-plan.mjs` (from `api-docs.json` + the source tree) | 108 operation rows; per resource `helperCap`, `compact`, `workflowResource`. Derivable columns are regenerated; judgement columns are preserved verbatim |
| `capabilities.json` | `scripts/generate-capabilities.mjs` | the registry: 13 groups, `planHash` + `builtAt` per group, one record per built row |
| `src/capabilities.ts` | `scripts/generate-capabilities.mjs` | the same records as a **zero-import** TS module behind `./capabilities`; exports `CAPABILITY_GROUPS`, `CAPABILITIES`, `CAPABILITY_PLAN_HASHES` |
| `MCP_TOOL_MANIFEST.md` | `scripts/project-mcp-tools.mjs` (`npm run mcp:project`) | the tool surface, projected from `capabilities.json` (never hand-written); `mcp:project:check` fails on drift |
| `MCP_TOOL_CATALOG.json` | `scripts/build-tool-catalog.mjs` (`catalog:build`) | the machine-readable MCP catalog — CORE profile, META specs, descriptions, closed input contracts, one row per operation; `catalog:check` fails on a stale copy |
| `src/mcp/catalog.generated.ts` | `scripts/build-tool-catalog.mjs` (`catalog:build`) | the same catalog as a compiled module behind `./mcp`; MACHINE-WRITTEN, never hand-edit |

Gates (`npm run verify` runs the first two):

- `capabilities:check` — row coverage (registry ⇄ plan), mutation safety, judgement/metadata
  columns, declared test rows, **staleness** (plan hash, source/test file hashes, and the
  registry module equalling a fresh re-render — a hand edit fails), scoped by `--group`.
- `capabilities:check:fixture` — the negative fixture, proving the gate can actually fail.
- `capabilities:check --ship` — the ship gate: no row left `planned`/`implemented`.

### 15.7 Published-surface guard

`scripts/public-surface.mjs` verifies the **published** surface against the built tree, deriving
the expected subpath set from this `package.json` + `tsup.config.ts` (never hardcoded):

1. the `exports` keys and the `tsup` entry points describe the same surface (no missing/extra subpath);
2. every declared condition target (`import`/`require` × `types`/`default`) is a file the build emitted;
3. each deep subpath (`.`, `./resources`, `./types`, `./errors`, `./capabilities`) **loads** —
   `require()` of the CJS target and dynamic `import()` of the ESM target;
4. the runtime dependency set is empty (native `fetch` only): no `dependencies`, and no
   non-builtin bare specifier in `dist/`.

Exit 0 when the surface is intact; exit 1 with a failure list otherwise (`--json` for a report).

---

## 16. MCP Server-Support Surface

This section covers the modules a **server author** consumes to stand up an MCP server on this
SDK. It does not re-describe the agent execution layer (§15); it describes how the layer is
served to a host and how a host consumes it.

### 16.1 The three data artifacts

All three are projections of one source — the generated capability registry (§15.6) — so a host
cannot silently diverge from the SDK's own governance:

| Artifact | Subpath / file | Consumer |
| --- | --- | --- |
| Tool manifest (human-readable) | `MCP_TOOL_MANIFEST.md` | a maintainer reading the served surface |
| Tool catalog (machine-readable) | `MCP_TOOL_CATALOG.json` + the `./mcp` subpath | a server host building `tools/list` and dispatch |
| Capability registry | `capabilities.json` + `./capabilities` subpath | anything that needs the raw per-operation record |

### 16.2 `node-kimai/mcp` — the generated catalog and dispatcher

`./mcp` exports the compiled catalog (`CATALOG`, `CATALOG_PLAN_HASH`, `CORE_RULE`,
`CORE_TOOLS`, `DEFAULT_CATALOG_LIMIT`, `DISPATCH_OPERATIONS`, `EXPOSED`, `INPUT_CONTRACTS`,
`MAX_CATALOG_LIMIT`, `META_TOOLS`, `REFUSALS`, `TOOL_DESCRIPTIONS`, `catalogPage`,
`catalogRow`, `describeOperation`, `inputFields`, `nearestKeys`, `requireCatalogRow`) and the
dispatcher:

```typescript
dispatchOperation(
  client: ApiClient,
  effect: 'read' | 'write' | 'destructive',
  operation: string,
  input?: Record<string, unknown>,
  options?: InvokeOptions,
): Promise<unknown>
```

The dispatcher adds only an **exact effect boundary**: it refuses an effect outside the three, and
an operation whose registry effect differs from the dispatcher (including dispatcher records),
with a typed `CONFIG_ERROR` and zero wire activity. Everything else — unknown key, unreachable
operation, invalid input, dry-run and confirmation governance — is delegated to
`invokeOperation` (`./operations`). Validation and governance live in exactly ONE place; a second
implementation here would be a second chance to be wrong.

### 16.3 How a server consumes the surface

1. **`tools/list`** — project `CORE_TOOLS` plus `CATALOG` rows into MCP tool specs; each spec's
   input schema is `INPUT_CONTRACTS[operation]`, and the description is `TOOL_DESCRIPTIONS`.
2. **`tools/call`** — resolve the requested operation key through `getCapability(op)`
   (`./capabilities`) for its `effect`, then call
   `dispatchOperation(client, effect, operation, input, options)`. Pass `options.dryRun === false`
   only for a live write; destructive and approval-gated operations also need
   `options.confirm === operation`.
3. **Refusals** — catch `KimaiConfigError` and surface `err.code` (`REFUSAL_CODES`:
   `UNKNOWN_OPERATION`, `UNREACHABLE_OPERATION`, `CONFIG_ERROR`, `DISPATCHER_EFFECT`) rather than
   parsing prose. Streaming operations are refused before any wire call, with the bounded
   alternative (`listAll` / `search`) named.
4. **Untrusted content** — wrap vendor- or user-sourced text with `./untrusted`
   (`wrapUntrusted`, `markUntrusted`, `deepMarkUntrusted`, `stripUntrustedDeep`) at the boundary
   before it reaches a prompt.

### 16.4 The `./untrusted` helpers

- `wrapUntrusted(value)` — wrap a string in the `<untrusted_content>` fence (neutralising any
  embedded fence).
- `markUntrusted(record, fields)` / `deepMarkUntrusted(value, fields)` — mark named fields of an
  object (or a whole tree).
- `stripUntrustedWrapper(value)` / `stripUntrustedDeep(value)` — remove the marking again.

### 16.5 Server-support gates

`scripts/check-mcp-surface.mjs` (`mcp:check-surface`) verifies the served surface, and
`scripts/build-tool-catalog.mjs --check` (`catalog:check`) fails on a stale catalog. Both run in
`npm run verify` alongside `mcp:project:check`.
