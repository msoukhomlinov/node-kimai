---
type: architecture
title: Resource Client Architecture
description: Documents the 13 resource client structure, naming patterns, pagination strategies (list/listAll/listPages), and the helper layer (resolve/search/getContext)
tags: [resources, clients, pagination, helpers, resolve, search]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
  - id: openwiki-source-77bd11c58038f91e7a76b901
    resource: repo://src/resources/ActivityClient.ts
  - id: openwiki-source-19a209672808dbc8e8fb9bee
    resource: repo://src/resources/index.ts
  - id: openwiki-source-9e0b87e93c3e5a77d4cf7feb
    resource: repo://src/resources/paging.ts
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Resource Client Architecture

The SDK exposes 13 resource clients, each wrapping one Kimai API resource. Clients provide three pagination methods (list/listAll/listPages), agent execution helpers (resolve/search/getContext), and type-safe CRUD operations. All clients delegate to ApiClient HTTP verbs, inheriting transport injection, timeout handling, and error creation.

## Thirteen Resource Clients

The [src/resources/index.ts barrel](repo://src/resources/index.ts#L1-L16) exports 13 resource clients:

1. **ActivityClient** — activities (billable items)
2. **CustomerClient** — customers (top-level entities)
3. **ProjectClient** — projects (grouped activities under a customer)
4. **TimesheetClient** — timesheet entries (time tracking records)
5. **UserClient** — users (Kimai accounts)
6. **TagClient** — tags (labels for timesheets/activities/projects)
7. **TeamClient** — teams (access control groups)
8. **InvoiceClient** — invoices (billing documents)
9. **ApprovalBundleClient** — approval workflows (non-CRUD endpoints)
10. **ConfigClient** — configuration (timesheet settings, colors)
11. **SystemClient** — system info (ping, version, plugins)
12. **ExportClient** — export templates
13. **ActionsClient** — UI actions metadata

Each client is instantiated by [ApiClient constructor](repo://src/client.ts#L334-L346) with a reference to the ApiClient, allowing them to call `this.client.get()`, `this.client.post()`, etc.

## Naming Patterns

Resource clients follow consistent naming:

- **Class names**: `{Resource}Client` (e.g., `TimesheetClient`)
- **File names**: `{Resource}Client.ts` (PascalCase)
- **Type files**: `{resource}.ts` (snake_case in `src/types/`)
- **Methods**: camelCase (`list`, `listAll`, `listPages`, `get`, `create`, `update`, `delete`, `updateMeta`, `getRates`, etc.)

Type naming follows the pattern:

- **Entity**: `{Resource}` or `{Resource}Entity` (e.g., `Timesheet`, `ActivityEntity`)
- **Collection**: `{Resource}Collection` (deprecated; bare arrays are preferred)
- **Create input**: `{Resource}CreateInput` or `{Resource}EditForm`
- **Update input**: `{Resource}UpdateInput` or `{Resource}EditForm`
- **List params**: `{Resource}ListParams` or `{Resource}SearchParams`
- **Summary**: `{Resource}Summary` (compact projection for helpers)

## Pagination Strategies

The SDK distinguishes between **paginated resources** (timesheets, invoices) and **non-paginated resources** (activities, customers, projects, users, tags, teams). The [paging module](repo://src/resources/paging.ts) provides three strategies.

### Three Pagination Methods

Every resource client exposes up to three list methods:

1. **`list(params?): AsyncIterable<T>`**
   - Streams every record one at a time
   - For paginated resources: walks every page automatically
   - For non-paginated resources: yields the single batch
   - Consume with `for await (const item of client.activities.list()) { ... }`

2. **`listAll(params?): Promise<T[]>`**
   - Collects the complete set (all pages concatenated)
   - Returns a plain array
   - MCP-preferred read method

3. **`listPages(params?): AsyncIterable<Page<T>>`**
   - Streams whole pages (available **only** on paginated resources)
   - Each page is `{ items, page, size, hasMore }`
   - `hasMore` is derived from `items.length === size` (Kimai provides no totals)

The [streamItems function](repo://src/resources/paging.ts#L61-L69) implements the item-by-item stream, [collectPages](repo://src/resources/paging.ts#L72-L80) collects all pages into an array, and [streamPages](repo://src/resources/paging.ts#L40-L58) yields whole pages. For non-paginated resources, [streamOnce](repo://src/resources/paging.ts#L86-L89) yields the single batch.

### Paginated vs Non-Paginated Resources

**Paginated resources** (send `page`/`size` params):

- Timesheets (`GET /api/timesheets`) — default page 1, size 100, max size 500
- Invoices (`GET /api/invoices`) — default page 1, size 100

**Non-paginated resources** (single batch, **never** send `page`/`size`):

- Activities, Customers, Projects, Users, Tags, Teams
- All rate endpoints (`GET /api/activities/{id}/rates`)
- All comment endpoints (`GET /api/customers/{id}/comments`)
- All approval-bundle endpoints
- All system/config endpoints

The [pagePlan method](repo://src/resources/TimesheetClient.ts#L167-L176) on paginated resources resolves paging params (defaulting page to 1, size to 100) and returns a PageFetcher. Non-paginated resources call `streamOnce(() => this.client.get(...))` directly.

### Page Validation

The [pageParams function](repo://src/resources/paging.ts#L23-L33) validates `page` and `size` parameters:

- Both must be positive integers
- Non-integer or non-positive values throw `KimaiConfigError` (never silently clamped)
- Default `page: 1`, `size: 100`

The [streamPages generator](repo://src/resources/paging.ts#L40-L58) includes a runaway-loop guard that refuses to walk past 100,000 pages, throwing `KimaiConfigError` to prevent infinite loops on malformed responses.

### hasMore Derivation

Kimai list endpoints return **bare arrays with no totals**. The SDK derives `hasMore` honestly from the requested page size:

```typescript
hasMore = items.length === size
```

No `total` or `totalPages` is invented. When a page contains fewer items than requested, `hasMore: false` signals the end of data.

## Helper Layer: resolve / search / getContext

The agent execution layer adds three helpers per resource client (where applicable):

### resolve(identifier, options?)

The [resolve method](repo://src/resources/ActivityClient.ts) turns a human identifier into a record:

- Accepts `{ id }`, `{ name }`, a bare numeric id, or an exact name string
- Performs a bounded scan (up to 500 records for timesheets/activities)
- Returns `null` when no match is found
- Throws `ResolutionError` with code `RESOLUTION_AMBIGUOUS` when several exact matches exist (candidate IDs in `resourceIds`)
- Throws `ResolutionError` with code `RESOLUTION_TRUNCATED` when the scan stops at the cap without deciding
- Returns a **compact summary** by default (`ActivitySummary`, `TimesheetSummary`)
- `{ expand: true }` returns the full record
- `{ resolutionDetails: true }` returns the `Resolution<T>` wrapper (`{ value, scanned, scanTruncated, candidates }`)

The [toActivitySummary](repo://src/resources/ActivityClient.ts#L51-L61) and [toTimesheetSummary](repo://src/resources/TimesheetClient.ts#L55-L71) functions project compact summaries with only essential fields (id, name, timestamps, key flags).

### search(params, options?)

The [search helper](repo://src/resources/TimesheetClient.ts) returns one filtered page:

- Accepts the same params as `list()` plus a `limit` option
- `limit` defaults to **25**, hard maximum **100** (validated with [helperLimit](repo://src/resources/ActivityClient.ts#L42-L48))
- Non-integer or out-of-bounds `limit` throws `KimaiConfigError` (never silently clamped)
- Returns an array of records (not an iterable)
- Returns compact summaries by default; `{ expand: true }` returns full records

### getContext(id, options?)

Available on **timesheets, customers, and projects** only. Fetches the target record plus its references in a single helper call:

- Timesheets: returns `timesheet`, `user`, `activity`, `project`, and `customer` (each related record is `null` when the timesheet or project carries no reference)
- Customers: returns `customer`, `rates`, `comments`, and `meta`
- Projects: returns `project`, `customer` (or `null`), `rates`, and `meta`

Compact by default; `{ expand: true }` returns full records. See [Workflow Context Helpers](../features/agent-execution.md#workflow-context-helpers) for the full shapes.

## CRUD Operations and Dry-Run

Resource clients provide standard CRUD methods:

- **`get(id)`**: Fetch one record by id (404 throws `NotFoundError`)
- **`create(input, opts?)`**: Create a new record (POST)
- **`update(id, input, opts?)`**: Update an existing record (PATCH)
- **`delete(id)`**: Delete a record (DELETE)

Every mutation accepts `{ dryRun: true }` and returns a `DryRunResult` without issuing any wire call. The [mutationDryRun builder](repo://src/resources/TimesheetClient.ts#L108-L136) constructs the envelope with:

- **`operation`**: Registry operation name (e.g., `timesheets.create`)
- **`wouldApply`**: Always `true` (the dry-run validated successfully)
- **`target`**: `{ resource, ids }`
- **`request`**: `{ method, path }`
- **`checks`**: Array of `{ name, ok }` precondition checks
- **`impact`**: `{ affected, scope, reversible }`
- **`simulated`**: Always `true` (zero wire calls)
- **`warnings`**: Array of limitation messages (e.g., "referenced resources are not verified")
- **`data`**: The input payload (when present)

Dry-run responses are best-effort: they validate argument structure and required fields but do not verify referenced resources (projects, activities, users) exist.

## Specialized Resource Methods

Beyond CRUD, resource clients expose specialized endpoints:

### Activity-specific

- `getRates(id)`, `createRate(id, input)`, `deleteRate(id, rateId)` — rate management
- `updateMeta(id, meta)` — custom field updates (PATCH `/api/activities/{id}/meta`)
- `addToTeam(id, { teams })` — team assignment

### Customer/Project-specific

- `createComment(id, input)`, `listComments(id)`, `pinComment(id, commentId)`, `deleteComment(id, commentId)` — comment management
- `createRate(id, input)`, `getRates(id)` — rate management
- `updateMeta(id, meta)` — custom field updates
- `addToTeam(id, { teams })` — team assignment

### Timesheet-specific

- `getActive()`, `getRecent()` — predefined filtered lists (no pagination)
- `stop(id)`, `restart(id)` — state transitions
- `duplicate(id)` — clone a timesheet
- `toggleExport(id)` — export flag toggle
- `updateMeta(id, meta)` — custom field updates

### Team-specific

- `addMember(id, userId)`, `removeMember(id, userId)` — membership
- `grantCustomerAccess(id, customerId)`, `revokeCustomerAccess(id, customerId)` — access control
- `grantProjectAccess(id, projectId)`, `revokeProjectAccess(id, projectId)`
- `grantActivityAccess(id, activityId)`, `revokeActivityAccess(id, activityId)`

### Invoice-specific

- `updateCustomFields(id, fields)` — custom field updates
- `download(id)` — binary PDF download (returns `ArrayBuffer`)

### ApprovalBundle-specific

- `addToApprove({ date, user })`, `nextWeek()`, `weekStatus({ date })`, `overtimeYear({ date })`, `weeklyOvertime({ date })` — non-CRUD workflow endpoints

## Client Construction Pattern

All resource clients follow the same construction pattern:

```typescript
export class ActivityClient {
  constructor(private client: ApiClient) {}

  list(params?: ActivitySearchParams): AsyncIterable<Activity> {
    return streamOnce(() => this.client.get<Activity[]>('/api/activities', { query: params }));
  }

  async get(id: number): Promise<Activity> {
    return this.client.get<Activity>(`/api/activities/${pathId(id)}`);
  }

  // ... other methods
}
```

The `private client: ApiClient` reference enables delegation to `this.client.get()`, `this.client.post()`, etc., ensuring all HTTP calls go through the configured transport with timeout/cancellation support.

## User-Filter Default Override

Methods that accept a `user` or `users` filter (timesheets, invoices, approval-bundle) default to **all users** when no filter is provided. The [pagePlan method](repo://src/resources/TimesheetClient.ts#L168-L169) explicitly sets `user: 'all'` when both `user` and `users` are absent, overriding the Kimai API's default behavior (which scopes to the API key owner).
