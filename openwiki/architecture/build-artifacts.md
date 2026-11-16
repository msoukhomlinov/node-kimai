---
type: build-system
title: Build System and Dual Module Strategy
description: Explains the tsup-based build configuration, ESM-first dual module output, and package.json exports map for deep-import subpaths
tags: [build, tsup, esm, cjs, modules, exports]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-74c6b0267a12bbfb67847a09
    resource: repo://tsup.config.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Build System and Dual Module Strategy

The node-kimai SDK uses tsup to produce dual ESM+CJS artifacts with an ESM-first design: ESM artifacts use standard `.js`/`.d.ts` extensions while CommonJS companions use `.cjs`/`.d.cts`. The build produces one entry per package.json subpath, enabling tree-shaking through deep imports.

## Build Tool and Configuration

The SDK uses [tsup](repo://tsup.config.ts#L1-L32) as its build tool, configured to:

- Target Node.js 24 and above
- Generate both ESM and CJS formats from a single source
- Produce TypeScript declarations (`.d.ts`/`.d.cts`) for both formats
- Bundle all dependencies except `node-kimai/errors` (kept external for class identity)
- Emit sourcemaps for debugging
- Skip code splitting and minification

The `external: ["node-kimai/errors"]` configuration ensures a single `ApiError` class identity across all entry points. Without this, each entry would inline its own copy of the error classes, breaking `instanceof` checks between imports from different subpaths. The external reference forces all entries to re-export the single physical `dist/errors.{js,cjs}` module at runtime.

## Eight Build Entries

The [tsup.config.ts entry map](repo://tsup.config.ts#L4-L13) defines eight distinct entries, each mapping to a package.json subpath:

1. **`index`** (`src/index.ts`) → main barrel export (ApiClient + all resource clients + errors + guards + types)
2. **`resources/index`** (`src/resources/index.ts`) → 13 resource client classes only
3. **`types/index`** (`src/types/index.ts`) → TypeScript types only (zero runtime code)
4. **`errors`** (`src/errors.ts`) → error hierarchy and structured error contract
5. **`capabilities`** (`src/capabilities.ts`) → generated capability registry (zero-import static data)
6. **`operations/index`** (`src/operations/index.ts`) → registry-validated invoke layer
7. **`untrusted`** (`src/untrusted.ts`) → untrusted-content marking helpers
8. **`mcp/index`** (`src/mcp/index.ts`) → MCP tool catalog and dispatcher

Each entry produces four artifacts: `.js` (ESM), `.d.ts` (ESM types), `.cjs` (CommonJS), and `.d.cts` (CommonJS types).

## ESM-First Extension Strategy

The [outExtension function](repo://tsup.config.ts#L27-L30) implements the ESM-first naming convention:

- **ESM artifacts** use the standard JavaScript extensions: `.js` for code, `.d.ts` for types
- **CJS artifacts** use distinct extensions: `.cjs` for code, `.d.cts` for types

This strategy gives ESM the "default" extensions, treating CommonJS as the alternate format. Modern bundlers and Node.js resolve `.js` as ESM when `package.json` declares `"type": "module"`, which [this package does](repo://package.json#L5).

## Package Exports Map

The [package.json exports field](repo://package.json#L16-L97) declares eight public subpaths, each with both `import` (ESM) and `require` (CommonJS) conditions:

```json
{
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  "./resources": { /* ... */ },
  "./types": { /* ... */ },
  "./errors": { /* ... */ },
  "./capabilities": { /* ... */ },
  "./operations": { /* ... */ },
  "./untrusted": { /* ... */ },
  "./mcp": { /* ... */ },
  "./package.json": "./package.json"
}
```

Each subpath declares a `types` field (for TypeScript resolution) and a `default` field (for runtime). Node.js and bundlers choose the correct artifact based on the package's `"type": "module"` declaration and the import syntax used.

The `/package.json` subpath allows consumers to read the package metadata without warning.

## Verification Script

The [public-surface.mjs script](repo://scripts/public-surface.mjs) runs as a separate CI step (via `npm run public-surface`) to prove the declared exports map matches the built `dist/` tree. It:

1. Loads each subpath using both `import` and `require`
2. Verifies the main entry point re-exports `ApiClient` and resource clients
3. Confirms zero runtime dependencies (only native fetch)
4. Ensures the dist directory contains exactly the files declared in the exports map

This guard prevents export map drift and accidental dependency creep.

## Build Outputs

After running `npm run build`, the dist directory contains:

```
dist/
  index.{js,d.ts,cjs,d.cts}
  resources/index.{js,d.ts,cjs,d.cts}
  types/index.{js,d.ts,cjs,d.cts}
  errors.{js,d.ts,cjs,d.cts}
  capabilities.{js,d.ts,cjs,d.cts}
  operations/index.{js,d.ts,cjs,d.cts}
  untrusted.{js,d.ts,cjs,d.cts}
  mcp/index.{js,d.ts,cjs,d.cts}
  *.js.map, *.cjs.map (sourcemaps)
```

Consumers can import from any subpath:

```typescript
import { ApiClient } from 'node-kimai';                     // main barrel
import { TimesheetClient } from 'node-kimai/resources';     // resource clients only
import type { Timesheet } from 'node-kimai/types';          // types only
import { ApiError } from 'node-kimai/errors';               // errors only
import { CAPABILITIES } from 'node-kimai/capabilities';     // zero-import registry
```

The ESM-first strategy ensures tree-shaking works: importing only `node-kimai/types` pulls no runtime code into the bundle.

## Runtime Target and Dependencies

The build targets Node.js 24 (`target: "node24"` in [tsup.config.ts](repo://tsup.config.ts#L23)), which guarantees native `fetch` availability. The [package.json engines field](repo://package.json#L139-L141) enforces this minimum version.

The SDK maintains **zero runtime dependencies**. The only dependency is Node.js's built-in `fetch`, eliminating supply-chain risk and minimizing bundle size. Dev dependencies (TypeScript, tsup, vitest, eslint) are build-time only and never shipped.
