# API Reference

Complete typed method signatures for every client in the node-kimai SDK (v2.0.0).

Every list method is an `AsyncIterable` unless it returns a `Promise`. All errors are instances
of `ApiError` or its subclasses.

---

## ApiClient

The main entry point. Creates a configured client with all resource clients auto-wired.

### Constructor

```typescript
new ApiClient(options: ApiClientOptions)
```

#### ApiClientOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `baseUrl` | `string` | Yes | Kimai instance URL (e.g., `https://kimai.example.com`) |
| `token` | `string` | Yes | API token for authentication |
| `transport` | `HttpTransport` | No | Custom HTTP transport (defaults to `FetchTransport`) |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `activities` | `ActivityClient` | Activity resource operations |
| `customers` | `CustomerClient` | Customer resource operations |
| `projects` | `ProjectClient` | Project resource operations |
| `timesheets` | `TimesheetClient` | Timesheet resource operations |
| `users` | `UserClient` | User resource operations |
| `tags` | `TagClient` | Tag resource operations |
| `teams` | `TeamClient` | Team resource operations |
| `invoices` | `InvoiceClient` | Invoice resource operations |
| `approvalBundle` | `ApprovalBundleClient` | Approval workflow operations |
| `config` | `ConfigClient` | Configuration endpoints |
| `system` | `SystemClient` | System/info endpoints |
| `export` | `ExportClient` | Export operations |
| `actions` | `ActionsClient` | UI action discovery |

#### Internal Methods

```typescript
async get<T>(path: string, options?: { query?: Record<string, string | number | boolean | string[] | number[] | undefined> }): Promise<T>
async post<T>(path: string, options?: { query?: Record<string, ...>; body?: unknown }): Promise<T>
async patch<T>(path: string, options?: { query?: Record<string, ...>; body?: unknown }): Promise<T>
async delete(path: string, options?: { query?: Record<string, ...>; body?: unknown }): Promise<void>
```

---

## Common Patterns

### List methods

Every resource exposes up to three list methods:

| Method | Returns | Behaviour |
|--------|---------|-----------|
| `list(params?)` | `AsyncIterable<T>` | Streams every record. On a paginated resource it walks every page; on a non-paginated resource it yields the single batch. |
| `listAll(params?)` | `Promise<T[]>` | Collects the complete set (all pages concatenated). |
| `listPages(params?)` | `AsyncIterable<Page<T>>` | Paginated resources only (timesheets, invoices). Yields whole pages. |

```typescript
interface Page<T> {
  items: T[];
  page: number;    // 1-based
  size: number;    // requested page size
  hasMore: boolean; // items.length === size (Kimai returns no totals)
}
```

### Dry-run on every mutation

Every mutation accepts an optional final `opts` argument. With `{ dryRun: true }` it issues **no
wire call** and returns a `DryRunResult<T>` instead of the normal result:

```typescript
interface DryRunResult<T> {
  operation: string;
  wouldApply: boolean;
  target: { resource: string; ids: number[] };
  request: { method: string; path: string };
  diff?: FieldDiff[];
  checks: Array<{ name: string; ok: boolean }>;
  impact: { affected: number; scope: string; reversible: boolean };
  simulated: true;
  warnings: string[];
  data?: T;
}
```

```typescript
async create(input: X, opts?: MutationOptions): Promise<Y | DryRunResult<X>>
async create(input: X, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<X>>
```

### Helpers

The 8 name-addressable resources carry agent-facing helpers on the same client:

```typescript
resolve(identifier: XIdentifier): Promise<XSummary | null>
resolve(identifier: XIdentifier, opts: HelperOptions & { expand: true }): Promise<X | null>
resolve(identifier: XIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<XSummary>>
search(params?: XSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<XSummary[] | X[]>
getContext(id: number, opts?: { expand?: boolean }): Promise<XContext | XContextExpanded>   // workflow resources only
```

```typescript
interface Resolution<T> {
  value: T | null;
  resolutionCost: 'direct' | 'server-filter' | 'client-scan';
  scanned: number;
  scanTruncated: boolean;
  candidates?: ResolutionCandidate[];
}

interface HelperOptions {
  expand?: boolean;             // full record instead of the compact summary
  resolutionDetails?: boolean;  // the Resolution<T> wrapper
}

interface MutationOptions {
  dryRun?: boolean;
}
```

Helper `limit` defaults to **25** and is capped at **100** — an out-of-range value throws
`KimaiConfigError`. A bounded resolution scan is one page of at most 500 records; several exact
matches throw `ResolutionError` (`RESOLUTION_AMBIGUOUS`), and a full page with no exact match
throws `RESOLUTION_TRUNCATED` — never a silent `null`.

---

## ActivityClient

Operations for the `/api/activities` resource. Non-paginated.

### Methods

```typescript
list(params?: ActivitySearchParams): AsyncIterable<Activity>
```
Stream every activity (one batch).

```typescript
async listAll(params?: ActivitySearchParams): Promise<Activity[]>
```
Collect all activities. Optional filters: `name`, `visible`, `customer`.

```typescript
async get(id: number): Promise<Activity>
```
Get a single activity by ID. Throws `NotFoundError` if not found.

```typescript
async create(input: ActivityEditForm, opts?: MutationOptions): Promise<ActivityEntity>
```
Create a new activity. Returns the created entity with ID.

```typescript
async update(id: number, input: ActivityEditForm, opts?: MutationOptions): Promise<Activity>
```
Update an existing activity.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete an activity. Throws `NotFoundError` if not found.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Activity>
```
Update custom fields (meta) for an activity.

```typescript
async getRates(id: number): Promise<ActivityRate[]>
```
List rates for an activity.

```typescript
async createRate(id: number, input: ActivityRateForm, opts?: MutationOptions): Promise<ActivityRate>
```
Create a rate for an activity.

```typescript
async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void>
```
Delete a rate for an activity.

```typescript
async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team>
```
Assign an activity to one or more teams.

### Helpers

```typescript
async resolve(identifier: ActivityIdentifier, opts?: HelperOptions): Promise<ActivitySummary | Activity | null>
async search(params?: ActivitySearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ActivitySummary[] | Activity[]>
```

---

## CustomerClient

Operations for the `/api/customers` resource. Non-paginated.

### Methods

```typescript
list(params?: CustomerSearchParams): AsyncIterable<Customer>
```
Stream every customer (one batch).

```typescript
async listAll(params?: CustomerSearchParams): Promise<Customer[]>
```
Collect all customers. Optional filters: `name`, `visible`.

```typescript
async get(id: number): Promise<Customer>
```
Get a single customer by ID.

```typescript
async create(input: CustomerEditForm, opts?: MutationOptions): Promise<CustomerEntity>
```
Create a new customer.

```typescript
async update(id: number, input: CustomerEditForm, opts?: MutationOptions): Promise<Customer>
```
Update an existing customer.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete a customer.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Customer>
```
Update custom fields for a customer.

```typescript
async getRates(id: number): Promise<CustomerRate[]>
```
List rates for a customer.

```typescript
async createRate(id: number, input: CustomerRateForm, opts?: MutationOptions): Promise<CustomerRate>
```
Create a rate for a customer.

```typescript
async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void>
```
Delete a rate for a customer.

```typescript
async listComments(id: number): Promise<Comment[]>
```
List comments for a customer.

```typescript
async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment>
```
Create a comment on a customer.

```typescript
async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void>
```
Delete a comment from a customer.

```typescript
async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment>
```
Pin a comment on a customer.

```typescript
async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team>
```
Assign a customer to one or more teams.

### Helpers

```typescript
async resolve(identifier: CustomerIdentifier, opts?: HelperOptions): Promise<CustomerSummary | Customer | null>
async search(params?: CustomerSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<CustomerSummary[] | Customer[]>
async getContext(id: number, opts?: { expand?: boolean }): Promise<CustomerContext | CustomerContextExpanded>
```

---

## ProjectClient

Operations for the `/api/projects` resource. Non-paginated.

### Methods

```typescript
list(params?: ProjectSearchParams): AsyncIterable<Project>
```
Stream every project (one batch).

```typescript
async listAll(params?: ProjectSearchParams): Promise<Project[]>
```
Collect all projects. Optional filters: `name`, `visible`, `customer`, `activity`.

```typescript
async get(id: number): Promise<Project>
```
Get a single project by ID.

```typescript
async create(input: ProjectEditForm, opts?: MutationOptions): Promise<ProjectEntity>
```
Create a new project.

```typescript
async update(id: number, input: ProjectEditForm, opts?: MutationOptions): Promise<Project>
```
Update an existing project.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete a project.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Project>
```
Update custom fields for a project.

```typescript
async getRates(id: number): Promise<ProjectRate[]>
```
List rates for a project.

```typescript
async createRate(id: number, input: ProjectRateForm, opts?: MutationOptions): Promise<ProjectRate>
```
Create a rate for a project.

```typescript
async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void>
```
Delete a rate for a project.

```typescript
async listComments(id: number): Promise<Comment[]>
```
List comments for a project.

```typescript
async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment>
```
Create a comment on a project.

```typescript
async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void>
```
Delete a comment from a project.

```typescript
async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment>
```
Pin a comment on a project.

```typescript
async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team>
```
Assign a project to one or more teams.

### Helpers

```typescript
async resolve(identifier: ProjectIdentifier, opts?: HelperOptions): Promise<ProjectSummary | Project | null>
async search(params?: ProjectSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ProjectSummary[] | Project[]>
async getContext(id: number, opts?: { expand?: boolean }): Promise<ProjectContext | ProjectContextExpanded>
```

---

## TimesheetClient

Operations for the `/api/timesheets` resource. **Paginated.**

**Note:** `list`, `listAll`, and `listPages` automatically set `user=all` when no user filter is provided, to fetch timesheets across all users.

### Methods

```typescript
list(params?: TimesheetListParams): AsyncIterable<Timesheet>
```
Stream every timesheet across every page.

```typescript
async listAll(params?: TimesheetListParams): Promise<Timesheet[]>
```
Collect all timesheets across all pages. Optional filters: `user`, `users`, `begin`, `end`, `activity`, `project`, `customer`, `tag`, `exported`, `page`, `size`.

```typescript
listPages(params?: TimesheetListParams): AsyncIterable<Page<Timesheet>>
```
Stream whole pages; each `Page<Timesheet>` is `{ items, page, size, hasMore }`.

```typescript
async get(id: number): Promise<Timesheet>
```
Get a single timesheet by ID.

```typescript
async create(input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet>
```
Create (start) a new timesheet entry.

```typescript
async update(id: number, input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet>
```
Update an existing timesheet.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete a timesheet.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Timesheet>
```
Update custom fields for a timesheet.

```typescript
async getActive(): Promise<Timesheet[]>
```
Get currently active (running) timesheets. Non-paginated.

```typescript
async getRecent(params?: { begin?: string; size?: number }): Promise<Timesheet[]>
```
Get recently modified timesheets. Non-paginated.

```typescript
async stop(id: number, opts?: MutationOptions): Promise<Timesheet>
```
Stop a running timesheet.

```typescript
async restart(id: number, input?: { copy?: string; begin?: string }, opts?: MutationOptions): Promise<Timesheet>
```
Restart a stopped timesheet. Optionally specify a new `begin` time or a `copy` source.

```typescript
async duplicate(id: number, opts?: MutationOptions): Promise<Timesheet>
```
Duplicate a timesheet entry.

```typescript
async toggleExport(id: number, opts?: MutationOptions): Promise<Timesheet>
```
Toggle the export flag on a timesheet.

### Helpers

```typescript
async resolve(identifier: TimesheetIdentifier, opts?: HelperOptions): Promise<TimesheetSummary | Timesheet | null>
async search(params?: TimesheetSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TimesheetSummary[] | Timesheet[]>
async getContext(id: number, opts?: { expand?: boolean }): Promise<TimesheetContext | TimesheetContextExpanded>
```

---

## UserClient

Operations for the `/api/users` resource. Non-paginated.

**Note:** Users cannot be deleted via API (no `DELETE /users/{id}` endpoint).

### Methods

```typescript
list(params?: UserListParams): AsyncIterable<User>
```
Stream every user (one batch).

```typescript
async listAll(params?: UserListParams): Promise<User[]>
```
Collect all users. Optional filters: `role`, `team`.

```typescript
async get(id: number): Promise<User>
```
Get a single user by ID.

```typescript
async getMe(): Promise<UserEntity>
```
Get the current API key owner.

```typescript
async create(input: UserCreateForm, opts?: MutationOptions): Promise<UserEntity>
```
Create a new user. Requires `username` and `email`.

```typescript
async update(id: number, input: UserEditForm, opts?: MutationOptions): Promise<User>
```
Update an existing user.

```typescript
async updatePreferences(id: number, prefs: UserPreference[], opts?: MutationOptions): Promise<User>
```
Update user preferences (key-value pairs).

```typescript
async deleteApiToken(tokenId: number, opts?: MutationOptions): Promise<void>
```
Delete an API token.

### Helpers

```typescript
async resolve(identifier: UserIdentifier, opts?: HelperOptions): Promise<UserSummary | User | null>
async search(params?: UserSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<UserSummary[] | User[]>
```

---

## TagClient

Operations for the `/api/tags` resource. Non-paginated.

### Methods

```typescript
list(): AsyncIterable<Tag>
```
Stream every tag (one batch).

```typescript
async listAll(): Promise<Tag[]>
```
Collect all tags.

```typescript
async create(input: TagEditForm, opts?: MutationOptions): Promise<Tag>
```
Create a new tag.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete a tag.

```typescript
async find(name: string): Promise<Tag[]>
```
Find tags by name (partial match).

### Helpers

```typescript
async resolve(identifier: TagIdentifier, opts?: HelperOptions): Promise<TagSummary | Tag | null>
async search(params?: TagSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TagSummary[] | Tag[]>
```

---

## TeamClient

Operations for the `/api/teams` resource. Non-paginated.

### Methods

```typescript
list(params?: TeamListParams): AsyncIterable<Team>
```
Stream every team (one batch).

```typescript
async listAll(params?: TeamListParams): Promise<Team[]>
```
Collect all teams. Optional filter: `name`.

```typescript
async get(id: number): Promise<Team>
```
Get a single team by ID.

```typescript
async create(input: TeamEditForm, opts?: MutationOptions): Promise<Team>
```
Create a new team.

```typescript
async update(id: number, input: TeamEditForm, opts?: MutationOptions): Promise<Team>
```
Update an existing team.

```typescript
async delete(id: number, opts?: MutationOptions): Promise<void>
```
Delete a team.

```typescript
async addMember(teamId: number, userId: number, opts?: MutationOptions): Promise<Team>
```
Add a user as a member of a team.

```typescript
async removeMember(teamId: number, userId: number, opts?: MutationOptions): Promise<void>
```
Remove a user from a team.

```typescript
async grantCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<Team>
```
Grant a team access to a customer.

```typescript
async revokeCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<void>
```
Revoke a team's access to a customer.

```typescript
async grantProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<Team>
```
Grant a team access to a project.

```typescript
async revokeProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<void>
```
Revoke a team's access to a project.

```typescript
async grantActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<Team>
```
Grant a team access to an activity.

```typescript
async revokeActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<void>
```
Revoke a team's access to an activity.

### Helpers

```typescript
async resolve(identifier: TeamIdentifier, opts?: HelperOptions): Promise<TeamSummary | Team | null>
```

---

## InvoiceClient

Operations for the `/api/invoices` resource. **Paginated.** Read-only via API (no create/update/delete).

**Note:** Invoice download returns an `ArrayBuffer` and needs a binary-capable transport.

### Methods

```typescript
list(params?: InvoiceListParams): AsyncIterable<Invoice>
```
Stream every invoice across every page.

```typescript
async listAll(params?: InvoiceListParams): Promise<Invoice[]>
```
Collect all invoices across all pages. Optional filters: `customer`, `customers`, `status`, `begin`, `end`, `page`, `size`.

```typescript
listPages(params?: InvoiceListParams): AsyncIterable<Page<Invoice>>
```
Stream whole pages; each `Page<Invoice>` is `{ items, page, size, hasMore }`.

```typescript
async get(id: number): Promise<Invoice>
```
Get a single invoice by ID.

```typescript
async updateCustomFields(id: number, fields: InvoiceMeta[], opts?: MutationOptions): Promise<Invoice>
```
Update custom fields on an invoice.

```typescript
async download(id: number): Promise<ArrayBuffer>
```
Download the invoice PDF as an `ArrayBuffer`.

### Helpers

```typescript
async resolve(identifier: InvoiceIdentifier, opts?: HelperOptions): Promise<InvoiceSummary | Invoice | null>
async search(params?: InvoiceSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<InvoiceSummary[] | Invoice[]>
```

---

## ApprovalBundleClient

Operations for the `/api/approval-bundle` resource (week-based approval workflow). Non-CRUD.

### Methods

```typescript
async addToApprove(params: { user?: number; date: string }, opts?: MutationOptions): Promise<string>
```
Submit a week for approval. Returns the URL of the submitted week.
- `date`: ISO date string (e.g., `2026-08-10`)
- `user`: Optional user ID (defaults to API key owner)

```typescript
async nextWeek(params?: { user?: number }): Promise<ApprovalWeekStatus>
```
Get the status of the next approvable week.

```typescript
async weekStatus(params: { user?: number; date: string }): Promise<ApprovalWeekStatus>
```
Get the approval status of a specific week.

```typescript
async overtimeYear(params: { user?: number; date: string }): Promise<ApprovalOvertimeYear>
```
Get yearly overtime data for a user.

```typescript
async weeklyOvertime(params: { user?: number; date: string }): Promise<ApprovalWeeklyOvertime[]>
```
Get weekly overtime data for a user.

---

## ConfigClient

Operations for the `/api/config` resource (read-only).

### Methods

```typescript
async getTimesheetConfig(): Promise<TimesheetConfig>
```
Get timesheet configuration settings.

```typescript
async getColors(): Promise<Record<string, string>>
```
Get color configuration.

---

## SystemClient

Operations for system/info endpoints (read-only).

### Methods

```typescript
async ping(): Promise<boolean>
```
Health check. Returns `true` if Kimai is reachable.

```typescript
async pingRaw(): Promise<unknown[]>
```
The raw ping payload.

```typescript
async getVersion(): Promise<Version>
```
Get Kimai version information.

```typescript
async getPlugins(): Promise<Plugin[]>
```
Get list of installed plugins.

---

## ExportClient

Operations for the `/api/export` resource.

**Note:** `GET /api/export` (binary file download) is NOT implemented.

### Methods

```typescript
async deleteTemplate(templateId: number, opts?: MutationOptions): Promise<void>
```
Delete an export template.

---

## ActionsClient

Operations for UI action discovery.

### Methods

```typescript
async getActions(resource: ActionResource, id: number, view: string, locale: string): Promise<PageAction[]>
```
Get locale/view-specific UI actions for a resource.

- `resource`: One of `'activity' | 'customer' | 'project' | 'timesheet'`
- `id`: Resource ID
- `view`: View name (e.g., `'show'`, `'edit'`)
- `locale`: Locale code (e.g., `'en'`, `'de'`)

---

## Error Types

All errors extend `ApiError` and are thrown for non-2xx responses.

### ApiError (base)

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Error class name |
| `message` | `string` | Human-readable error message |
| `status` | `number` | HTTP status code |
| `data` | `unknown` | Raw error body from API |
| `request` | `string` | Failed request URL |
| `code` | `string` \| `undefined` | API-specific error code |
| `category` | `ErrorCategory` | Closed structured category (see below) |
| `retryable` | `boolean` | Whether re-issuing is safe |
| `operation` | `string` \| `undefined` | Registry operation key, when known |
| `httpStatus` | `number` \| `undefined` | The HTTP status, when known |
| `vendorError` | `unknown` | The vendor error body, when known |
| `resourceIds` | `number[]` \| `undefined` | Related ids (resolution candidates) |
| `suggestedAction` | `string` \| `undefined` | Suggested next step |
| `correlationId` | `string` \| `undefined` | One id per request |
| `retryAfter` | `number` \| `undefined` | Seconds, parsed from `Retry-After` on a 429 |

`ErrorCategory` is the closed vocabulary: `auth`, `not_found`, `validation`, `conflict`,
`rate_limit`, `server`, `network`, `timeout`, `resolution`, `policy`.

### Subclasses

| Class | Status | When thrown |
|-------|--------|-------------|
| `BadRequestError` | 400 | Invalid request (bad params, malformed body) |
| `UnauthorizedError` | 401 | Missing or invalid authentication token |
| `ForbiddenError` | 403 | Valid token but insufficient permissions |
| `NotFoundError` | 404 | Requested resource does not exist |
| `UnprocessableEntityError` | 422 | Validation errors (e.g., required fields missing) |
| `RateLimitError` | 429 | Too many requests |
| `ServerError` | 500–599 | Server-side error |
| `KimaiConfigError` | — | A caller argument the SDK refused locally, before any wire call |
| `ResolutionError` | — | The bounded `resolve` contract (`RESOLUTION_AMBIGUOUS` / `RESOLUTION_TRUNCATED`) |

### Usage

```typescript
import { ApiError, NotFoundError } from 'node-kimai';

try {
  await client.activities.get(999);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Not found');
  } else if (err instanceof ApiError) {
    console.error(err.status, err.category, err.message, err.data);
    if (err.category === 'rate_limit') console.warn('retry in', err.retryAfter, 's');
  }
}
```

---

## Transport Interface

Custom HTTP transport for n8n or other runtimes.

```typescript
interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

interface TransportRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | string[] | number[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'text';
}
```

The default `FetchTransport` uses native `fetch`. Provide your own implementation to integrate with n8n's `httpRequest` or other HTTP clients.

---

## Pagination Notes

### Paginated Endpoints (use `page`/`size`)

- `GET /api/timesheets` — page (default: 1), size (default: 100, max: 500)
- `GET /api/invoices` — page (default: 1), size (default: 100)

Clients expose:
- `list(params)` — stream of every record across all pages
- `listAll(params)` — all records collected into one array
- `listPages(params)` — stream of `Page<T>` records

`hasMore` is `items.length === size`: Kimai returns no totals, so a full page is the only
continuation signal. `page` / `size` must be positive integers or the SDK throws
`KimaiConfigError`.

### Non-Paginated Endpoints

All other list endpoints return complete results in a single call. `list(params)` yields the
single batch, `listAll(params)` returns it as an array, and `listPages()` is not available.
