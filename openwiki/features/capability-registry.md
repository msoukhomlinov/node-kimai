---
type: Feature
title: Capability Registry
description: Generated capabilities.json structure, CapabilityRecord schema, operation metadata (effect/flags/dryRun/pagination/resolution), and the generation pipeline from api-docs.json
tags: [registry, capabilities, metadata, generation, tools]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-f1f1290c41146ba8b30c85a1
    resource: repo://capabilities.json
  - id: openwiki-source-583800b7070d5c4b3a3b786c
    resource: repo://scripts/derive-plan.mjs
  - id: openwiki-source-5f756d8f8026524d463c79db
    resource: repo://src/capabilities.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Capability Registry

## Overview

The capability registry is a machine-readable inventory of every SDK operation (primitives and helpers), providing structured metadata for effect classification, mutation safety, pagination modes, resolution bounds, retryability, error codes, and test coverage. It serves as the single source of truth for all tool surface projections (MCP catalogs, manifests, documentation).

The registry contains 13 resource groups with 108 total operations: 90 primitives (endpoint methods) and 18 helpers (agent-facing compositions).

## Registry Artifacts

The capability system produces multiple artifacts in a generation pipeline:

| Artifact | Path | Generator | Purpose |
|----------|------|-----------|---------|
| Plan | `capabilities.plan.json` | `scripts/derive-plan.mjs` | 108-row operation plan derived from `api-docs.json` + source tree; preserves human judgement columns |
| Registry (JSON) | `capabilities.json` | `scripts/generate-capabilities.mjs` | JSON registry with groups, planHash, builtAt, and records |
| Registry (TS) | `src/capabilities.ts` | `scripts/generate-capabilities.mjs` | Zero-import TypeScript module exported as `./capabilities` subpath |
| Tool Manifest | `MCP_TOOL_MANIFEST.md` | `scripts/project-mcp-tools.mjs` | Human-readable tool surface projection |
| MCP Catalog | `MCP_TOOL_CATALOG.json` | `scripts/build-tool-catalog.mjs` | Machine-readable MCP tool catalog |
| MCP Catalog (TS) | `src/mcp/catalog.generated.ts` | `scripts/build-tool-catalog.mjs` | Compiled catalog module exported as `./mcp` subpath |

All tool surfaces are projections of the capability registry—never hand-written lists. This ensures tool descriptions, input schemas, and classifications stay synchronized with the codebase.

## Registry Structure

### Top Level

The JSON registry (`capabilities.json`) and TypeScript module (`src/capabilities.ts`) have identical structure:

```typescript
{
  generatedAt: string,          // ISO 8601 timestamp
  groups: {
    [resourceName: string]: {
      planHash: string,         // SHA-256 of plan rows for this group
      builtAt: string,          // When this group was last built
      records: CapabilityRecord[]
    }
  }
}
```

Additionally, the TypeScript module exports:
- `CAPABILITY_GROUPS`: The grouped registry object
- `CAPABILITIES`: Flat array of all records across groups
- `CAPABILITY_PLAN_HASHES`: Map of `{ [resource]: planHash }`

### CapabilityRecord Schema

Each record describes one operation with the following structure:

```typescript
interface CapabilityRecord {
  // Identity
  id: string;                    // e.g., 'timesheets.stop', 'activities.resolve'
  resource: string;              // Resource key: 'timesheets', 'activities', etc.
  operation: string;             // Operation name: 'stop', 'resolve', 'create', etc.

  // Classification
  kind: 'primitive' | 'helper';  // 'primitive' = endpoint method, 'helper' = agent layer
  endpoint: string | null;       // e.g., 'POST /api/timesheets', null for helpers
  effect: 'read' | 'write' | 'destructive';
  flags: string[];               // 'sensitive', 'idempotent', 'requiresApproval'
  dryRun: boolean;              // True if operation accepts { dryRun: true }

  // Schemas
  inputSchema: Record<string, CapabilityArgSchema>;
  outputSchema: { type: string; drops: string[] };

  // Usage
  examples: string[];           // Realistic synthesized calls (≥1 per operation)
  permissions: string;          // Always 'unknown' (Kimai spec has no per-op scopes)

  // Pagination
  pagination:
    | { mode: 'page'; vendorDefaultPageSize: number; vendorMaxPageSize: number }
    | { mode: 'none' };

  // Resolution (helpers only)
  resolution: {
    basis: string;              // 'direct' | 'server-filter' | 'client-scan' | 'workflow'
    maxScanRecords: number;     // 500 for all helpers
    maxScanPages: number;       // 1 for all helpers
  } | null;

  // Retry
  retry: {
    retryableStatuses: number[];     // HTTP statuses safe to retry
    policy: string;                   // Policy description
    idempotencySupport: string;      // Always 'none' (no vendor idempotency tokens)
  };

  // Errors and testing
  errors: string[];                   // Stable error codes (e.g., 'NOT_FOUND', 'RESOLUTION_AMBIGUOUS')
  metadata: Record<string, unknown>;  // Purpose, usage, preferredWhen, related
  compact: string | null;             // Summary type name (e.g., 'TimesheetSummary') or null
  status: 'implemented' | 'tested';
  tests: Array<{ id: string; file: string; title: string }>;

  // Staleness tracking
  staleCheck: {
    planHash: string;           // SHA-256 of plan rows for this resource
    sourceFile: string;         // Implementing file (e.g., 'src/resources/TimesheetClient.ts')
    sourceHash: string | null;  // SHA-256 of source file
    testFiles: string[];        // Test file paths
    testHash: string | null;    // SHA-256 of concatenated test files
  };
}
```

### CapabilityArgSchema

Each argument in `inputSchema` is described by:

```typescript
interface CapabilityArgSchema {
  type: string;              // Type descriptor (e.g., 'number', 'TimesheetEditForm', 'object')
  required: boolean;         // True for required parameters
  description?: string;      // What the argument is (never sample values—redaction discipline)
}
```

## Effect Classification

Operations are classified by their server-side impact:

### Read Operations (53 total)

- No server state change
- Safe to retry without side effects
- Examples: `timesheets.list`, `activities.get`, `timesheets.resolve`, `customers.search`
- All helpers are reads (they compose read primitives or perform local resolution logic)

### Write Operations (38 total)

- Creates or updates records
- May or may not be idempotent (see `flags`)
- Examples: `timesheets.create`, `activities.update`, `timesheets.stop`, `customers.createRate`
- Retryable statuses apply only if the operation has the `idempotent` flag

### Destructive Operations (17 total)

- Deletes records or performs irreversible actions
- Never idempotent
- Always has `requiresApproval` flag
- Examples: `timesheets.delete`, `activities.deleteRate`, `tags.delete`
- Retryable statuses are empty (retrying a delete is unsafe without knowing if the first attempt succeeded)

The registry's `effect` field enables callers to gate operations on data rather than parsing operation names or descriptions.

## Operation Flags

Three classification flags provide additional safety metadata:

### sensitive (15 operations)

Marks operations that contain or expose sensitive data:
- User credential operations (`users.create`, `users.update`)
- API token operations (`users.deleteApiToken`)
- Team membership operations (`teams.addMember`, `teams.removeMember`)
- Access control operations (`teams.grantCustomerAccess`, etc.)

Sensitive operations should be logged carefully, masked in traces, or gated with additional authorization checks.

### idempotent (23 operations)

Marks operations safe to retry without duplicating side effects:
- All `update` operations (PATCH endpoints)
- Idempotent state toggles (e.g., `timesheets.stop`, `timesheets.toggleExport`)
- Team assignment operations (POST with idempotent membership semantics)

Non-idempotent operations (most `create` calls, `restart`, `duplicate`) lack this flag and have empty `retryableStatuses` arrays to prevent accidental duplicate creates.

### requiresApproval (21 operations)

Marks operations requiring explicit user confirmation before execution:
- All 17 destructive operations (deletes)
- Sensitive creates and updates (user creation, credential changes)

Tool wrappers should use dry-run mode first and require explicit confirmation (e.g., `options.confirm === operationName`) before executing these operations.

## Pagination Metadata

The `pagination` field describes how the operation handles multi-page results:

### Paginated Operations

```typescript
{
  mode: 'page',
  vendorDefaultPageSize: 100,
  vendorMaxPageSize: 500
}
```

Applies to:
- `timesheets.list` (GET /api/timesheets)
- `invoices.list` (GET /api/invoices)

These operations accept `page` and `size` query parameters. The primitive methods (`list`, `listAll`, `listPages`) handle paging transparently.

### Non-Paginated Operations

```typescript
{
  mode: 'none'
}
```

Applies to all other list endpoints (activities, customers, projects, users, tags, teams, etc.) and all helpers. These operations return complete result sets in a single request or perform bounded single-page fetches (helpers with limits).

Helpers never walk pages—`search` operations are always bounded single-request fetches with configurable limits (default 25, max 100).

## Resolution Metadata (Helpers Only)

Helper operations (`kind: 'helper'`) with resolution semantics include detailed resolution metadata:

```typescript
{
  resolution: {
    basis: 'server-filter',  // or 'direct', 'client-scan', 'workflow'
    maxScanRecords: 500,
    maxScanPages: 1
  }
}
```

### Resolution Bases

- **`direct`**: Not used in `resolution` field (direct ID lookups don't scan). The identifier is a direct fetch via `get(id)`.

- **`server-filter`**: Most `resolve` helpers. One bounded server-side filtered request (e.g., `GET /api/activities?name=<value>&size=500`), followed by an exact match filter. Used by activities, customers, projects, timesheets (for begin-based resolution), invoices.

- **`client-scan`**: Used by tags and users `resolve` helpers. Composite fetch of the full list (or one page of 500), followed by client-side exact match. Required when the vendor provides no server-side filter for the business key.

- **`workflow`**: Used only by `getContext` helpers (not `resolve`). Multi-record fetch with bounded concurrency.

### Scan Caps

All resolution operations enforce strict bounds:
- `maxScanRecords: 500` — Never scan more than 500 records per resolution attempt
- `maxScanPages: 1` — Never walk pages during resolution (single-page fetch only)

These caps are uniform across all helpers and prevent unbounded scans. The registry makes the bounds discoverable so tool wrappers can reason about resolution costs.

## Retry Metadata

The `retry` field describes safe retry behavior:

```typescript
{
  retryableStatuses: [429, 500, 502, 503, 504],
  policy: "the transport does not retry; these statuses are safe for a caller to re-issue the same request",
  idempotencySupport: "none"
}
```

### Retryable Statuses

For idempotent operations (reads, idempotent writes), the array includes transient failure statuses:
- `429` (rate limit)
- `500`, `502`, `503`, `504` (server errors)

For non-idempotent writes and all destructive operations, the array is empty—retrying risks duplicate creates or unknown delete outcomes.

### Policy and Idempotency Support

- **Policy**: Always `"the transport does not retry; these statuses are safe for a caller to re-issue the same request"`. The SDK's `FetchTransport` never retries automatically; the registry describes what a caller may safely retry.

- **Idempotency Support**: Always `"none"`. The Kimai API provides no idempotency tokens or headers (like `Idempotency-Key`), so non-idempotent operations cannot be safely retried without application-level deduplication.

## Error Codes

The `errors` array lists stable error codes the operation can emit:

```typescript
errors: [
  "CONFIG_ERROR",           // Local argument refusal (KimaiConfigError)
  "NOT_FOUND",             // 404 from vendor (NotFoundError)
  "RESOLUTION_AMBIGUOUS",  // Multiple exact matches (helpers only)
  "RESOLUTION_TRUNCATED",  // Scan cap reached (helpers only)
  "BAD_REQUEST",           // 400 (BadRequestError)
  "RATE_LIMITED",          // 429 (RateLimitError)
  "SERVER_ERROR"           // 5xx (ServerError)
]
```

The error codes are closed vocabulary values that callers can switch on without parsing error messages. For example:
- All operations can emit `CONFIG_ERROR` (invalid local arguments)
- Operations with an `id` parameter can emit `NOT_FOUND`
- Helpers with `resolve` semantics can emit `RESOLUTION_AMBIGUOUS` and `RESOLUTION_TRUNCATED`
- Mutations can emit `BAD_REQUEST` and `UNPROCESSABLE_ENTITY`

## Metadata Fields

The `metadata` object provides human-readable operation context:

```typescript
metadata: {
  purpose: "Fetch one Timesheet record by id",
  usage: "Read path for timesheets. Primitives return the full typed record.",
  preferredWhen: "You have an exact id. Use search() for filtering, resolve() for identifiers.",
  related: ["timesheets.list", "timesheets.resolve", "timesheets.search"]
}
```

Fields:
- **`purpose`**: One-line description of what the operation does
- **`usage`**: How to use it (parameter expectations, return value notes)
- **`preferredWhen`**: When to use this operation over alternatives (or `null` if no alternatives)
- **`related`**: Array of related operation IDs (alternatives, common workflows)

## Output Schema and Drops

The `outputSchema` field describes the return type and honestly names dropped fields for compact helpers:

```typescript
// Primitive: full record, no drops
{
  type: "TimesheetEntity",
  drops: []
}

// Helper (compact summary): drops verbose fields
{
  type: "TimesheetSummary",
  drops: ["internalRate", "fixedRate", "hourlyRate", "metaFields"]
}

// Helper with expand option: documents compact default
{
  type: "TimesheetSummary | Timesheet (expand: true)",
  drops: ["internalRate", "fixedRate", "hourlyRate", "metaFields"]
}
```

The `drops` array names exactly which fields are excluded from the compact summary. Tool builders can use this to reason about what data is available in default vs. expanded mode.

## Compact Field

The `compact` field names the compact summary type for helpers that project compact records by default:

```typescript
// Helper with compact projection
{
  id: "timesheets.resolve",
  compact: "TimesheetSummary",
  outputSchema: {
    type: "TimesheetSummary",
    drops: ["internalRate", "fixedRate", "hourlyRate", "metaFields"]
  }
}

// Primitive (no compact projection)
{
  id: "timesheets.get",
  compact: null,
  outputSchema: {
    type: "TimesheetEntity",
    drops: []
  }
}
```

This field enables tool wrappers to discover which operations support `expand: true` to retrieve full records.

## Staleness Tracking

The `staleCheck` block pins content hashes at build time to detect drift:

```typescript
{
  planHash: "0a9ecbf5c82bb9bf3a815b1302cef982b94d2712330f83b8a4ca93adfa8aa0f8",
  sourceFile: "src/resources/TimesheetClient.ts",
  sourceHash: "a3f2b8c...",  // SHA-256 of implementing file
  testFiles: ["test/resources/timesheets.test.ts"],
  testHash: "b4e9d1c..."      // SHA-256 of concatenated test files
}
```

The `capabilities:check` gate compares these hashes to current source/test file contents and fails if:
1. The plan hash changed but the registry wasn't rebuilt
2. Source or test files changed but the operation status is still `tested` with stale hashes
3. The registry module content doesn't match a fresh re-render (detects hand edits)

This prevents the registry from drifting out of sync with the codebase.

## Generation Pipeline

### 1. Derive Plan (derive-plan.mjs)

Reads `api-docs.json` (Kimai OpenAPI spec) and the source tree to generate `capabilities.plan.json`:

- **Derivable columns**: Resource, operation, endpoint, kind, inputSchema, outputSchema (inferred from primitives)
- **Preserved columns**: Helper metadata, helperBasis, helperRationale, flags, metadata, compact, resolution, errors, tests (human judgement)

The script is idempotent: re-running with unchanged inputs produces byte-identical output (generatedAt advances only when derived content changes). Judgement columns are never wiped.

### 2. Generate Registry (generate-capabilities.mjs)

Reads `capabilities.plan.json` and generates:
- `capabilities.json` (JSON registry)
- `src/capabilities.ts` (TypeScript module with zero imports)

Each group gets a `planHash` (SHA-256 of plan rows for that resource) and `builtAt` timestamp. The script computes source/test hashes and embeds them in `staleCheck` blocks.

### 3. Project Tools (project-mcp-tools.mjs)

Projects the registry into `MCP_TOOL_MANIFEST.md` (human-readable tool surface). The `mcp:project:check` gate fails on drift between the manifest and the registry.

### 4. Build MCP Catalog (build-tool-catalog.mjs)

Generates the machine-readable MCP catalog:
- `MCP_TOOL_CATALOG.json` (JSON catalog with CORE profile + META specs)
- `src/mcp/catalog.generated.ts` (compiled module)

The `catalog:check` gate fails on stale catalogs (catalog must equal re-build).

## Capability Gates

Gates run as part of `npm run verify`:

| Gate | Script | Purpose |
|------|--------|---------|
| `capabilities:check` | `scripts/check-capabilities.mjs` | Row coverage (registry ⇄ plan), mutation safety, staleness (plan/source/test hashes, registry = re-render) |
| `capabilities:check:fixture` | `scripts/check-negative-fixture.mjs` | Proves the gate can fail (negative fixture) |
| `capabilities:check --ship` | `scripts/check-capabilities.mjs --ship` | Ship gate: no rows left `planned` or `implemented` (all must be `tested`) |
| `catalog:check` | `scripts/build-tool-catalog.mjs --check` | Fails on stale MCP catalog |
| `mcp:project:check` | `scripts/project-mcp-tools.mjs --check` | Fails on tool manifest drift |

These gates ensure:
1. The registry stays synchronized with the plan and codebase
2. No operation can be marked `tested` without actual tests
3. No hand edits to generated artifacts go undetected
4. All tool projections reflect the current registry state
