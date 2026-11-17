---
type: architecture
title: MCP Catalog, Dispatcher and Untrusted Content
description: The generated node-kimai/mcp catalog (CORE and META tools, per-operation rows, refusals, bounded catalog paging), the effect-checking dispatchOperation, and the untrusted-content wrapping helpers a host applies to tool results.
tags: [mcp, catalog, dispatch, untrusted-content]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-624810923dc7b93d871b0100
    resource: repo://scripts/build-tool-catalog.mjs
  - id: openwiki-source-597d7a9224b67175b07a381d
    resource: repo://src/mcp/catalog.generated.ts
  - id: openwiki-source-2bb161f694b382fe3394e16a
    resource: repo://src/mcp/dispatch.ts
  - id: openwiki-source-dea860c46d1e849461146036
    resource: repo://src/untrusted.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# MCP Catalog, Dispatcher and Untrusted Content

The SDK does not ship an MCP server. It ships the data and helpers a host needs to build one, as the `node-kimai/mcp` and `node-kimai/untrusted` subpaths. Neither has an MCP runtime dependency (`src/mcp/index.ts`).

## Generated catalog

`src/mcp/catalog.generated.ts` is written by `scripts/build-tool-catalog.mjs` from `capabilities.json` and `MCP_TOOL_OVERRIDES.json` (see [capability-registry.md](capability-registry.md)). It also writes `MCP_TOOL_CATALOG.json`. The projection rules live in `scripts/project-mcp-tools.mjs`. Do not hand-edit the generated file. `npm run catalog:check` fails when the file on disk differs from what the script would write, or when a registry operation is neither reachable nor explicitly refused. `CATALOG_PLAN_HASH` records the registry plan hash it was built from.

Contents:

- `CATALOG` has one row per registry operation. A row carries `op`, `tool` (the dedicated tool, or `null`), summary, `when` guidance, `effect`, `requires`, `dry_run`, `confirm_required` and `reachable`. An operation with no dedicated tool is still discoverable and callable through the dispatch tools.
- `CORE_TOOLS` is the always-present profile: `kimai_catalog`, `kimai_describe`, `kimai_read`, `kimai_write`, `kimai_delete`, `kimai_get_current_user`, `kimai_search_timesheets`, `kimai_search_customers`, `kimai_search_projects` and `kimai_get_week_status`. `CORE_RULE` records the requirements it implements. Writes are not in the core and are reached through `kimai_write` and `kimai_delete`.
- `META_TOOLS` are the five meta tools (catalog, describe, read, write, delete), with descriptions owned by the projection. `TOOL_DESCRIPTIONS` and `TOOL_TEXT_OVERRIDES` carry the served text, and `SERVED_TEXT_RULE` states how it is composed. `test/mcp-served-text-single-source.test.ts` runs the real generator to assert an overridden tool's text appears once, with no re-appended bounds line.
- `EXPOSED` maps an operation to its dedicated tool. `DISPATCH_OPERATIONS` lists, per effect, the operations each dispatch tool accepts. `CONFIRM_REQUIRED_OPERATIONS` lists those needing a confirmation string.
- `REFUSALS` lists operations the dispatch tools will not serve. The only entry is `invoices.download`, refused because it returns bytes, which are not an MCP tool result.
- `INPUT_CONTRACTS` holds one closed JSON-schema contract per operation. `kimaiDispatchInputSchema(effect)` builds the `kimai_read`, `kimai_write` or `kimai_delete` input schema from them, with a `oneOf` branch per operation. A confirm-required branch requires `confirm` to equal the operation key.

### Catalog paging

`catalogPage` returns totals (total, reachable, unexposed and unreachable operations) plus a filtered, offset-based page. Filters are ANDed: `effect`, `resource`, and `unexposed_only`, which keeps only reachable operations with no dedicated tool. The default `limit` is `DEFAULT_CATALOG_LIMIT` (40) and the hard maximum is `MAX_CATALOG_LIMIT` (100). A `limit` outside 1 to the maximum, or a negative or non-integer `offset`, throws a config error rather than being clamped. Lookup helpers `catalogRow`, `requireCatalogRow` and `nearestKeys` use exact keys. An unknown key is refused with the nearest keys named, with no fuzzy matching. `describeOperation` and `inputFields` build the describe view from a registry record the host passes in.

## dispatchOperation

`dispatchOperation(client, effect, operation, input, options)` in `src/mcp/dispatch.ts` adds only an effect boundary. It throws `KimaiConfigError` with code `DISPATCHER_EFFECT` before any request when:

- `effect` is not `read`, `write` or `destructive`, or
- the operation's registry effect differs from the dispatcher's `effect` (or the record is a dispatcher record).

An unknown operation key passes this check and is refused later by the invoke layer. Everything else, namely exact-key lookup, the `REFUSALS` check, closed-input validation, dry-run-first writes and the confirm gate, is delegated to `invokeOperation` and is owned by [operations-invoke.md](operations-invoke.md). The code states the design rule: never add a second write governor. `test/mcp-dispatch.test.ts` pins that refusals are identical to `invokeOperation`'s and that none touches the network.

## Untrusted content

`src/untrusted.ts` has zero imports and is applied only in the projection layer. SDK methods keep returning raw values.

- `wrapUntrusted` wraps a string in `<untrusted_content>...</untrusted_content>`. It first neutralises literal open and close tags inside the text with a `<`-style escaped spelling, so a value cannot forge the boundary. It returns `undefined` (leave alone) for non-strings, the empty string and the `[REDACTED]` marker. An exactly wrapped value is returned as is, so wrapping is idempotent.
- `markUntrusted` wraps named fields of one plain record and returns a copy. `deepMarkUntrusted` does this recursively through arrays and plain objects, for paged envelopes and dry-run envelopes that echo a body.
- `stripUntrustedWrapper` and `stripUntrustedDeep` remove one exact outer wrapper from strings, for echoed values on writes and filter arguments, and leave the inner text untouched.
- The module never truncates. The caller truncates before wrapping.
