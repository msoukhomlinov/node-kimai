# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - Unreleased

### Added

- Agent-execution alignment toolchain and quality gates, matching the node-hudu / node-autotask line (see `SCOPING.md` and ARCHITECTURE.md)
- CI quality gates (`.github/workflows/ci.yml`): typecheck, lint, build, coverage on Node 20 + 24
- `package.json` parity with the line: `sideEffects: false`, `./package.json` export, `verify` / `coverage` / `clean` scripts, `prepublishOnly` gate, `files[]` ships examples + docs + MCP manifest
- `tsconfig.test.json` and `tsconfig.examples.json`; `npm run typecheck` now covers src + test + examples
- TypeScript strictness raised to the line: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- **Agent execution layer (Phase F)**, additive, across all 13 resources — 108 registered operations (90 primitives + 18 helpers), every row tested (see ARCHITECTURE.md §15):
  - **Helpers** co-located on the client: `resolve` (id / name / bare id / exact name) and `search` for the 8 name-addressable resources, plus `getContext` for the three workflow resources (timesheets, customers, projects). Helpers return a compact summary by default; `{ expand: true }` returns the full record and `{ resolutionDetails: true }` the `Resolution<T>` wrapper
  - **Bounded resolution**: one page, at most 500 records (`maxScanRecords: 500` / `maxScanPages: 1`); several exact matches raise `RESOLUTION_AMBIGUOUS` (candidate ids on `resourceIds`), a full page with no exact match raises `RESOLUTION_TRUNCATED` — never a silent `null`. Helper `limit` defaults to 25 and is capped at 100; an out-of-range value throws instead of being clamped
  - **Dry-run on every mutation**: `{ dryRun: true }` issues zero wire calls and returns a `DryRunResult<T>` (`simulated: true`, `target`, `request`, `checks`, `impact`, `warnings`)
  - **Mutation classification** carried per operation in the registry: `effect` (`read` / `write` / `destructive`) and `flags` (`sensitive` / `idempotent` / `requiresApproval`)
  - **Structured error contract**: `ApiError.category` (closed vocabulary) plus `operation`, `httpStatus`, `retryable`, `vendorError`, `resourceIds`, `suggestedAction`, `correlationId` (one per request) and `retryAfter` (parsed from `Retry-After`); new `KimaiConfigError` (local argument refusal, zero fetch) and `ResolutionError`. All pre-existing fields and classes are unchanged
  - **Capability plan → registry → emitted artifacts**: `capabilities.plan.json` (derived from `api-docs.json` + the source tree, re-runnable and idempotent) → `capabilities.json` + `src/capabilities.ts` (zero-import, behind the new `./capabilities` subpath), with per-group `planHash`/`builtAt` and a stale-check pinning the plan, source and test hashes
  - **Capability gates**: `capabilities:check` (row coverage, mutation safety, judgement/metadata, declared test rows, staleness, registry-equals-re-render), `capabilities:check:fixture` (negative fixture proving the gate can fail) and `--ship` (no row left planned/implemented), wired into `npm run verify`
  - **MCP projection**: the tool surface is projected from the capability registry rather than hand-written (`MCP_TOOL_MANIFEST.md`)
- `scripts/public-surface.mjs` — published-surface guard: derives the expected subpath set from `package.json` + `tsup.config.ts`, checks every declared subpath/condition target exists in `dist/`, loads each deep subpath (`.`, `./resources`, `./types`, `./errors`, `./capabilities`) for both `import` and `require`, and asserts the runtime dependency set stays empty (native `fetch` only)
- `./capabilities` subpath export (zero-import registry module), added to `files[]`

### Changed

- `npm test` runs the suite without coverage; `npm run coverage` enforces the 90/90/80/90 thresholds (same as before, now in the line-standard `thresholds` block)
- ESLint now lints `src` + `test` (test overrides per the line)
- `TimesheetClient.listPages` / `InvoiceClient.listPages` are declared non-async and return `AsyncIterable<T[]>` instead of `AsyncGenerator` — `for await` consumers are unaffected; only code calling `.next()`/`.return()` on the returned generator is impacted
- Spec file renamed `openapi.json` → `api-docs.json` (line naming); nothing in-repo referenced the old name
- `SCOPING.md` is tracked in the repository again (the scope record ships with the package); `REVIEW_FINDINGS.md` / `SQUAD_QA_REPORT.md` stay local
- Package `files[]` no longer ships `src/` (the line ships built `dist/` only)

### Notes

- `list()` on a paginated resource (timesheets, invoices) returns the FIRST page only; use `getAll()` for the complete set or `listPages()` for a page stream. A rename of the list/iterate surface (`list` → stream semantics, `getById` → `get`, `getAll` → `listAll`) is planned for the next major and will be announced before the n8n community node pins the API.

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
- Documentation: README, ARCHITECTURE.md, USAGE.md

### Notes

- Binary download endpoint (`/api/invoices/{id}/download`) supported via `InvoiceClient.download()` returning `ArrayBuffer`
