---
type: Feature
title: Agent Execution Layer
description: Agent-facing helpers (resolve/search/getContext), dry-run on mutations, structured errors (ResolutionError), compact summaries vs expanded records, and resolution details
tags: [agent, llm, helpers, dry-run, resolution, errors]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
  - id: openwiki-source-795e1a7dc3ec1be94d67ae7d
    resource: repo://src/types/common.ts
  - id: openwiki-source-d3bdb689f3740da9f3ea6571
    resource: repo://src/types/timesheet.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Agent Execution Layer

## Overview

The Agent Execution Layer (Phase F) is an additive layer that makes the SDK directly drivable by LLM agents. It sits on top of the primitive endpoint methods without modifying them, adding helper operations, structured error contracts, dry-run capabilities, and compact data projections. All 90 primitives remain unchanged; the layer adds 18 helpers across 8 resources.

This layer is fully described by the machine-readable capability registry (`capabilities.json`, 13 groups, 108 rows total).

## Two-Layer Surface

### Primitives Layer

The primitive layer provides one method per API endpoint, generated from the OpenAPI specification. These methods accept and return full typed records with no transformation:

- Full typed input shapes (e.g., `TimesheetEditForm`, `ActivityEditForm`)
- Full typed output records (e.g., `TimesheetEntity`, `Activity`)
- Direct 1:1 mapping to API endpoints

Primitives are unchanged by Phase F and remain the foundation for all operations.

### Helpers Layer

Helpers are agent-facing methods co-located on the same resource clients, built on top of primitives. A helper never adds a new endpoint—it composes existing primitives to provide higher-level workflows:

- **`resolve(identifier)`**: Resolve a record from a human-friendly identifier (id or name)
- **`search(params, options)`**: Bounded server-filtered searches with configurable limits
- **`getContext(id)`**: Fetch a workflow context (resource plus related records) in one call

Both layers take and return plain data, so tool wrappers can project either without SDK-specific knowledge.

## Helper Floor Per Resource

The shipped helper floor follows a fixed cap of `helperCap: 4` per named resource:

| Resource | Helpers Available | Notes |
|----------|------------------|-------|
| `timesheets` | `resolve`, `search`, `getContext` | Full helper surface (workflow resource) |
| `customers` | `resolve`, `search`, `getContext` | Full helper surface (workflow resource) |
| `projects` | `resolve`, `search`, `getContext` | Full helper surface (workflow resource) |
| `activities` | `resolve`, `search` | No getContext (not a workflow resource) |
| `invoices` | `resolve`, `search` | No getContext (not a workflow resource) |
| `tags` | `resolve`, `search` | No getContext (not a workflow resource) |
| `users` | `resolve`, `search` | No getContext (not a workflow resource) |
| `teams` | `resolve` | Name-based search not applicable |

Five resources (`approvalBundle`, `config`, `system`, `export`, `actions`) are primitives-only with no helpers, as they provide non-CRUD or single-endpoint surfaces.

## Resolution Semantics

### Identifier Types

`resolve(identifier)` accepts multiple identifier forms to match how humans naturally reference records:

```typescript
// Direct ID (fastest - single fetch)
await client.timesheets.resolve(42);
await client.timesheets.resolve({ id: 42 });

// By name (server-filtered page)
await client.activities.resolve("Development");
await client.activities.resolve({ name: "Development" });

// By begin timestamp (timesheets only)
await client.timesheets.resolve("2024-01-15T09:00:00");
await client.timesheets.resolve({ begin: "2024-01-15T09:00:00" });
```

### Resolution Bases and Costs

Each resource's `resolve` implementation uses one of three resolution strategies, reflected in the `resolutionCost` field:

1. **`direct`**: ID lookup via `GET /api/<resource>/{id}`. Single request, fastest path. A miss throws `NotFoundError` (never returns `null`).

2. **`server-filter`**: Name or business-key lookup via a filtered list endpoint (e.g., `GET /api/activities?name=<value>`). One bounded server-side filtered read with an exact post-filter. Used by most resources for name-based resolution.

3. **`client-scan`**: Composite fetch followed by client-side exact match. Used by `tags.resolve` and `users.resolve` where the vendor provides no server-side filter for the business key. Limited to one page of at most 500 records.

4. **`workflow`**: Multi-record fetch (used only by `getContext`, not by `resolve`).

### Resolution Bounds and Caps

All resolution operations are strictly bounded to prevent unbounded scans:

- **Maximum scan size**: 500 records per resolution attempt (`RESOLVE_SCAN_PAGE_SIZE = 500`)
- **Maximum scan pages**: 1 page (the registry declares `maxScanPages: 1`, `maxScanRecords: 500`)
- A bounded scan never runs unbounded—limits are enforced before the operation starts

### Resolution Outcomes

Resolution outcomes are explicit and structured—a `null` is never a silent truncation:

1. **One exact match**: Returns the record (or `TimesheetSummary` by default, `Timesheet` with `expand: true`)

2. **No matches**: Returns `null` when the scan completed and found no match

3. **Ambiguous matches**: Throws `ResolutionError` with code `RESOLUTION_AMBIGUOUS` when multiple exact matches exist. The error's `resourceIds` array contains all candidate IDs, and the error message names the count.

4. **Truncated scan**: Throws `ResolutionError` with code `RESOLUTION_TRUNCATED` when the scan cap was reached before the data ran out, with zero exact matches. This signals that a match might exist beyond the scan cap.

5. **ID miss**: Direct ID lookups that fail throw `NotFoundError` unchanged (never `null` or ambiguity errors).

### Resolution Details Wrapper

Callers can request the full resolution metadata using `resolutionDetails: true`:

```typescript
const result = await client.timesheets.resolve(
  { begin: "2024-01-15T09:00:00" },
  { resolutionDetails: true }
);

// result: Resolution<TimesheetSummary> = {
//   value: TimesheetSummary | null,
//   resolutionCost: 'server-filter',
//   scanned: 12,
//   scanTruncated: false,
//   candidates: [{ id: 42, label: "timesheet 42 (2024-01-15T09:00:00 - active, activity 7)" }]
// }
```

The `Resolution<T>` wrapper includes:
- `value`: The resolved record (compact summary by default) or `null`
- `resolutionCost`: The resolution strategy used (`direct` | `server-filter` | `client-scan` | `workflow`)
- `scanned`: Number of records examined
- `scanTruncated`: `true` when the scan cap stopped the scan before data ran out
- `candidates`: Array of candidate records (populated on ambiguity; single-element on success)

## Search Operations

### Search Bounds and Limits

`search(params, options)` performs one bounded server-side request with the resource's declared filters. It never performs a page walk—the entire result set is retrieved in a single request.

**Limit semantics**:
- Default limit: 25 records (`DEFAULT_HELPER_LIMIT`)
- Hard maximum: 100 records (`MAX_HELPER_LIMIT`)
- Out-of-range or non-integer limits throw `KimaiConfigError` (never silently clamped)

```typescript
// Default limit: 25
const recent = await client.timesheets.search({
  begin: "2024-01-01",
  end: "2024-01-31"
});

// Custom limit (1-100)
const batch = await client.timesheets.search(
  { exported: false },
  { limit: 50 }
);

// Error: limit out of range
await client.timesheets.search({}, { limit: 150 }); // throws KimaiConfigError
```

### Server-Driven Filters

Search parameters (`TimesheetSearchParams`, `ActivitySearchParams`, etc.) mirror exactly the filters the OpenAPI spec declares for that resource's list endpoint. Paging parameters (`page`, `size`) are excluded from search params—the helper's `limit` option controls the result size instead.

For example, `TimesheetSearchParams` includes every filter from `GET /api/timesheets`:
- `user`, `users[]` (user attribution)
- `customer`, `customers[]`, `project`, `projects[]`, `activity`, `activities[]` (scope filters)
- `begin`, `end` (time range)
- `tags[]` (tag filter)
- `exported`, `active`, `billable` (state filters)
- `orderBy`, `order` (sorting)
- `term` (free-text search)
- `full` (request expanded records from vendor)
- `modified_after` (incremental sync)

### User-Filter Override

For timesheet searches and lists, the SDK automatically overrides the vendor's default user scope when no user filter is provided. Without intervention, the Kimai API defaults to returning only the API key owner's records. The SDK passes `user=all` when the caller supplies no `user` or `users` filter, requiring the `view_other_timesheet` permission but providing the expected "all users" behavior:

```typescript
// SDK adds user=all automatically
const all = await client.timesheets.search({ exported: false });

// Explicit user filter: SDK does not override
const mine = await client.timesheets.search({ user: 42, exported: false });
```

## Workflow Context Helpers

Three workflow resources (`timesheets`, `customers`, `projects`) provide `getContext(id)` helpers that fetch a resource plus its related records in a single operation. This avoids N+1 patterns where an agent must separately fetch each reference.

### Timesheet Context

`timesheets.getContext(id)` returns the timesheet plus:
- `user`: The user record (when `timesheet.user` is set)
- `activity`: The activity record (when `timesheet.activity` is set)
- `project`: The project record (when `timesheet.project` is set)
- `customer`: The customer record (when `project.customer` is set)

Fetched with bounded concurrency: at most three requests in flight (user, activity, project), then the dependent customer read. No unbounded `Promise.all` across IDs.

```typescript
const ctx = await client.timesheets.getContext(42);
// ctx: TimesheetContext = {
//   timesheet: TimesheetSummary,
//   user: User | null,
//   activity: Activity | null,
//   project: Project | null,
//   customer: Customer | null,
// }
```

### Customer and Project Context

`customers.getContext(id)` returns the customer plus:
- `rates`: Array of `RateSummary` (compact pricing records)
- `comments`: Array of `CommentSummary` (compact comment records)
- `meta`: Array of `CustomerMeta` (custom metadata fields from the record itself, not a separate fetch)

`projects.getContext(id)` returns the project plus:
- `customer`: The referenced customer record (or `null` if no customer reference)
- `rates`: Array of `RateSummary`
- `meta`: Array of `ProjectMeta`

## Compact vs. Expanded Records

All helpers default to compact summaries that drop verbose or redundant fields while keeping decision-relevant data. The `expand: true` option returns full entity records instead.

### Compact Summary Shapes

Each `<Resource>Summary` type (e.g., `TimesheetSummary`, `ActivitySummary`, `CustomerSummary`) documents exactly which fields are kept and dropped:

**TimesheetSummary keeps**: `id`, `begin`, `end`, `duration`, `break`, `user`, `project`, `activity`, `description`, `rate`, `exported`, `billable`, `tags`

**TimesheetSummary drops**: `internalRate`, `fixedRate`, `hourlyRate`, `metaFields`

**ActivitySummary keeps**: `id`, `name`, `project`, `number`, `visible`, `billable`, `color`

**ActivitySummary drops**: `"color-safe"` (vendor duplicate), `comment` (long-form text), `metaFields` (child collection)

**CustomerSummary keeps**: `id`, `name`, `number`, `company`, `country`, `currency`, `timezone`, `visible`, `billable`, `color`

**CustomerSummary drops**: `"color-safe"`, `comment`, `language`, contact/invoice detail fields (`phone`, `fax`, `mobile`, `email`, `homepage`, `vatId`, `contact`, address lines, invoice fields), budget fields, child collections (`metaFields`, `teams`)

The registry's `outputSchema.drops` field names the dropped fields for each operation, enabling tool builders to reason about what's excluded.

### Using expand: true

```typescript
// Compact (default): TimesheetSummary
const summary = await client.timesheets.resolve(42);

// Expanded: full TimesheetEntity
const full = await client.timesheets.resolve(42, { expand: true });

// Search with expanded records
const fullRecords = await client.timesheets.search(
  { exported: false },
  { limit: 10, expand: true }
);

// Context with expanded timesheet
const expandedCtx = await client.timesheets.getContext(42, { expand: true });
// expandedCtx.timesheet is TimesheetEntity instead of TimesheetSummary
```

## Dry-Run on Mutations

Every mutation (write and destructive operations) accepts an optional `{ dryRun: true }` parameter that validates and describes the operation without issuing any wire calls. The dry-run path returns a `DryRunResult<T>` structure with:

- `operation`: Operation name (e.g., `"timesheets.create"`, `"timesheets.delete"`)
- `wouldApply`: Always `true` for valid dry-runs (failed validations throw before returning)
- `target`: Resource name and affected IDs
- `request`: HTTP method and path that would be called
- `checks`: Array of validation checks with pass/fail status (e.g., `{ name: "target-id", ok: true }`)
- `impact`: Best-effort impact estimate (`affected` count, `scope`, `reversible` flag)
- `simulated: true`: Mandatory marker that this result is simulated, not executed
- `warnings`: Disclaimers about dry-run limitations (e.g., "dry-run issues no wire call: referenced resources are not verified")
- `data?`: The input payload that would be sent (present for creates/updates)

```typescript
// Dry-run a create
const dryCreate = await client.timesheets.create(
  { project: 10, activity: 5, begin: "2024-01-15T09:00:00" },
  { dryRun: true }
);
// dryCreate: DryRunResult<TimesheetEditForm> = {
//   operation: "timesheets.create",
//   wouldApply: true,
//   target: { resource: "timesheets", ids: [] },
//   request: { method: "POST", path: "/api/timesheets" },
//   checks: [{ name: "required-fields", ok: true }],
//   impact: { affected: 1, scope: "single", reversible: true },
//   simulated: true,
//   warnings: ["dry-run issues no wire call: referenced resources are not verified", ...],
//   data: { project: 10, activity: 5, begin: "2024-01-15T09:00:00" }
// }

// Dry-run a destructive delete
const dryDelete = await client.timesheets.delete(42, { dryRun: true });
// impact.reversible: false
// warnings include: "the delete is irreversible: no dry-run warning restores a deleted record"

// Dry-run an update (no diff computed because zero fetches)
const dryUpdate = await client.timesheets.update(
  42,
  { exported: true },
  { dryRun: true }
);
// warnings include: "the current record is not fetched by dry-run (zero wire calls), so no diff is computed"
```

### Dry-Run Validation Checks

Each operation's dry-run includes operation-appropriate validation checks:

- `target-id`: Validates target ID is a positive integer
- `required-fields`: Validates required input fields are present and non-empty
- `meta-fields`: Validates metadata is a non-empty object (not array)
- `rate-id`: Validates rate ID for sub-resource operations
- `team-ids`: Validates team IDs array for team operations

Failed checks are reflected in the checks array (`ok: false`), but the dry-run still returns successfully—it's describing what would fail, not failing itself. Local argument refusals (e.g., invalid IDs, malformed input) throw `KimaiConfigError` before the dry-run result is built.

### Dry-Run Limitations

Dry-run warnings explicitly document what cannot be validated without wire calls:

1. **No resource verification**: "dry-run issues no wire call: referenced resources are not verified"—a create with `project: 999` succeeds in dry-run even if project 999 doesn't exist.

2. **No diff computation**: Updates don't fetch the current record, so before/after field diffs cannot be computed (`diff` is omitted, warning says "no diff is computed").

3. **Best-effort impact**: Impact estimates are computed locally and are not server guarantees: "impact is a best-effort estimate, not a server guarantee".

4. **No stale-object checks**: The Kimai vendor offers no `updated_at` or `If-Match` headers, so dry-run cannot detect concurrent modifications (registry: `staleCheck: "unavailable"`).

## Mutation Classification

Operations are classified along two dimensions in the capability registry:

### Effect Classification

- **`read`**: No server state change (53 operations). Safe to retry, no side effects.
- **`write`**: Creates or updates records (38 operations). May or may not be idempotent.
- **`destructive`**: Deletes records or performs irreversible operations (17 operations). Never idempotent.

### Operation Flags

- **`sensitive`**: Contains or exposes sensitive data (15 operations). E.g., user credentials, API tokens.
- **`idempotent`**: Safe to retry without duplicating side effects (23 operations). E.g., updates (PATCH), idempotent toggles.
- **`requiresApproval`**: Needs explicit user confirmation before execution (21 operations). All destructive operations plus sensitive creates/updates.

The registry's `effect`, `flags`, and `dryRun` fields allow callers to gate operations on data rather than parsing prose.

## Structured Error Contract

### Error Hierarchy Extensions

Phase F adds two new error classes to the SDK's error hierarchy:

1. **`KimaiConfigError`** (code: `CONFIG_ERROR`): Local argument refusal before any network activity. Thrown when the caller supplies an invalid argument that the SDK can reject immediately (e.g., `limit` outside 1-100, invalid identifier type, negative ID). Category: `"validation"`, never retryable.

2. **`ResolutionError`**: Structured resolution failures with closed error codes:
   - `RESOLUTION_AMBIGUOUS`: Multiple exact matches found (identifier is not unique). The `resourceIds` array contains all candidate IDs.
   - `RESOLUTION_TRUNCATED`: Scan cap reached before data ran out, with zero exact matches (a match might exist beyond the cap). Never retryable—retrying the identical identifier reproduces the same scan.

### Enhanced ApiError Fields

All `ApiError` instances now carry an extended structured contract (additive; legacy fields like `status`, `data`, `request`, `code` are unchanged):

- `category`: Closed `ErrorCategory` vocabulary (`auth`, `not_found`, `validation`, `conflict`, `rate_limit`, `server`, `network`, `timeout`, `resolution`, `policy`)
- `operation`: Operation name (e.g., `"timesheets.create"`)
- `httpStatus`: HTTP status code (may differ from `status` for client-side errors)
- `retryable`: Boolean indicating if the operation can be safely retried
- `vendorError`: Original vendor error message
- `resourceIds`: Array of affected resource IDs (for ambiguity errors, batch operations)
- `suggestedAction`: Human-readable next step (e.g., "Check credentials", "Provide more specific identifier")
- `correlationId`: Unique request ID (`crypto.randomUUID()`) minted per request in `FetchTransport`
- `retryAfter`: Parsed `Retry-After` header value (seconds) for 429 rate-limit responses (RFC 9110 delta-seconds or HTTP-date)

The contract uses derived defaults (`categoryForStatus`, `retryableForStatus`, `defaultCodeForStatus`, `suggestedActionForStatus`) assembled by `createApiError()`.

### Catching Structured Errors

```typescript
import { ResolutionError, KimaiConfigError, isKimaiError } from 'node-kimai/errors';

try {
  const result = await client.activities.resolve("Dev");
} catch (err) {
  if (err instanceof ResolutionError && err.code === 'RESOLUTION_AMBIGUOUS') {
    console.log(`Ambiguous: found ${err.resourceIds?.length} candidates`);
    console.log(`IDs: ${err.resourceIds?.join(', ')}`);
  } else if (err instanceof KimaiConfigError) {
    console.log(`Local validation failed: ${err.message}`);
  } else if (isKimaiError(err)) {
    console.log(`API error (${err.category}): ${err.message}`);
    if (err.retryable) console.log('Safe to retry');
    if (err.correlationId) console.log(`Request ID: ${err.correlationId}`);
  }
}
```

## Registry and Tool Projections

The agent execution layer is fully described by the capability registry, which serves as the single source of truth for operation metadata. All tool surfaces are projections of this registry—never hand-written lists.

### Registry Artifacts

| Artifact | Purpose | Generator |
|----------|---------|-----------|
| `capabilities.plan.json` | 108-row operation plan derived from OpenAPI + source | `scripts/derive-plan.mjs` |
| `capabilities.json` | JSON registry (13 groups, operation metadata, hashes) | `scripts/generate-capabilities.mjs` |
| `src/capabilities.ts` | Zero-import TypeScript module (`./capabilities` subpath) | `scripts/generate-capabilities.mjs` |
| `MCP_TOOL_MANIFEST.md` | Human-readable tool surface projection | `scripts/project-mcp-tools.mjs` |
| `MCP_TOOL_CATALOG.json` | Machine-readable MCP tool catalog | `scripts/build-tool-catalog.mjs` |
| `src/mcp/catalog.generated.ts` | Compiled catalog module (`./mcp` subpath) | `scripts/build-tool-catalog.mjs` |

### Registry Row Structure

Each operation in the registry includes:

- **Identity**: `id` (operation name), `resource`, `endpoint` (HTTP method + path)
- **Classification**: `kind` (`primitive` | `helper`), `effect` (`read` | `write` | `destructive`), `flags` (sensitive/idempotent/requiresApproval)
- **Schemas**: `inputSchema` (parameters, with dropped/kept field lists), `outputSchema` (return type, with drops for compact shapes)
- **Governance**: `dryRun` (boolean), `pagination` (paginated/bounded/single), `retry` (retryable statuses, non-idempotent warning)
- **Resolution** (helpers only): `basis` (server-filter/client-scan/workflow), `maxScanRecords`, `maxScanPages`
- **Errors**: Expected error codes and categories

### Capability Gates

Gates run as part of `npm run verify`:

- **`capabilities:check`**: Row coverage (registry ⇄ plan), mutation safety, staleness (plan hash, source/test file hashes, registry module equals re-render). A hand edit to the generated registry fails this gate.
- **`capabilities:check:fixture`**: Negative fixture proving the gate can fail.
- **`capabilities:check --ship`**: Ship gate ensuring no rows remain `planned` or `implemented` (all must be `tested`).
- **`catalog:check`**: Fails on stale MCP catalog (catalog must equal re-build).
- **`mcp:project:check`**: Fails on tool manifest drift.

These gates ensure the registry stays synchronized with the codebase and that all projections reflect the current registry state.
