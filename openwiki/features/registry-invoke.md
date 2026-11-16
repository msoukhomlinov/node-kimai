---
type: execution-layer
title: Registry-Validated Invoke Layer
description: Generic invoke surface with registry resolution, closed-contract validation, dry-run-first governance, confirmation gates, and effect-boundary dispatch
tags: [agent-execution, validation, governance, registry, mcp]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-2bb161f694b382fe3394e16a
    resource: repo://src/mcp/dispatch.ts
  - id: openwiki-source-dfca8e18c7b151959201776d
    resource: repo://src/operations/index.ts
  - id: openwiki-source-57654feffcadb412ceb349ac
    resource: repo://src/operations/invoke.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Registry-Validated Invoke Layer

The SDK provides a generic, registry-driven invocation surface that validates every operation against its closed input contract before dispatch. This layer enforces dry-run-first writes, confirmation gates for destructive operations, and effect-boundary separation—all without duplicating the typed resource clients' transport, pagination, or business logic.

## Invocation Flow

**invokeOperation(client, operation, input, options)** is the generic entry point. It follows a deterministic sequence:

1. **RESOLVE** — look up the canonical registry key and refuse unknown operations with nearest-key suggestions
2. **VALIDATE** — check input against the operation's closed contract (required fields, declared keys, type constraints)
3. **GOVERN** — enforce dry-run-first writes, confirmation requirements, and streaming refusals
4. **DISPATCH** — call the typed resource client method with validated, ordered arguments

Every refusal throws `KimaiConfigError` with a structured code (`UNKNOWN_OPERATION`, `UNREACHABLE_OPERATION`, `INVALID_INPUT`, `DISPATCHER_EFFECT`) and suggested action. No request is ever issued for a failed validation.

## Closed Input Contracts

Each operation's input contract is served from the generated catalog (`INPUT_CONTRACTS`). The validator enforces:

- **Required fields** — missing required parameters are refused with field paths
- **Closed key set** — unknown keys trigger refusal with nearest-match suggestions
- **Record IDs** — any field matching `/^id$|Id$|_id$/` or named `identifier.id` must be a safe positive integer

The contract keys are closed: extra keys cause immediate refusal, never silent acceptance or clamping. The validator does not enforce complex JSON Schema types (unions, nested objects) because the generated type constraints may misrender TypeScript named types as `object`—value typing is deferred to the typed method receiving the call.

## Dry-Run-First Governance

**All writes run dry by default.** Omitting `dryRun` or passing `dryRun: true` invokes the SDK's dry-run path—zero wire calls, returning `DryRunResult` with `simulated: true`. Only an explicit `dryRun: false` executes the write.

Reads refuse `dryRun: true` (a read has no dry run to run).

Operations without registry-declared dry-run support are not invocable through this layer—they must be called directly via typed methods.

## Confirmation Gate

Destructive operations (or those flagged `requiresApproval`) require `{ confirm: "<operation>" }`. The confirmation string must equal the operation key exactly (no fuzzy matching, no booleans). Without it, the operation is refused before any request.

```typescript
// Refused without exact confirmation
await invokeOperation(client, 'timesheets.delete', { id: 7 });

// Passes confirmation gate, still dry-runs by default
await invokeOperation(client, 'timesheets.delete', { id: 7 }, { confirm: 'timesheets.delete' });

// Executes the delete
await invokeOperation(client, 'timesheets.delete', { id: 7 }, { confirm: 'timesheets.delete', dryRun: false });
```

## Streaming Refusal

Operations returning `AsyncIterable` (list/listPages) are refused before dispatch. The dispatcher is request-scoped and owns no pagination logic—returning the iterator would serialize as `{}`, losing all data. The refusal names the bounded alternative (typically `<resource>.search` or `listAll()`).

This check runs twice: once during planning based on method name (`list`, `listPages`), and again post-dispatch as a backstop for any unexpected streaming result.

## Effect Boundary Dispatch

The MCP layer adds `dispatchOperation(client, effect, operation, input, options)`, which enforces one additional constraint before delegating to `invokeOperation`: the caller-specified `effect` must match the operation's registry effect. Mismatches (e.g., calling a write through the read dispatcher) are refused with `DISPATCHER_EFFECT`.

This boundary ensures the effect-based tool split (kimai_read_operations, kimai_write_operations, kimai_destructive_operations) cannot be bypassed by naming an operation of the wrong effect.

## Planning Without Execution

**planInvoke(client, operation, input, options)** runs the full validation and governance pipeline but stops before dispatch, returning an `InvokePlan`:

```typescript
interface InvokePlan {
  operation: string;
  effect: 'read' | 'write' | 'destructive';
  execute: boolean;              // true for live call, false for dry-run
  dryRunSupported: boolean;
  dryRun: boolean;
  target: { resource: string; method: string };
  args: unknown[];               // positional arguments in registry order
  checks: string[];              // governance checkpoints passed
  impact: { effect, reversible, requiresApproval, flags };
}
```

This enables inspection of the call without touching transport. The target method is resolved during planning (so registry/implementation drift is caught as a refusal, not a late `TypeError`), but no method is invoked.

## Argument Construction

The validator projects the flat input bag into positional arguments matching the typed method's signature, following the registry's declared `inputSchema` order. For reads, an `opts` object is built from declared helper fields (`limit`, `expand`, `resolution_details` → `resolutionDetails`). For writes, `opts` carries only `{ dryRun }`.

A drift error (missing `opts` field, non-existent method) is refused at plan time with `CONFIG_ERROR`.

## Refusal Codes

The layer publishes four structured codes (never values, only keys and paths):

- **UNKNOWN_OPERATION** — registry key not found, with nearest-key suggestions
- **UNREACHABLE_OPERATION** — operation in catalog but marked unreachable by the projection
- **INVALID_INPUT** (CONFIG_ERROR) — validation failure (closed-key violation, missing required, type constraint)
- **DISPATCHER_EFFECT** — effect mismatch between dispatcher and operation

Refusals are deterministic and request-free. Suggested actions guide correction.

## Single Governance Guarantee

Validation and governance live in exactly one place: `src/operations/invoke.ts`. The MCP dispatch layer (`src/mcp/dispatch.ts`) adds only the effect boundary and delegates to `invokeOperation`. There is no second write governor, no retry logic, and no pagination—dispatch calls the same typed resource methods the SDK publishes, inheriting all their guards.
