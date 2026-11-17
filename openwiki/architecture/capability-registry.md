---
type: architecture
title: Capability Registry and Generation Pipeline
description: How the machine-readable capability registry (capabilities.json and src/capabilities.ts) is derived from the API spec and plan, what each record contains, and which scripts gate drift.
tags: [capabilities, registry, codegen, drift-gate]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-3383a16d78dafb1db01162a3
    resource: repo://scripts/check-capabilities.mjs
  - id: openwiki-source-0843d00131b708e8c127a8c9
    resource: repo://scripts/check-negative-fixture.mjs
  - id: openwiki-source-f98a78ef91839fd28ee0944e
    resource: repo://scripts/generate-capabilities.mjs
  - id: openwiki-source-5f756d8f8026524d463c79db
    resource: repo://src/capabilities.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Capability Registry and Generation Pipeline

The registry describes every SDK operation (for example `timesheets.stop`) as data: its effect, flags, dry-run support, input schema, pagination, retry and error metadata. It is the single source that the invoke layer ([operations-invoke.md](operations-invoke.md)) and the MCP catalog ([mcp-catalog-and-dispatch.md](mcp-catalog-and-dispatch.md)) read from. The typed methods it describes live in [resource-clients.md](resource-clients.md).

## Pipeline

1. `scripts/derive-plan.mjs` derives `capabilities.plan.json` from `api-docs.json` plus the source tree. It fills only the derivable columns. Judgement columns such as helper, flags, metadata, compact, resolution, staleCheck, redaction, errors and tests are preserved verbatim on every re-run, and the script is idempotent (`scripts/derive-plan.mjs` header).
2. `scripts/generate-capabilities.mjs` (`npm run capabilities:build`) turns plan rows that are implemented or tested into records. It writes the `capabilities.json` group sections, regenerates `src/capabilities.ts` and writes `capabilities.schema.json`.
3. `scripts/check-capabilities.mjs` (`npm run capabilities:check`) is the gate. `scripts/check-negative-fixture.mjs` proves the gate fails on drifted input.

`src/capabilities.ts` has zero imports so the `./capabilities` subpath stands alone. Everything between its `[GENERATED:CAPABILITIES:START]` and `END` markers is generated and must not be hand-edited.

## Record shape

A `CapabilityRecord` (`src/capabilities.ts`) carries:

- `id` (`resource.operation`), `resource`, `operation`, `kind` (`primitive` for endpoint methods, `helper` for the agent layer) and `endpoint`.
- `effect`: `read`, `write` or `destructive`. `flags` is a list drawn from sensitive, idempotent and requiresApproval. `dryRun` says whether the operation supports a dry run.
- `inputSchema`: a map of argument name to `{ type, required, description }`. Key order is the typed method's positional order, which the invoke layer relies on.
- `outputSchema` (with the fields a compact helper drops), `examples`, `permissions`, `pagination` (either `page` with vendor default and maximum page size, or `none`), `resolution` (helpers only), `retry`, `errors`, `compact`, `status` and `tests`.
- `staleCheck`: the plan hash, source file and hash, and test files and hash pinned at build time.

Derived exports are `CAPABILITY_GROUPS`, `CAPABILITIES`, `CAPABILITY_PLAN_HASHES`, `getCapability(id)`, `CAPABILITY_NAMES`, and the `READ_OPERATIONS`, `WRITE_OPERATIONS` and `DESTRUCTIVE_OPERATIONS` lists. All are computed from the records, never hand-maintained.

The retry metadata only states which statuses a caller may safely re-issue. The transport itself does not retry (see [client-and-transport.md](client-and-transport.md)).

## Drift gating

`runCheck` in `scripts/check-capabilities.mjs` runs rule groups tagged `[registry-section]`, `[row-coverage]`, `[mutation-safety]`, `[judgement]`, `[metadata]`, `[test-rows]`, `[staleness]` and `[ship]`:

- A mutation must declare an effect and `dryRun: true`.
- Every plan row must carry every key in `ROW_KEYS`. Effects, statuses, helper bases and redaction values are checked against closed sets.
- Staleness compares each section's `planHash` with the SHA-256 of the plan file bytes. It also compares per-record source and test hashes, and checks that `src/capabilities.ts` equals a fresh re-render of `capabilities.json` once timestamps are normalised. A hand-edited registry therefore fails.
- `--ship` additionally fails if any row remains planned or only implemented.

`runCheck` takes injectable file reads. `check-negative-fixture.mjs` spawns the checker with the `--plan` and `--registry` overrides, once against `test/__fixtures__/capabilities.plan.drifted.json` and once against a temporary copy of `src/capabilities.ts` with one `dryRun` flipped. It exits non-zero if the gate passes on either, so a toothless gate is itself a failure. The drifted plan must also produce at least 5 failures across at least 4 distinct rules, and the tampered registry must trip a `[staleness]` rule.

The catalog derived from the registry is built by a separate script, described in [mcp-catalog-and-dispatch.md](mcp-catalog-and-dispatch.md). The order of these gates in the full verify run is owned by [../operations/build-verify-release.md](../operations/build-verify-release.md).
