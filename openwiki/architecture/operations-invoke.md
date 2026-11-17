---
type: architecture
title: Registry-Validated Invoke (node-kimai/operations)
description: How invokeOperation and planInvoke resolve a registry key, validate input against a closed contract, apply dry-run-first and confirmation governance, and dispatch to the typed resource client method.
tags: [operations, invoke, governance, dry-run]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-57654feffcadb412ceb349ac
    resource: repo://src/operations/invoke.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Registry-Validated Invoke

`src/operations/invoke.ts`, exported from `node-kimai/operations`, is the one generic call path from a canonical registry key (for example `timesheets.search`) to the typed method on `ApiClient`. It has no MCP types and owns no transport, retries or pagination. The MCP dispatcher ([mcp-catalog-and-dispatch.md](mcp-catalog-and-dispatch.md)) only adds an effect check and delegates here. This is the only place validation and write governance live.

The data it reads comes from the registry ([capability-registry.md](capability-registry.md)) and from the generated catalog's `INPUT_CONTRACTS` and `REFUSALS`. The methods it ends up calling, including their `{ dryRun }` behaviour, are described in [resource-clients.md](resource-clients.md).

## Order of operations

`invokeOperation(client, operation, input = {}, options = {})`:

1. **Resolve.** `resolveOperation` requires a non-empty string and an exact `getCapability` hit. Otherwise it throws `UNKNOWN_OPERATION` naming the five nearest keys. Keys are never fuzzy-matched and are never method names.
2. **Refusals.** If the key is in the catalog's `REFUSALS`, it throws `UNREACHABLE_OPERATION` with the reason and any alternative.
3. **Plan.** `planInvoke` runs the remaining steps with no request.
4. **Dispatch.** It calls the resolved method with the plan's positional arguments.
5. **Backstop.** If the result is an async iterable, it refuses (see below).

`planInvoke` is exported on its own and returns an `InvokePlan`: operation, effect, `execute`, `dryRunSupported`, `dryRun`, target `{ resource, method }`, `args`, `checks` and an `impact` summary. Its internal order is:

1. Resolve the target method, so registry-versus-implementation drift is a refusal even when only planning.
2. Refuse streaming operations.
3. Validate input.
4. Check `confirm`, then governance by effect.

## Refusal codes

`REFUSAL_CODES` has four entries: `UNKNOWN_OPERATION`, `UNREACHABLE_OPERATION`, `INVALID_INPUT` (whose value is `CONFIG_ERROR`) and `DISPATCHER_EFFECT`. Every refusal is a `KimaiConfigError` ([errors.md](errors.md)) carrying `operation`, `code` and usually a `suggestedAction`, thrown before any request. Input-validation messages name keys and paths, never input values. The one exception is the `confirm` mismatch message, which quotes the supplied `confirm` string.

## Input validation

`validateInvokeInput` checks the caller's input against the operation's closed contract:

- No contract for the operation means a refusal, not a pass.
- Input must be an object, `null` or `undefined`.
- Unknown keys are refused. The message lists the valid keys and, where a close match exists, suggests one (exact, prefix or substring match, case-insensitive). `unknownKeysRefusal` is exported for reuse.
- Every key in the contract's `required` list must be present.
- Any key matching `id`, `*Id` or `*_id` must be a safe positive integer. An `identifier` that is a number, or an object with an `id`, must be a positive integer too.
- Value types are not enforced. The contract's `type` keyword renders a named TypeScript type as `object`, so enforcing it would wrongly refuse legitimate string unions. Typing is left to the typed method.
- Keys such as `dry_run` and `confirm` are not part of the contract and are refused. They belong in `InvokeOptions`.

## Governance

- **Confirmation.** `needsConfirmation` is true for a `destructive` effect or a `requiresApproval` flag. If `confirm` is present it must equal the operation key exactly, and a mismatch is refused for any effect. A write or destructive operation that needs confirmation is refused without a matching `confirm`.
- **Reads.** `dryRun: true` is refused, because a read has no dry run.
- **Writes and destructive operations.** These are dry-run-first. Only an explicit `dryRun: false` executes. Otherwise the typed method is called with `{ dryRun: true }`, which returns a `DryRunResult` and issues no wire call. A write whose record has `dryRun !== true` or no `opts` argument is refused as not invocable, because the dispatcher cannot force it through a dry-run path.
- **Arguments.** `buildArgs` follows the registry `inputSchema` key order and maps the contract fields to positional arguments. For reads, the `opts` argument carries only `limit`, `expand` and `resolution_details` (as `resolutionDetails`) when declared and supplied. For writes it is `{ dryRun }`.
- **`impact`.** `reversible` is false only for destructive operations.

## Streaming refusal

Operations named `list` or `listPages` return async iterables. The invoke path refuses them with a request-free `CONFIG_ERROR`, because it is request-scoped and owns no pagination, and a serialised iterator would be `{}`. The message points at the resource's `search` operation, or at `listAll` if there is none. An async iterable returned by any other method is refused the same way after the call.

## Target resolution

`resolveInvokeTarget` maps the registry `resource` to the client property (`approval_bundle` becomes `approvalBundle`) and the `operation` to a method. A missing resource or method is a `CONFIG_ERROR` that names the drift. It is never a `TypeError` at the call site.

Tests: `test/operations/invoke.test.ts` covers this flow, and `test/mcp-dispatch.test.ts` pins that the dispatcher adds no second validation path.
