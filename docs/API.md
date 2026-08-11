# API Reference

Complete typed method signatures for every client in the node-kimai SDK.

All methods are `async` and return `Promise<T>`. All errors are instances of `ApiError` or its subclasses.

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

## ActivityClient

Operations for the `/api/activities` resource.

### Methods

```typescript
async list(params?: ActivityListParams): Promise<Activity[]>
```
List activities. Non-paginated. Optional filters: `name`, `visible`, `customer`.

```typescript
async getAll(params?: ActivityListParams): Promise<Activity[]>
```
Fetch all activities (same as `list` — non-paginated).

```typescript
async getById(id: number): Promise<Activity>
```
Get a single activity by ID. Throws `NotFoundError` if not found.

```typescript
async create(input: ActivityEditForm): Promise<ActivityEntity>
```
Create a new activity. Returns the created entity with ID.

```typescript
async update(id: number, input: ActivityEditForm): Promise<Activity>
```
Update an existing activity.

```typescript
async delete(id: number): Promise<void>
```
Delete an activity. Throws `NotFoundError` if not found.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>): Promise<Activity>
```
Update custom fields (meta) for an activity.

```typescript
async getRates(id: number): Promise<ActivityRate[]>
```
List rates for an activity.

```typescript
async createRate(id: number, input: ActivityRateForm): Promise<ActivityRate>
```
Create a rate for an activity.

```typescript
async deleteRate(id: number, rateId: number): Promise<void>
```
Delete a rate for an activity.

```typescript
async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>
```
Assign an activity to one or more teams.

---

## CustomerClient

Operations for the `/api/customers` resource.

### Methods

```typescript
async list(params?: CustomerListParams): Promise<Customer[]>
```
List customers. Non-paginated. Optional filters: `name`, `visible`.

```typescript
async getAll(params?: CustomerListParams): Promise<Customer[]>
```
Fetch all customers (same as `list` — non-paginated).

```typescript
async getById(id: number): Promise<Customer>
```
Get a single customer by ID.

```typescript
async create(input: CustomerEditForm): Promise<CustomerEntity>
```
Create a new customer.

```typescript
async update(id: number, input: CustomerEditForm): Promise<Customer>
```
Update an existing customer.

```typescript
async delete(id: number): Promise<void>
```
Delete a customer.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>): Promise<Customer>
```
Update custom fields for a customer.

```typescript
async getRates(id: number): Promise<CustomerRate[]>
```
List rates for a customer.

```typescript
async createRate(id: number, input: CustomerRateForm): Promise<CustomerRate>
```
Create a rate for a customer.

```typescript
async deleteRate(id: number, rateId: number): Promise<void>
```
Delete a rate for a customer.

```typescript
async listComments(id: number): Promise<Comment[]>
```
List comments for a customer.

```typescript
async createComment(id: number, input: CommentForm): Promise<Comment>
```
Create a comment on a customer.

```typescript
async deleteComment(id: number, commentId: number): Promise<void>
```
Delete a comment from a customer.

```typescript
async pinComment(id: number, commentId: number): Promise<Comment>
```
Pin a comment on a customer.

```typescript
async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>
```
Assign a customer to one or more teams.

---

## ProjectClient

Operations for the `/api/projects` resource.

### Methods

```typescript
async list(params?: ProjectListParams): Promise<Project[]>
```
List projects. Non-paginated. Optional filters: `name`, `visible`, `customer`, `activity`.

```typescript
async getAll(params?: ProjectListParams): Promise<Project[]>
```
Fetch all projects (same as `list` — non-paginated).

```typescript
async getById(id: number): Promise<Project>
```
Get a single project by ID.

```typescript
async create(input: ProjectEditForm): Promise<ProjectEntity>
```
Create a new project.

```typescript
async update(id: number, input: ProjectEditForm): Promise<Project>
```
Update an existing project.

```typescript
async delete(id: number): Promise<void>
```
Delete a project.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>): Promise<Project>
```
Update custom fields for a project.

```typescript
async getRates(id: number): Promise<ProjectRate[]>
```
List rates for a project.

```typescript
async createRate(id: number, input: ProjectRateForm): Promise<ProjectRate>
```
Create a rate for a project.

```typescript
async deleteRate(id: number, rateId: number): Promise<void>
```
Delete a rate for a project.

```typescript
async listComments(id: number): Promise<Comment[]>
```
List comments for a project.

```typescript
async createComment(id: number, input: CommentForm): Promise<Comment>
```
Create a comment on a project.

```typescript
async deleteComment(id: number, commentId: number): Promise<void>
```
Delete a comment from a project.

```typescript
async pinComment(id: number, commentId: number): Promise<Comment>
```
Pin a comment on a project.

```typescript
async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>
```
Assign a project to one or more teams.

---

## TimesheetClient

Operations for the `/api/timesheets` resource.

**Note:** `list`, `getAll`, and `listPages` automatically set `user=all` when no user filter is provided, to fetch timesheets across all users.

### Methods

```typescript
async list(params?: TimesheetListParams): Promise<Timesheet[]>
```
List timesheets (paginated). Optional filters: `user`, `users`, `begin`, `end`, `activity`, `project`, `customer`, `tag`, `exported`, `page`, `size`.

```typescript
async getAll(params?: TimesheetListParams): Promise<Timesheet[]>
```
Fetch all timesheets across all pages.

```typescript
async *listPages(params?: TimesheetListParams): AsyncIterable<Timesheet[]>
```
Async iterator over paginated timesheet results.

```typescript
async getById(id: number): Promise<Timesheet>
```
Get a single timesheet by ID.

```typescript
async create(input: TimesheetEditForm): Promise<Timesheet>
```
Create (start) a new timesheet entry.

```typescript
async update(id: number, input: TimesheetEditForm): Promise<Timesheet>
```
Update an existing timesheet.

```typescript
async delete(id: number): Promise<void>
```
Delete a timesheet.

```typescript
async updateMeta(id: number, meta: Record<string, unknown>): Promise<Timesheet>
```
Update custom fields for a timesheet.

```typescript
async getActive(): Promise<Timesheet[]>
```
Get currently active (running) timesheets. Non-paginated.

```typescript
async getRecent(): Promise<Timesheet[]>
```
Get recently modified timesheets. Non-paginated.

```typescript
async stop(id: number): Promise<Timesheet>
```
Stop a running timesheet.

```typescript
async restart(id: number, input?: { begin?: string }): Promise<Timesheet>
```
Restart a stopped timesheet. Optionally specify a new `begin` time.

```typescript
async duplicate(id: number): Promise<Timesheet>
```
Duplicate a timesheet entry.

```typescript
async toggleExport(id: number): Promise<Timesheet>
```
Toggle the export flag on a timesheet.

---

## UserClient

Operations for the `/api/users` resource.

**Note:** Users cannot be deleted via API (no `DELETE /users/{id}` endpoint).

### Methods

```typescript
async list(params?: UserListParams): Promise<User[]>
```
List users. Non-paginated. Optional filters: `role`, `team`.

```typescript
async getAll(params?: UserListParams): Promise<User[]>
```
Fetch all users (same as `list` — non-paginated).

```typescript
async getById(id: number): Promise<User>
```
Get a single user by ID.

```typescript
async getMe(): Promise<User>
```
Get the current API key owner.

```typescript
async create(input: UserCreateForm): Promise<UserEntity>
```
Create a new user. Requires `username` and `email`.

```typescript
async update(id: number, input: UserEditForm): Promise<User>
```
Update an existing user.

```typescript
async updatePreferences(id: number, prefs: UserPreference[]): Promise<User>
```
Update user preferences (key-value pairs).

```typescript
async deleteApiToken(tokenId: number): Promise<void>
```
Delete an API token.

---

## TagClient

Operations for the `/api/tags` resource.

### Methods

```typescript
async list(): Promise<Tag[]>
```
List all tags. Non-paginated.

```typescript
async getAll(): Promise<Tag[]>
```
Fetch all tags (same as `list` — non-paginated).

```typescript
async create(input: TagEditForm): Promise<Tag>
```
Create a new tag.

```typescript
async delete(id: number): Promise<void>
```
Delete a tag.

```typescript
async find(name: string): Promise<Tag[]>
```
Find tags by name (partial match).

---

## TeamClient

Operations for the `/api/teams` resource.

### Methods

```typescript
async list(params?: TeamListParams): Promise<Team[]>
```
List teams. Non-paginated. Optional filter: `name`.

```typescript
async getAll(params?: TeamListParams): Promise<Team[]>
```
Fetch all teams (same as `list` — non-paginated).

```typescript
async getById(id: number): Promise<Team>
```
Get a single team by ID.

```typescript
async create(input: TeamEditForm): Promise<Team>
```
Create a new team.

```typescript
async update(id: number, input: TeamEditForm): Promise<Team>
```
Update an existing team.

```typescript
async delete(id: number): Promise<void>
```
Delete a team.

```typescript
async addMember(teamId: number, userId: number): Promise<Team>
```
Add a user as a member of a team.

```typescript
async removeMember(teamId: number, userId: number): Promise<void>
```
Remove a user from a team.

```typescript
async grantCustomerAccess(teamId: number, customerId: number): Promise<Team>
```
Grant a team access to a customer.

```typescript
async revokeCustomerAccess(teamId: number, customerId: number): Promise<void>
```
Revoke a team's access to a customer.

```typescript
async grantProjectAccess(teamId: number, projectId: number): Promise<Team>
```
Grant a team access to a project.

```typescript
async revokeProjectAccess(teamId: number, projectId: number): Promise<void>
```
Revoke a team's access to a project.

```typescript
async grantActivityAccess(teamId: number, activityId: number): Promise<Team>
```
Grant a team access to an activity.

```typescript
async revokeActivityAccess(teamId: number, activityId: number): Promise<void>
```
Revoke a team's access to an activity.

---

## InvoiceClient

Operations for the `/api/invoices` resource.

**Note:** Invoices are read-only via API (no create/update/delete). Invoice download is NOT implemented (binary response).

### Methods

```typescript
async list(params?: InvoiceListParams): Promise<Invoice[]>
```
List invoices (paginated). Optional filters: `customer`, `page`, `size`.

```typescript
async getAll(params?: InvoiceListParams): Promise<Invoice[]>
```
Fetch all invoices across all pages.

```typescript
async *listPages(params?: InvoiceListParams): AsyncIterable<Invoice[]>
```
Async iterator over paginated invoice results.

```typescript
async getById(id: number): Promise<Invoice>
```
Get a single invoice by ID.

```typescript
async updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice>
```
Update custom fields on an invoice.

---

## ApprovalBundleClient

Operations for the `/api/approval-bundle` resource (week-based approval workflow).

**Note:** This is NOT a standard CRUD resource.

### Methods

```typescript
async addToApprove(params: { user?: number; date: string }): Promise<string>
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
async deleteTemplate(templateId: number): Promise<void>
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

### Usage

```typescript
import { ApiError, NotFoundError } from 'node-kimai';

try {
  await client.activities.getById(999);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Not found');
  } else if (err instanceof ApiError) {
    console.error(err.status, err.message, err.data);
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

- `GET /api/timesheets` — page (default: 1), size (default: 50, max: 500)
- `GET /api/invoices` — page (default: 1), size (default: 50)

Clients expose:
- `list(params)` — single page
- `getAll(params)` — all pages concatenated
- `listPages(params)` — async iterator over pages

### Non-Paginated Endpoints

All other list endpoints return complete results in a single call. `getAll()` is equivalent to `list()`, and `listPages()` is not available.
