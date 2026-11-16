---
type: Feature
title: MCP Tool Catalog and Dispatcher
description: MCP tool catalog generation, CATALOG/CORE_TOOLS/META_TOOLS exports, dispatchOperation effect-split boundary (read/write/destructive), and single-source projection from the registry
tags: [mcp, tools, catalog, dispatch, projection]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-bc17b30ef11b3d3a13a576ef
    resource: repo://MCP_TOOL_MANIFEST.md
  - id: openwiki-source-2bb161f694b382fe3394e16a
    resource: repo://src/mcp/dispatch.ts
  - id: openwiki-source-55cdb8797078963448305728
    resource: repo://src/mcp/index.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# MCP Tool Catalog and Dispatcher

## Overview

The MCP integration provides a generated tool catalog and dispatcher that enables MCP servers to expose the SDK's operations as tools. The catalog is a machine-readable projection of the capability registry, ensuring tool descriptions, input schemas, and classifications stay synchronized with the codebase.

The integration uses a **progressive disclosure** strategy: a curated always-on core of 10 tools handles common workflows, while 103 catalog entries make every other registry operation discoverable through dispatch meta-tools.

## Projection Summary

From the 108-operation capability registry:

- **Projected tools**: 92 (90 after curation exclusions)
- **Always-on core tier**: 10 tools (5 registry-backed + 5 META)
- **Catalog entries**: 103 (every non-core registry operation)
- **Excluded operations**: 18 total
  - 1 binary/download (GET /api/invoices/{id}/download)
  - 15 subsumed read primitives (covered by helpers—see Subsumption Rules below)
  - 2 excluded by manual curation

## Progressive Disclosure Strategy

The 90-tool projected surface exceeds the ~10-tool threshold for flat exposure, triggering progressive disclosure. This strategy satisfies five required properties:

### 1. Reachability

A capability with no dedicated tool is invoked through effect-split dispatch:
- `kimai_read` (effect: `read`) — read-only operations
- `kimai_write` (effect: `write`) — write operations, dry-run first
- `kimai_delete` (effect: `destructive`) — destructive operations, confirmation required

Dispatch input is validated against the registry record's `inputSchema` before the SDK call. An argument the record does not declare is refused with a typed `CONFIG_ERROR`, never forwarded.

### 2. Honesty

Every registry operation is either in the core or listed in the catalog with its name, purpose, and `preferredWhen` guidance. An agent can discover a capability exists and how to reach it instead of concluding the SDK cannot do it.

### 3. Core Set by Evidence

The written `CORE_RULE` (R1–R5) below, computed by the projection, produces the core list deterministically. Two people applying the rule get the same core:

- **R1**: The five META tools (catalog/describe/read/write/delete) — the discovery and dispatch mechanism
- **R2**: Identify the API-key owner (`users.getMe`)
- **R3**: Discovery tools are R1 (catalog + describe). The Kimai registry has no cross-resource resolve/searchAcrossResources operation.
- **R4**: One bounded helper-tier read per workflow resource (`timesheets.search`, `customers.search`, `projects.search`; `approvalBundle.weekStatus` for approval workflows)
- **R5**: Writes are NOT in the core—they're reachable through `kimai_write`/`kimai_delete`, dry-run first, destructive calls confirmation-gated

### 4. No God-Tool

The catalog/dispatch pair is a FALLBACK behind the described core. The core alone completes common read work (identity, bounded search per workflow resource). A single unvalidated `operation` dispatcher is never the only tool.

### 5. Drift Protection

The catalog and manifest are generated from `capabilities.json`. The `mcp:project:check` gate fails when:
- A registry operation is in neither the core nor the catalog
- The manifest differs from a fresh projection

## MCP Subpath Exports

The `./mcp` subpath (`src/mcp/index.ts`) exports the catalog and dispatcher:

```typescript
// Catalog data (from catalog.generated.ts)
export const CATALOG: CatalogRow[];
export const CATALOG_PLAN_HASH: string;
export const CORE_TOOLS: MetaToolSpec[];
export const META_TOOLS: MetaToolSpec[];
export const DISPATCH_OPERATIONS: string[];
export const CONFIRM_REQUIRED_OPERATIONS: string[];
export const EXPOSED: Set<string>;
export const TOOL_DESCRIPTIONS: Record<string, string>;
export const TOOL_TEXT_OVERRIDES: Record<string, string>;
export const INPUT_CONTRACTS: Record<string, InputContract>;
export const DEFAULT_CATALOG_LIMIT: number;      // 40
export const MAX_CATALOG_LIMIT: number;          // 100
export const REFUSALS: Record<string, string>;
export const CORE_RULE: string;
export const SERVED_TEXT_RULE: string;

// Catalog helpers (from catalog.generated.ts)
export function catalogPage(options: CatalogPageOptions): CatalogRow[];
export function catalogRow(operation: string): CatalogRow | undefined;
export function describeOperation(operation: string): OperationDescription;
export function inputFields(operation: string): Record<string, ReflexiveField>;
export function nearestKeys(key: string, limit?: number): string[];
export function requireCatalogRow(operation: string): CatalogRow;
export function kimaiDispatchInputSchema(): InputJsonSchema;

// Dispatcher (from dispatch.ts)
export function dispatchOperation(
  client: ApiClient,
  effect: 'read' | 'write' | 'destructive',
  operation: string,
  input?: Record<string, unknown>,
  options?: InvokeOptions
): Promise<unknown>;
```

## Catalog Structure

### CatalogRow

Each catalog entry describes one non-core operation:

```typescript
interface CatalogRow {
  operation: string;        // e.g., 'timesheets.resolve'
  resource: string;         // e.g., 'timesheets'
  kind: 'primitive' | 'helper';
  effect: 'read' | 'write' | 'destructive';
  flags: string[];          // 'sensitive', 'idempotent', 'requiresApproval'
  dryRun: boolean;
  tool: string | null;      // Dedicated tool name or null
  summary: string;          // One-line operation purpose
  when: string | null;      // When to use this operation vs. alternatives
  requiredArgs: string[];   // Required input field names
  optionalArgs: string[];   // Optional input field names
}
```

### MetaToolSpec

The five META tools (catalog, describe, read, write, delete) have detailed specs:

```typescript
interface MetaToolSpec {
  name: string;
  backingOperation: string | null;
  rule: string;             // Core rule reference (e.g., 'R1', 'R2')
  effect: 'meta' | 'read' | 'write' | 'destructive';
  description: string;
  inputSchema: Record<string, InputFieldSpec>;
  annotations: string[];    // 'readOnlyHint', 'idempotentHint', etc.
}
```

## Effect-Split Dispatcher

The `dispatchOperation` function enforces an exact effect boundary before delegating to the SDK's governance layer.

### Dispatch Signature

```typescript
async function dispatchOperation(
  client: ApiClient,
  effect: 'read' | 'write' | 'destructive',
  operation: string,
  input: Record<string, unknown> = {},
  options: InvokeOptions = {}
): Promise<unknown>
```

### Effect Boundary Enforcement

The dispatcher refuses with a typed `CONFIG_ERROR` (zero wire activity) when:

1. `effect` is not one of `'read'`, `'write'`, `'destructive'`
2. The operation's registry effect differs from the requested `effect`
3. The operation is a dispatcher record itself (operations with `kind: 'dispatcher'`)

```typescript
// Valid dispatch: effect matches registry
await dispatchOperation(client, 'read', 'timesheets.search', { limit: 10 });

// Error: DISPATCHER_EFFECT — timesheets.create has effect 'write'
await dispatchOperation(client, 'read', 'timesheets.create', { ... });

// Error: DISPATCHER_EFFECT — unknown effect
await dispatchOperation(client, 'update', 'timesheets.update', { ... });
```

### Delegation to invokeOperation

After enforcing the effect boundary, `dispatchOperation` delegates all other validation and governance to `invokeOperation` from `node-kimai/operations`:

- **Unknown key lookup**: `invokeOperation` checks the operation exists and suggests nearest keys
- **Unreachable operation refusal**: Streaming operations are refused with bounded alternatives named
- **Closed input contract**: Unknown input fields are refused before dispatch
- **Dry-run governance**: Writes default to dry-run; `dryRun: false` required for execution
- **Confirmation gate**: Destructive operations require `confirm === operationName`

This ensures validation and governance live in exactly ONE place—the SDK's `operations.invoke`—not duplicated in the dispatcher. A second implementation would be a second chance to be wrong.

## Core Tools

The always-on core consists of 10 tools split into two groups:

### META Tools (5)

1. **`kimai_catalog`** — List capabilities with their tool (if any), effect, dry-run/confirm requirements, and arguments. Bounded: limit defaults to 40, max 100. Filters: effect, resource, unexposed_only.

2. **`kimai_describe`** — Return the full input schema, effect, flags, dry-run support, error vocabulary, related operations, and preferredWhen guidance for ONE registry operation. Takes canonical operation key (e.g., "timesheets.search"), never a tool name.

3. **`kimai_read`** — Execute effect `read` operations by canonical registry key. Closed per-operation input contract. Prefer dedicated search/resolve tools where they exist.

4. **`kimai_write`** — Execute effect `write` operations by canonical registry key. Defaults to dry-run preview; `dry_run: false` executes. Closed input contract. Refuses destructive operations.

5. **`kimai_delete`** — Execute effect `destructive` operations by canonical registry key. Requires `confirm` equal to operation key. Closed input contract.

### Registry-Backed Core Tools (5)

6. **`kimai_get_current_user`** (`users.getMe`) — Get the API key owner's user record (id, name, preferences). Use when you need "my" user id without searching.

7. **`kimai_search_timesheets`** (`timesheets.search`) — Search timesheets with spec filters, bounded by explicit limit (default 25, max 100). Without a user filter, passes `user=all`. Compact TimesheetSummary by default; `expand: true` for full records.

8. **`kimai_search_customers`** (`customers.search`) — Search customers with spec filters, bounded by limit (default 25, max 100). Compact CustomerSummary by default; `expand: true` for full records.

9. **`kimai_search_projects`** (`projects.search`) — Search projects with spec filters, bounded by limit (default 25, max 100). Compact ProjectSummary by default; `expand: true` for full records.

10. **`kimai_get_week_status`** (`approvalBundle.weekStatus`) — Get approval status of one calendar week for a user: whether approved, timesheet count, total duration. Pass ISO date (YYYY-MM-DD); omit `user` for API-key owner.

## Subsumption Rules

The projection excludes 15 read primitives that are subsumed by helpers:

- **`<resource>.get(id)`** subsumed by **`<resource>.resolve(identifier)`** when the helper exists (activities, customers, projects, timesheets, invoices, users, tags, teams)
- **`<resource>.list()`** / **`<resource>.listAll()`** subsumed by **`<resource>.search(params)`** when the helper exists

For example:
- `timesheets.get(42)` is covered by `timesheets.resolve(42)`—the helper accepts bare IDs and also supports name/begin-based resolution
- `customers.listAll()` is covered by `customers.search()`—the helper provides bounded filtering with the same spec filters

This prevents redundant tools in the core while ensuring all functionality remains reachable.

## Served Text Rules

Tool descriptions follow a composition rule (mirrored in `SERVED_TEXT_RULE` from `node-kimai/mcp`):

1. **Curated description**: A dedicated tool with a curated `description` in `MCP_TOOL_OVERRIDES.json` serves that text verbatim—it is the single source. No mechanical bounds sentence is appended to curated text.

2. **Generated description**: A tool without an override serves:
   - Registry `metadata.purpose`
   - `metadata.usage` (when present and different from purpose)
   - Mechanical bounds sentence derived from effect, flags, pagination, resolution, and compact settings

3. **Catalog rows**:
   - `summary`: Curated `summary` override or registry purpose
   - `when`: Curated `when` override or registry `preferredWhen`

4. **Input contracts**:
   - `paramDescription`: Curated `paramDescription` override or registry field description

The curated texts of all 66 overridden tools are exported as `TOOL_TEXT_OVERRIDES` and mirrored in `MCP_TOOL_CATALOG.json`, so a server serves the curated text from the subpath alone—no server-side override table needed.

## Input Contracts

The dispatcher enforces closed per-operation input contracts. Each operation's `INPUT_CONTRACTS` entry defines exactly which fields are accepted:

```typescript
INPUT_CONTRACTS['timesheets.search'] = {
  operation: 'timesheets.search',
  fields: {
    user: { type: 'string | number', required: false, description: '...' },
    users: { type: 'number[]', required: false, description: '...' },
    begin: { type: 'string', required: false, description: '...' },
    end: { type: 'string', required: false, description: '...' },
    limit: { type: 'number', required: false, description: '...' },
    expand: { type: 'boolean', required: false, description: '...' },
    // ... all declared fields
  },
  requiredFields: [],
  optionalFields: ['user', 'users', 'begin', 'end', 'limit', 'expand', ...]
}
```

An input field not in the contract is refused with `CONFIG_ERROR` before any SDK call, preventing typos and malformed requests from reaching the wire.

## Catalog Helpers

### catalogPage

Retrieve one page of catalog rows with filters:

```typescript
interface CatalogPageOptions {
  limit?: number;        // Default 40, max 100
  offset?: number;       // For paging
  effect?: string;       // Filter: 'read' | 'write' | 'destructive'
  resource?: string;     // Filter: 'timesheets', 'customers', etc.
  unexposed_only?: boolean;  // true = only operations with no dedicated tool
}

const page = catalogPage({ effect: 'write', limit: 20 });
```

### describeOperation

Get the full operation description including input schema, effect, flags, error codes, and related operations:

```typescript
const desc = describeOperation('timesheets.search');
// desc: OperationDescription = {
//   operation: 'timesheets.search',
//   effect: 'read',
//   flags: [],
//   dryRun: false,
//   inputSchema: { ... },
//   outputSchema: { type: 'TimesheetSummary[]', drops: [...] },
//   errors: ['CONFIG_ERROR', 'NOT_FOUND', ...],
//   metadata: { purpose: '...', usage: '...', preferredWhen: '...', related: [...] },
//   resolution: { basis: 'server-filter', maxScanRecords: 500, maxScanPages: 1 },
//   compact: 'TimesheetSummary'
// }
```

### nearestKeys

Find the nearest catalog keys when an unknown operation is requested:

```typescript
const nearest = nearestKeys('timesheet.search', 3);
// nearest: ['timesheets.search', 'timesheets.resolve', 'timesheets.getContext']
```

Used by the dispatcher to provide helpful error messages with suggested corrections.

## MCP Server Integration

A host integrating this catalog:

1. **tools/list**: Project `CORE_TOOLS` plus selected `CATALOG` rows into MCP tool specs. Each spec's input schema is `INPUT_CONTRACTS[operation]`, description is `TOOL_DESCRIPTIONS[operation]`.

2. **tools/call**: For core tools, resolve the backing operation (if any) through `getCapability(op)` and call `dispatchOperation(client, effect, operation, input, options)`. For catalog operations, call dispatch directly.

3. **Dry-run governance**: Pass `options.dryRun === false` only for live writes. Destructive operations also need `options.confirm === operation`.

4. **Refusals**: Catch `KimaiConfigError` and surface `err.code` from `REFUSALS` (`UNKNOWN_OPERATION`, `UNREACHABLE_OPERATION`, `CONFIG_ERROR`, `DISPATCHER_EFFECT`) rather than parsing messages. Streaming operations are refused with bounded alternatives named.

5. **Untrusted content**: Wrap vendor- or user-sourced text with `./untrusted` helpers (`wrapUntrusted`, `markUntrusted`, `deepMarkUntrusted`) at the boundary before it reaches a prompt.

Example integration patterns are shown in `examples/mcp-usage.ts`.

## Drift Protection Gates

Three gates ensure the catalog stays synchronized:

1. **`mcp:project:check`** (`scripts/project-mcp-tools.mjs --check`): Fails when the manifest differs from a fresh projection or when a registry operation is unreachable (neither core nor catalog).

2. **`catalog:check`** (`scripts/build-tool-catalog.mjs --check`): Fails when `MCP_TOOL_CATALOG.json` or `src/mcp/catalog.generated.ts` are stale (don't match re-build).

3. **`mcp:check-surface`** (`scripts/check-mcp-surface.mjs`): Verifies the served MCP tool surface against requirements.

All three run as part of `npm run verify`, ensuring the tool surface cannot drift from the capability registry.
