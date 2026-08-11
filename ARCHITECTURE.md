# ARCHITECTURE.md — node-kimai SDK

**SINGLE SOURCE OF TRUTH** — All stages (Types, Core, Resources, Tests, Docs, Review, Ship, Toolsmith) MUST read this file before working.

Generated: 2026-08-10

## 1. Library Overview

- **Package name:** `node-kimai`
- **Display name:** Kimai API Client SDK
- **API:** Kimai Pro API v1.1 (66 paths, 52 schemas, 13 resources)
- **Target Node:** >=20 (native fetch only)
- **Runtime deps:** Zero (native fetch)
- **Module format:** Dual ESM+CJS via tsup
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
  errors.ts                   # Typed error hierarchy
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
```

---

## 3. Naming Conventions

- **Types:** PascalCase interfaces, no `I` prefix (`Activity`, `Customer`, `TimesheetConfig`)
- **Resource clients:** PascalCase class names (`ActivityClient`, `CustomerClient`)
- **Files:** snake_case for types (`activity.ts`), PascalCase for clients (`ActivityClient.ts`)
- **Functions:** camelCase (`getAll`, `getById`, `createActivity`, `updateMeta`)
- **List params:** `{Resource}ListParams` (`ActivityListParams`, `TimesheetListParams`)
- **Form types:** `{Resource}CreateInput` / `{Resource}UpdateInput` (derived from EditForm schemas)

---

## 4. Public API Surface

```typescript
// Main export
import { ApiClient } from 'node-kimai';

const client = new ApiClient({ baseUrl: 'https://kimai.example.com', token: '...' });
const activities = await client.activities.getAll();

// Resource-specific imports
import { ActivityClient, TimesheetClient } from 'node-kimai/resources';

// Type imports
import type { Activity, Timesheet, User } from 'node-kimai/types';

// Error imports
import { ApiError, NotFoundError, RateLimitError } from 'node-kimai/errors';
```

### ApiClient Interface

```typescript
interface ApiClientOptions {
  baseUrl: string;
  token: string;
  transport?: HttpTransport;
  defaultPageSize?: number;
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

All errors expose:
- `status: number` — HTTP status code
- `message: string` — Human-readable error
- `data: unknown` — Raw error body from API
- `request: RequestInfo` — The failed request URL
- `code?: string` — API-specific error code (if present)

---

## 6. Pagination Strategy

### Paginated Endpoints (use `page` / `size` params)

- `GET /api/timesheets` — page (default: 1), size (default: 50, max: 500)
- `GET /api/invoices` — page (default: 1), size (default: 50)

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
  // Single fetch with optional params
  list(params?: ActivityListParams): Promise<Activity[]>;

  // Fetch ALL pages (only for paginated endpoints) or single fetch (non-paginated)
  getAll(params?: ActivityListParams): Promise<Activity[]>;

  // Async iterator over pages (only for paginated endpoints)
  listPages(params?: ActivityListParams): AsyncIterable<Activity[]>;
}
```

For non-paginated endpoints, `getAll()` = `list()` (single fetch). `listPages()` is not available.

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
  // Standard CRUD
  list(params?: TimesheetListParams): Promise<Timesheet[]>;
  getAll(params?: TimesheetListParams): Promise<Timesheet[]>;
  listPages(params?: TimesheetListParams): AsyncIterable<Timesheet[]>;
  getById(id: number): Promise<Timesheet>;
  create(input: TimesheetCreateInput): Promise<Timesheet>;
  update(id: number, input: TimesheetUpdateInput): Promise<Timesheet>;
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
  list(params?: InvoiceListParams): Promise<Invoice[]>;
  getAll(params?: InvoiceListParams): Promise<Invoice[]>;
  listPages(params?: InvoiceListParams): AsyncIterable<Invoice[]>;
  getById(id: number): Promise<Invoice>;
  updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice>;

  // NOTE: download() is NOT implemented in the SDK (binary response)
  // n8n handles this directly via its HTTP helpers
}
```

### 9.12 User Special Endpoints

```typescript
class UserClient {
  list(params?: UserListParams): Promise<User[]>;
  getAll(params?: UserListParams): Promise<User[]>;
  getById(id: number): Promise<User>;
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

- **tsup** with 4 entries matching `package.json` exports exactly:
  - `index` → `src/index.ts`
  - `resources/index` → `src/resources/index.ts`
  - `types/index` → `src/types/index.ts`
  - `errors` → `src/errors.ts`
- Dual ESM+CJS + dts + sourcemaps
- Target: node20

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
- **Ship:** `npm run build` succeeds, dist layout verified, exports resolve

---

## 13. MCP Consumer Contract

- Every read returns plain `T` or `T[]` — never `this`, never raw envelopes
- `getAll()` is the MCP-preferred all-in-one read method
- No runtime validation lib (zod stays consumer-side)
- Transport-injectable for n8n reuse without SDK modifications
- Error types are catchable and typed for structured error handling

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
