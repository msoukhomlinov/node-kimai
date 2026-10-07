# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-02

The convergence release on the node-hudu / node-autotask line. It folds in everything that was
staged as `1.1.0` (never published) and lands the breaking API convergence (user decision D2).

### Developer-facing (still part of this unreleased 2.0.0)

- **`npm run verify:pack`** — packs the tarball, asserts every declared entry point is inside it, agrees the
  in-tarball registry hash with `capabilities.json`, installs the tarball into a clean project and imports
  every value subpath in **ESM and CJS** (`./types` is type-only and asserted to resolve). Wired into
  `prepublishOnly` and into CI, because only an install proves a consuming MCP server can import what shipped.
- **Registry effect constants** — the generator now emits `CAPABILITY_NAMES`, `READ_OPERATIONS`,
  `WRITE_OPERATIONS` and `DESTRUCTIVE_OPERATIONS` from the registry (frozen, never hand-written), so a
  consuming server can group or filter operations without re-deriving them.
- **A reference MCP server** (`examples/mcp-server.ts`) that consumes the published surface the way a separate
  server package does: the root guards, `./capabilities`, the `./mcp` catalog plus effect-split dispatch, the
  `./operations` governance path, and `./untrusted` **applied on the result path**.
- **`mcp:project --check-example`** — the projection gate now type-checks that example under its own tsconfig
  and fails if it references any tool name absent from the projection.
- **Recorded deviation — no n8n projection.** `SCOPING.md` names an n8n consumer, but the node is a separate,
  pre-existing package that consumes this SDK only through the injectable transport and never reads the
  registry, so a projection here would have no reader. See `ARCHITECTURE.md` → "Secondary consumer: n8n".

### BREAKING

- **Renamed read primitives.** `getById(id)` is now `get(id)` on every resource that has it.
  The old name is gone; there is no alias.
- **`getAll(params?)` is now `listAll(params?): Promise<T[]>`.** Same behaviour — the complete
  collection — under the new name.
- **`list(params?)` is now a stream, not a page.** It returns `AsyncIterable<T>`: on a paginated
  resource (timesheets, invoices) it walks **every page**; on a non-paginated resource it yields
  the single batch. The old `list()` returned page 1 only, silently.
- **`listPages(params?): AsyncIterable<Page<T>>`** now yields `Page<T>` records instead of
  arrays, for the paginated resources only. `Page<T> = { items, page, size, hasMore }`, where
  `hasMore = items.length === size` (Kimai returns no totals). A consumer that iterated the old
  yielded arrays must read `page.items`.
- Nothing else was removed: every other primitive, type, error class and the 13 resource clients
  keep working. The changes above are the whole breaking set.

### Added

- **Agent execution layer**, additive across all 13 resources — 108 registered operations
  (90 primitives + 18 helpers), every row tested (see ARCHITECTURE.md §15):
  - **Helpers** co-located on the client: `resolve` (id / name / bare id / exact name) and
    `search` for the 8 name-addressable resources, plus `getContext` for the three workflow
    resources (timesheets, customers, projects). Helpers return a compact summary by default;
    `{ expand: true }` returns the full record and `{ resolutionDetails: true }` the
    `Resolution<T>` wrapper.
  - **Bounded resolution**: one page, at most 500 records (`maxScanRecords: 500` /
    `maxScanPages: 1`); several exact matches raise `RESOLUTION_AMBIGUOUS` (candidate ids on
    `resourceIds`), a full page with no exact match raises `RESOLUTION_TRUNCATED` — never a
    silent `null`. Helper `limit` defaults to 25 and is capped at 100; an out-of-range value
    throws instead of being clamped.
  - **Dry-run on every mutation**: `{ dryRun: true }` issues zero wire calls and returns a
    `DryRunResult<T>` (`simulated: true`, `target`, `request`, `checks`, `impact`, `warnings`).
  - **Mutation classification** carried per operation in the registry: `effect`
    (`read` / `write` / `destructive`) and `flags` (`sensitive` / `idempotent` /
    `requiresApproval`).
  - **Structured error contract**: `ApiError.category` (closed vocabulary:
    `auth`, `not_found`, `validation`, `conflict`, `rate_limit`, `server`, `network`, `timeout`,
    `resolution`, `policy`) plus `operation`, `httpStatus`, `retryable`, `vendorError`,
    `resourceIds`, `suggestedAction`, `correlationId` (one per request) and `retryAfter` (parsed
    from `Retry-After`); new `KimaiConfigError` (local argument refusal, zero fetch) and
    `ResolutionError`. All pre-existing fields and classes are unchanged.
  - **Capability plan → registry → emitted artifacts**: `capabilities.plan.json` (derived from
    `api-docs.json` + the source tree, re-runnable and idempotent) → `capabilities.json` +
    `src/capabilities.ts` (zero-import, behind the `./capabilities` subpath), with per-group
    `planHash`/`builtAt` and a stale-check pinning the plan, source and test hashes.
  - **Registry-validated invoke** (`./operations`): `invokeOperation` / `planInvoke` /
    `InvokeOptions` / `unknownKeysRefusal` / `REFUSAL_CODES`. An unknown operation key, an
    unknown input field, a missing confirmation, or a streaming operation is refused before any
    wire call, and a refusal names the bounded alternative. Writes are dry-run-first: only an
    explicit `{ dryRun: false }` executes.
- **MCP support surface**:
  - `./mcp` — the generated tool catalog (`CATALOG`, `CORE_TOOLS`, `META_TOOLS`,
    `TOOL_DESCRIPTIONS`, `describeOperation`) and the effect-split `dispatchOperation`
    (`kimai_read` / `kimai_write` / `kimai_delete`) that delegates to `invokeOperation`.
  - `./untrusted` — `wrapUntrusted` / `markUntrusted` / `deepMarkUntrusted` / `stripUntrustedDeep`
    for marking untrusted content at prompt and transport boundaries.
  - `MCP_TOOL_CATALOG.json` — the machine-readable catalog, projected from the capability
    registry alongside `MCP_TOOL_MANIFEST.md` (`scripts/build-tool-catalog.mjs`,
    `scripts/project-mcp-tools.mjs`; `catalog:check` / `mcp:project:check` fail on drift).
  - `capabilities.json` + `capabilities.schema.json`; the catalog, manifest, overrides and
    capability artifacts all ship in the tarball.
- **Capability gates**: `capabilities:check` (row coverage, mutation safety, judgement/metadata,
  declared test rows, staleness, registry-equals-re-render), `capabilities:check:fixture`
  (negative fixture proving the gate can fail), `--ship` (no row left planned/implemented), and
  `mcp:check-surface`.
- **Published-surface guard** `scripts/public-surface.mjs`: derives the expected subpath set from
  `package.json` + `tsup.config.ts`, checks every declared subpath/condition target exists in
  `dist/`, loads each deep subpath for both `import` and `require`, and asserts the runtime
  dependency set stays empty.
- **Subpath exports**: `./resources`, `./types`, `./errors`, `./capabilities`, `./operations`,
  `./mcp`, `./untrusted` and `./package.json`, all declared in `package.json` `exports`.
- CI quality gates: typecheck, lint, build, coverage, capability/catalog/`mcp:project` checks and
  the published-surface guard on Node 24.
- `tsconfig.test.json` + `tsconfig.examples.json`; `npm run typecheck` covers src + test +
  examples. TypeScript strictness raised: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- `package.json` parity with the line: `sideEffects: false`, `./package.json` export, and
  `verify` / `coverage` / `clean` scripts.

### Changed

- **Packaging is ESM-first.** `package.json` sets `"type": "module"`; ESM artifacts use
  `.js` + `.d.ts` and CJS companions use `.cjs` + `.d.cts`, matching the node-hudu line. The
  `exports` map routes `import` and `require` to the matching target.
- **`engines` is now `>=24.0.0`** (native `fetch`; no runtime dependencies).
- `npm test` runs the suite without coverage; `npm run coverage` enforces the 90/90/80/90
  thresholds.
- ESLint lints `src` + `test` (test overrides per the line).
- Spec file renamed `openapi.json` → `api-docs.json`; nothing in-repo referenced the old name.
- `SCOPING.md` is tracked in the repository again; `REVIEW_FINDINGS.md` / `SQUAD_QA_REPORT.md`
  stay local.
- Package `files[]` no longer ships `src/` (the line ships built `dist/` only).

### Fixed

- Generated types are spec-faithful: resource collection types and edit-form types are derived
  from the Kimai OpenAPI spec rather than hand-written.
- The `./capabilities` `require` condition resolves its `dist/capabilities.d.cts` types path
  correctly for CJS consumers.
- Dangling metadata references in the generated capability rows were corrected.

## [1.0.1] - 2026-08-12

### Fixed

- Updated esbuild dependency via npm overrides to address GHSA-g7r4-m6w7-qqqr (arbitrary file read on Windows dev server)

## [1.0.0] - 2026-08-10

### Added

- Complete typed SDK for Kimai API v1.1 with 92 endpoints
- Resource clients: Activities, Customers, Projects, Timesheets, Users, Tags, Teams, Invoices, ApprovalBundle, Config, System, Export, Actions
- Full TypeScript support with strict mode — no `any` types
- Async iterable pagination for list endpoints
- Comprehensive error hierarchy (BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, UnprocessableEntityError, RateLimitError, ServerError)
- ESM and CJS builds with full type declarations
- MCP tool manifest for Kimai integration
- 194 unit tests with 100% code coverage
- Documentation: README, ARCHITECTURE.md, docs/API.md

### Notes

- Binary download endpoint (`/api/invoices/{id}/download`) supported via `InvoiceClient.download()` returning `ArrayBuffer`
