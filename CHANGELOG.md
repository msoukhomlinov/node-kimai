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
