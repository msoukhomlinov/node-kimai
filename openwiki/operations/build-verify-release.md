---
type: operations guide
title: Build, Verify and Release
description: How node-kimai is bundled with tsup, which package subpaths it exports, the npm scripts and the ordered verify gate, the pack and public-surface checks, the MCP surface check, and the test layout.
tags: [build, tsup, verify, release, npm, testing]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-01b67765554b723f0127ac16
    resource: repo://scripts/check-mcp-surface.mjs
  - id: openwiki-source-66dbab57a1140165f0142539
    resource: repo://scripts/public-surface.mjs
  - id: openwiki-source-0d0fb4e283de16529338ded7
    resource: repo://scripts/verify-pack.mjs
  - id: openwiki-source-74c6b0267a12bbfb67847a09
    resource: repo://tsup.config.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Build, Verify and Release

This page owns the package's subpath exports, npm script names, engine requirement and the verify gate order. For the registry that several gates read, see [capability registry](../architecture/capability-registry.md); for the MCP module the surface check inspects, see [MCP catalog and dispatch](../architecture/mcp-catalog-and-dispatch.md).

## Package shape

The package is ESM-first (`"type": "module"`), side-effect free, requires Node `>=24.0.0` (`engines`), and declares no runtime `dependencies` (the public-surface gate fails if any appear). Each code subpath maps to a tsup entry and has `import` and `require` conditions, each with `types` and `default` targets (`package.json`). `./package.json` is exported as a plain path with no tsup entry.

Subpaths: `.`, `./resources`, `./types`, `./errors`, `./capabilities`, `./untrusted`, `./mcp`, `./operations`, plus `./package.json`.

The `files` list ships `dist`, `examples`, docs, `capabilities.json`, `capabilities.schema.json`, `MCP_TOOL_CATALOG.json`, `MCP_TOOL_MANIFEST.md` and `MCP_TOOL_OVERRIDES.json`; `src/` is not shipped.

## Build (tsup)

`tsup.config.ts` builds one entry per subpath, in `esm` (`.js`/`.d.ts`) and `cjs` (`.cjs`/`.d.cts`), with declarations and sourcemaps, `clean: true`, target `node24`, no minification, no code splitting.

Single `ApiError` identity: sources import the errors module by the package's own name, and `node-kimai/errors` is marked `external`. Every emitted bundle therefore re-exports the one physical `dist/errors.*` file rather than inlining its own copy of the class. `vitest.config.ts` aliases `node-kimai/errors` to `src/errors.ts` so tests resolve the same module instance as their relative imports. See [errors](../architecture/errors.md).

## npm scripts

- Build and dev: `build`, `dev` (`tsup --watch`), `clean`.
- Static checks: `typecheck` (runs `tsc --noEmit` against the main, test and examples tsconfigs), `lint` (eslint over `src` and `test`), `lint:fix`.
- Tests: `test` (`vitest run`), `test:watch`, `coverage`.
- Generated artifacts: `capabilities:build`, `capabilities:check`, `capabilities:check:fixture`, `capabilities:check:ship`, `plan:derive`, `mcp:project`, `mcp:project:check`, `catalog:build`, `catalog:check`.
- Surface and packaging: `public-surface`, `mcp:check-surface`, `verify:pack`.

## The verify gate

`npm run verify` runs, in order and stopping at the first failure: `typecheck`, `lint`, `build`, `public-surface`, `capabilities:check`, `capabilities:check:fixture`, `mcp:project:check`, `catalog:check`, `mcp:check-surface`, `coverage`.

`prepublishOnly` runs `clean`, then `verify`, then `capabilities:check:ship` (the `--ship` mode of the capability checker, where no registry row may remain planned or implemented), then `verify:pack`. `prepack` runs `build`.

### public-surface (`scripts/public-surface.mjs`)

Runs against the built `dist/`. It checks that:
1. the `exports` subpaths and the tsup entry keys are the same set. The expected set is derived by parsing `tsup.config.ts` and `package.json`, not hardcoded;
2. every declared export target is an emitted file;
3. the deep subpaths actually load, by `require()` of the CJS target and `import()` of the ESM target;
4. there are no runtime dependencies and no bare-specifier imports in `dist` other than Node builtins and the package's own name (the self-reference from the errors design above).

### verify-pack (`scripts/verify-pack.mjs`)

Builds, then runs `npm pack` into a temp directory (clearing `npm_config_dry_run` so a parent dry-run cannot suppress the tarball). It then asserts that:
- every entry in `main`, `module`, `types` and every export target is inside the tarball, and the five data artifacts are present;
- `src/` is absent;
- each plan hash in the packed `capabilities.json` appears somewhere in the packed `dist` JS, which catches a stale compiled registry;
- a clean consumer project can install the tarball and `import` every value subpath in ESM and `require` them in CJS. `./types` is type-only and is only checked to resolve;
- the installed `CAPABILITY_PLAN_HASHES` export equals the hashes in `capabilities.json` (compared as deduplicated sorted sets).

### MCP surface (`scripts/check-mcp-surface.mjs`)

Imports the built `dist/mcp/index.js` and reads `MCP_TOOL_CATALOG.json`, `capabilities.json` and `MCP_TOOL_MANIFEST.md`; it fails if `dist` is missing. There is no server process to spawn, so the checks are static. Rules (exit 1 on any violation, `--json` for a report):
- **dispatch-tools**: `kimai_read`, `kimai_write` and `kimai_delete` exist in both META and core tool lists, and `DISPATCH_OPERATIONS` has exactly the read, write and destructive effects.
- **reachability / dispatch-coverage**: every registry operation has a catalog row, there are no orphan rows, and refused or tool-less rows carry a reason. The module and artifact row counts match. Every reachable operation appears in the dispatcher enum for its registry effect, and every enum member belongs to that effect.
- **core-size**: the core tool count, and the registry-record and catalog-entry counts, must equal the numbers stated in `MCP_TOOL_MANIFEST.md`, and the artifact's `coreTools` count must equal the module's. There must be exactly five META tools.
- **meta-descriptions**: each META tool description appears verbatim in the manifest (whitespace and escaped pipes normalised) and is at least 40 characters.
- **credential-leak**: regex scans of `src/mcp/catalog.generated.ts`, the catalog JSON and the manifest for bearer headers, token assignments, credential-shaped literals and long hex strings. Every input contract must be closed (`additionalProperties: false`), declare no credential field and no top-level `dry_run` or `confirm` property, and every dispatchable operation must have a contract.

## Tests and coverage

Tests live under `test/` as `*.test.ts` (`vitest.config.ts` include), with globals enabled and the node environment. The layout has top-level suites for the client, timeouts, errors identity, guards, request paths, untrusted handling and the MCP catalog, dispatch and served text. `test/operations/` covers the operations invoke path, and `test/resources/` has per-resource suites. Coverage uses v8; thresholds are 90 lines, 90 functions, 80 branches and 90 statements, enforced by `npm run coverage` as the last verify step. `src/index.ts`, `src/types/**` and `src/resources/index.ts` are excluded from coverage.
