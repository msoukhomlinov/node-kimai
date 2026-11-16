---
type: api-mapping
title: Kimai API Coverage and Mapping
description: Maps all 66 API paths across 13 resources to SDK methods, documenting special endpoints and coverage scope
tags: [api, coverage, resources, endpoints, capabilities]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-9f33d1acd0be4dd70ed2d3cd
    resource: repo://api-docs.json
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-f1f1290c41146ba8b30c85a1
    resource: repo://capabilities.json
  - id: openwiki-source-13f7f71374d28b2bdb079fc0
    resource: repo://SCOPING.md
  - id: openwiki-source-77bd11c58038f91e7a76b901
    resource: repo://src/resources/ActivityClient.ts
  - id: openwiki-source-acba0ad06723ad14fc9b9ca9
    resource: repo://src/resources/ApprovalBundleClient.ts
  - id: openwiki-source-ec27b69dbfc5b869c3aa7a34
    resource: repo://src/resources/CustomerClient.ts
  - id: openwiki-source-341395b96da8d3175efebe9a
    resource: repo://src/resources/ProjectClient.ts
  - id: openwiki-source-8103f98673a59f87b466d1ca
    resource: repo://src/resources/TeamClient.ts
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Kimai API Coverage and Mapping

This SDK provides comprehensive coverage of the Kimai Pro API v1.1, exposing all 66 API paths across 13 resource groups through typed resource clients and a machine-readable capability registry.

## Coverage Summary

**Total API surface:** 66 paths across 13 resources (52 schemas)

**SDK operations:** 108 total (90 primitives + 18 helpers)

The coverage is **complete** except for one binary endpoint (`GET /api/invoices/{id}/download`) deliberately excluded because binary export is better handled directly via HTTP requests in consuming environments like n8n.

## Resource Groups and Operation Counts

| Resource | Primitives | Helpers | Total Ops | API Paths | Notes |
|----------|------------|---------|-----------|-----------|-------|
| `timesheets` | 12 | 3 | 15 | 11 | Paginated; includes workflow helpers |
| `customers` | 14 | 3 | 17 | 11 | Includes rates, comments, team assignment |
| `projects` | 14 | 3 | 17 | 11 | Includes rates, comments, team assignment |
| `activities` | 10 | 2 | 12 | 8 | Includes rates, team assignment |
| `teams` | 13 | 1 | 14 | 10 | Member/resource access management |
| `users` | 7 | 2 | 9 | 7 | No DELETE endpoint in API |
| `invoices` | 4 | 2 | 6 | 4 | Read-only; paginated |
| `tags` | 4 | 2 | 6 | 4 | Includes find endpoint |
| `approvalBundle` | 5 | 0 | 5 | 5 | Non-CRUD workflow |
| `system` | 3 | 0 | 3 | 3 | Health/info endpoints |
| `config` | 2 | 0 | 2 | 2 | System configuration |
| `export` | 1 | 0 | 1 | 1 | Template deletion only |
| `actions` | 1 | 0 | 1 | 1 | UI action discovery |

**Total:** 90 primitives + 18 helpers = **108 operations**

## API Path to SDK Method Mapping

### Activities (8 paths → 12 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/activities` | `activities.listAll()` | Primitive | Non-paginated |
| GET | `/api/activities` | `activities.list()` | Primitive | Stream wrapper |
| POST | `/api/activities` | `activities.create()` | Primitive | |
| GET | `/api/activities/{id}` | `activities.get()` | Primitive | |
| PATCH | `/api/activities/{id}` | `activities.update()` | Primitive | |
| DELETE | `/api/activities/{id}` | `activities.delete()` | Primitive | |
| PATCH | `/api/activities/{id}/meta` | `activities.updateMeta()` | Primitive | Custom fields |
| GET | `/api/activities/{id}/rates` | `activities.getRates()` | Primitive | |
| POST | `/api/activities/{id}/rates` | `activities.createRate()` | Primitive | |
| DELETE | `/api/activities/{id}/rates/{rateId}` | `activities.deleteRate()` | Primitive | |
| POST | `/api/activities/{id}/team` | `activities.addToTeam()` | Primitive | |
| — | — | `activities.resolve()` | Helper | Server-filter resolution |
| — | — | `activities.search()` | Helper | Filtered scan |

### Approval Bundle (5 paths → 5 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| POST | `/api/approval-bundle/add_to_approve` | `approvalBundle.addToApprove()` | Primitive | Returns URL string |
| GET | `/api/approval-bundle/next-week` | `approvalBundle.nextWeek()` | Primitive | |
| GET | `/api/approval-bundle/week-status` | `approvalBundle.weekStatus()` | Primitive | |
| GET | `/api/approval-bundle/overtime_year` | `approvalBundle.overtimeYear()` | Primitive | |
| GET | `/api/approval-bundle/weekly_overtime` | `approvalBundle.weeklyOvertime()` | Primitive | |

### Customers (11 paths → 17 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/customers` | `customers.listAll()` | Primitive | Non-paginated |
| GET | `/api/customers` | `customers.list()` | Primitive | Stream wrapper |
| POST | `/api/customers` | `customers.create()` | Primitive | |
| GET | `/api/customers/{id}` | `customers.get()` | Primitive | |
| PATCH | `/api/customers/{id}` | `customers.update()` | Primitive | |
| DELETE | `/api/customers/{id}` | `customers.delete()` | Primitive | |
| PATCH | `/api/customers/{id}/meta` | `customers.updateMeta()` | Primitive | Custom fields |
| GET | `/api/customers/{id}/rates` | `customers.getRates()` | Primitive | |
| POST | `/api/customers/{id}/rates` | `customers.createRate()` | Primitive | |
| DELETE | `/api/customers/{id}/rates/{rateId}` | `customers.deleteRate()` | Primitive | |
| GET | `/api/customers/{id}/comments` | `customers.listComments()` | Primitive | |
| POST | `/api/customers/{id}/comments` | `customers.createComment()` | Primitive | |
| DELETE | `/api/customers/{id}/comments/{comment}` | `customers.deleteComment()` | Primitive | |
| PATCH | `/api/customers/{id}/comments/{comment}/pin` | `customers.pinComment()` | Primitive | |
| POST | `/api/customers/{id}/team` | `customers.addToTeam()` | Primitive | |
| — | — | `customers.resolve()` | Helper | Server-filter resolution |
| — | — | `customers.search()` | Helper | Filtered scan |
| — | — | `customers.getContext()` | Helper | Workflow context fetch |

### Projects (11 paths → 17 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/projects` | `projects.listAll()` | Primitive | Non-paginated |
| GET | `/api/projects` | `projects.list()` | Primitive | Stream wrapper |
| POST | `/api/projects` | `projects.create()` | Primitive | |
| GET | `/api/projects/{id}` | `projects.get()` | Primitive | |
| PATCH | `/api/projects/{id}` | `projects.update()` | Primitive | |
| DELETE | `/api/projects/{id}` | `projects.delete()` | Primitive | |
| PATCH | `/api/projects/{id}/meta` | `projects.updateMeta()` | Primitive | Custom fields |
| GET | `/api/projects/{id}/rates` | `projects.getRates()` | Primitive | |
| POST | `/api/projects/{id}/rates` | `projects.createRate()` | Primitive | |
| DELETE | `/api/projects/{id}/rates/{rateId}` | `projects.deleteRate()` | Primitive | |
| GET | `/api/projects/{id}/comments` | `projects.listComments()` | Primitive | |
| POST | `/api/projects/{id}/comments` | `projects.createComment()` | Primitive | |
| DELETE | `/api/projects/{id}/comments/{comment}` | `projects.deleteComment()` | Primitive | |
| PATCH | `/api/projects/{id}/comments/{comment}/pin` | `projects.pinComment()` | Primitive | |
| POST | `/api/projects/{id}/team` | `projects.addToTeam()` | Primitive | |
| — | — | `projects.resolve()` | Helper | Server-filter resolution |
| — | — | `projects.search()` | Helper | Filtered scan |
| — | — | `projects.getContext()` | Helper | Workflow context fetch |

### Timesheets (11 paths → 15 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/timesheets` | `timesheets.listAll()` | Primitive | **Paginated** (page/size) |
| GET | `/api/timesheets` | `timesheets.list()` | Primitive | Page stream |
| GET | `/api/timesheets` | `timesheets.listPages()` | Primitive | Full-page stream |
| POST | `/api/timesheets` | `timesheets.create()` | Primitive | |
| GET | `/api/timesheets/{id}` | `timesheets.get()` | Primitive | |
| PATCH | `/api/timesheets/{id}` | `timesheets.update()` | Primitive | |
| DELETE | `/api/timesheets/{id}` | `timesheets.delete()` | Primitive | |
| PATCH | `/api/timesheets/{id}/meta` | `timesheets.updateMeta()` | Primitive | Custom fields |
| PATCH | `/api/timesheets/{id}/stop` | `timesheets.stop()` | Primitive | |
| PATCH | `/api/timesheets/{id}/restart` | `timesheets.restart()` | Primitive | |
| PATCH | `/api/timesheets/{id}/duplicate` | `timesheets.duplicate()` | Primitive | |
| PATCH | `/api/timesheets/{id}/export` | `timesheets.toggleExport()` | Primitive | |
| GET | `/api/timesheets/active` | `timesheets.getActive()` | Primitive | **Not paginated** |
| GET | `/api/timesheets/recent` | `timesheets.getRecent()` | Primitive | **Not paginated** |
| — | — | `timesheets.resolve()` | Helper | Server-filter resolution |
| — | — | `timesheets.search()` | Helper | Filtered scan |
| — | — | `timesheets.getContext()` | Helper | Workflow context fetch |

### Users (7 paths → 9 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/users` | `users.listAll()` | Primitive | Non-paginated |
| GET | `/api/users` | `users.list()` | Primitive | Stream wrapper |
| POST | `/api/users` | `users.create()` | Primitive | |
| GET | `/api/users/{id}` | `users.get()` | Primitive | |
| PATCH | `/api/users/{id}` | `users.update()` | Primitive | |
| GET | `/api/users/me` | `users.getMe()` | Primitive | Current user |
| PATCH | `/api/users/{id}/preferences` | `users.updatePreferences()` | Primitive | |
| DELETE | `/api/users/api-token/{id}` | `users.deleteApiToken()` | Primitive | |
| — | — | `users.resolve()` | Helper | Client-scan resolution |
| — | — | `users.search()` | Helper | Filtered scan |

**Note:** No `DELETE /api/users/{id}` endpoint exists in the API.

### Tags (4 paths → 6 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/tags` | `tags.listAll()` | Primitive | Non-paginated |
| GET | `/api/tags` | `tags.list()` | Primitive | Stream wrapper |
| POST | `/api/tags` | `tags.create()` | Primitive | |
| DELETE | `/api/tags/{id}` | `tags.delete()` | Primitive | |
| GET | `/api/tags/find` | `tags.find()` | Primitive | Query-based search |
| — | — | `tags.resolve()` | Helper | Client-scan resolution |
| — | — | `tags.search()` | Helper | Filtered scan |

### Teams (10 paths → 14 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/teams` | `teams.listAll()` | Primitive | Non-paginated |
| GET | `/api/teams` | `teams.list()` | Primitive | Stream wrapper |
| POST | `/api/teams` | `teams.create()` | Primitive | |
| GET | `/api/teams/{id}` | `teams.get()` | Primitive | |
| PATCH | `/api/teams/{id}` | `teams.update()` | Primitive | |
| DELETE | `/api/teams/{id}` | `teams.delete()` | Primitive | |
| POST | `/api/teams/{id}/members/{userId}` | `teams.addMember()` | Primitive | |
| DELETE | `/api/teams/{id}/members/{userId}` | `teams.removeMember()` | Primitive | |
| POST | `/api/teams/{id}/customers/{customerId}` | `teams.grantCustomerAccess()` | Primitive | |
| DELETE | `/api/teams/{id}/customers/{customerId}` | `teams.revokeCustomerAccess()` | Primitive | |
| POST | `/api/teams/{id}/projects/{projectId}` | `teams.grantProjectAccess()` | Primitive | |
| DELETE | `/api/teams/{id}/projects/{projectId}` | `teams.revokeProjectAccess()` | Primitive | |
| POST | `/api/teams/{id}/activities/{activityId}` | `teams.grantActivityAccess()` | Primitive | |
| DELETE | `/api/teams/{id}/activities/{activityId}` | `teams.revokeActivityAccess()` | Primitive | |
| — | — | `teams.resolve()` | Helper | Server-filter resolution |

### Invoices (4 paths → 6 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/invoices` | `invoices.listAll()` | Primitive | **Paginated** |
| GET | `/api/invoices` | `invoices.list()` | Primitive | Page stream |
| GET | `/api/invoices` | `invoices.listPages()` | Primitive | Full-page stream |
| GET | `/api/invoices/{id}` | `invoices.get()` | Primitive | |
| PATCH | `/api/invoices/{id}/custom-fields` | `invoices.updateCustomFields()` | Primitive | |
| GET | `/api/invoices/{id}/download` | ❌ **Not implemented** | — | Binary export |
| — | — | `invoices.resolve()` | Helper | Server-filter resolution |
| — | — | `invoices.search()` | Helper | Filtered scan |

**Note:** No `DELETE /api/invoices/{id}` endpoint exists in the API.

### System (3 paths → 3 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/ping` | `system.ping()` | Primitive | Returns `true` |
| GET | `/api/version` | `system.getVersion()` | Primitive | |
| GET | `/api/plugins` | `system.getPlugins()` | Primitive | |

### Config (2 paths → 2 operations)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/config/timesheet` | `config.getTimesheetConfig()` | Primitive | |
| GET | `/api/config/colors` | `config.getColors()` | Primitive | |

### Export (1 path → 1 operation)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| DELETE | `/api/export/{id}` | `export.deleteTemplate()` | Primitive | |

### Actions (1 path → 1 operation)

| HTTP Method | API Path | SDK Method | Type | Notes |
|-------------|----------|------------|------|-------|
| GET | `/api/actions/{resource}/{id}/{view}/{locale}` | `actions.getActions()` | Primitive | Locale/view-specific |

## Special Endpoint Categories

### Pagination Behavior

**Paginated endpoints** (accept `page`/`size` params):
- `GET /api/timesheets` — page (default: 1), size (default: 100, max: 500)
- `GET /api/invoices` — page (default: 1), size (default: 100)

**Non-paginated endpoints** (single fetch, never send page params):
- All other list endpoints return complete results in one call
- Includes activities, customers, projects, users, teams, tags
- Also: timesheets/active, timesheets/recent, all rate/comment sub-resources

### Sub-Resource Patterns

**Rate endpoints** (activities, customers, projects):
```
GET    /api/{resource}/{id}/rates         → getRates()
POST   /api/{resource}/{id}/rates         → createRate()
DELETE /api/{resource}/{id}/rates/{rateId} → deleteRate()
```

**Comment endpoints** (customers, projects):
```
GET    /api/{resource}/{id}/comments            → listComments()
POST   /api/{resource}/{id}/comments            → createComment()
DELETE /api/{resource}/{id}/comments/{comment}  → deleteComment()
PATCH  /api/{resource}/{id}/comments/{comment}/pin → pinComment()
```

**Meta/custom field updates** (activities, customers, projects, timesheets):
```
PATCH /api/{resource}/{id}/meta → updateMeta()
```

**Team assignment** (activities, customers, projects):
```
POST /api/{resource}/{id}/team → addToTeam()
```

### Non-Standard Endpoints

**Approval Bundle** — week-based workflow, not CRUD:
- Returns URL string from `addToApprove()`
- Other methods return inline objects (no named schema in spec)
- All accept optional `user` param (defaults to API key owner)

**Timesheet Special Operations**:
- `stop()` — stop running timesheet
- `restart()` — restart stopped timesheet
- `duplicate()` — create copy
- `toggleExport()` — toggle export flag
- `getActive()` — currently running timesheets (non-paginated)
- `getRecent()` — recent timesheets (non-paginated)

**User Special Operations**:
- `getMe()` — current API key owner
- `updatePreferences()` — user preferences array
- `deleteApiToken()` — revoke API token

**Team Member/Access Management**:
- `addMember()` / `removeMember()` — user membership
- `grantCustomerAccess()` / `revokeCustomerAccess()`
- `grantProjectAccess()` / `revokeProjectAccess()`
- `grantActivityAccess()` / `revokeActivityAccess()`

## Helper Operations

The SDK provides 18 agent-facing helper operations (Phase F additions) across 8 resources:

### Resolution Helpers

Every CRUD resource except `approvalBundle`, `config`, `system`, `export`, and `actions` provides a `resolve()` helper:

**Server-filter resolution** (most resources):
- `activities.resolve(identifier)` — by `{id}` or `{name}`
- `customers.resolve(identifier)` — by `{id}` or `{name}`
- `projects.resolve(identifier)` — by `{id}` or `{name}`
- `timesheets.resolve(identifier)` — by `{id}` or `{begin}`
- `invoices.resolve(identifier)` — by `{id}` or `{number}`
- `teams.resolve(identifier)` — by `{id}` only (no name search)

**Client-scan resolution** (composite fetch):
- `tags.resolve(identifier)` — by `{id}` or `{name}` (in-memory exact match)
- `users.resolve(identifier)` — by `{id}` or `{username}` (in-memory exact match)

**Resolution caps:**
- One page of at most 500 records (`RESOLVE_SCAN_PAGE_SIZE = 500`)
- Outcomes: exact match (record), no match (`null`), ambiguous (`ResolutionError.RESOLUTION_AMBIGUOUS`), truncated (`ResolutionError.RESOLUTION_TRUNCATED`)

### Search Helpers

Eight resources provide `search()` helpers:
- `activities.search(params, { limit })`
- `customers.search(params, { limit })`
- `projects.search(params, { limit })`
- `timesheets.search(params, { limit })`
- `invoices.search(params, { limit })`
- `tags.search(params, { limit })`
- `users.search(params, { limit })`

**Bounds:** default 25, hard maximum 100 (`DEFAULT_HELPER_LIMIT` / `MAX_HELPER_LIMIT`)

### Workflow Context Helpers

Three workflow resources provide `getContext()` helpers:
- `timesheets.getContext(id)` — timesheet + user + project + activity
- `customers.getContext(id)` — customer + projects + comments
- `projects.getContext(id)` — project + customer + activities + comments

## Capability Registry

Every operation is documented in `capabilities.json` with:

- **Metadata:** `id`, `resource`, `operation`, `kind` (primitive/helper)
- **Endpoint:** `endpoint` path and method
- **Classification:** `effect` (read/write/destructive), `flags` (sensitive/idempotent/requiresApproval)
- **Schemas:** `inputSchema`, `outputSchema` (with `drops` for compact shapes)
- **Governance:** `dryRun` support, `retry.retryableStatuses`, `pagination.mode`
- **Resolution:** `resolution.basis` (server-filter/client-scan/workflow), `resolution.maxScanRecords`
- **Tests:** `tests[]` with file/title, `staleCheck` with source/test hashes

**Registry structure:** 13 groups, `planHash` + `builtAt` per group, 108 total records (90 primitives + 18 helpers).

**Status:** All 108 operations are `status: "tested"`.

## Excluded Endpoints

**Binary export endpoint:**
- `GET /api/invoices/{id}/download` — deliberately excluded from SDK
- Reason: Binary file download is not suitable for SDK consumption
- Alternative: n8n and other consumers can handle binary downloads directly via HTTP requests

## Related Documentation

- API spec source: `api-docs.json` (Kimai Pro API v1.1, 66 paths, 52 schemas)
- Resource client implementations: `src/resources/`
- Capability registry: `capabilities.json`
- MCP tool catalog: `MCP_TOOL_CATALOG.json`
- Architecture document: `ARCHITECTURE.md` (sections 8–9: response envelopes, special endpoints, endpoint coverage)
- Scoping document: `SCOPING.md` (sections C–D: API spec source, coverage scope)
