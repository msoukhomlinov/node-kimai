---
type: verification-system
title: Verification and Surface Guards
description: Documents the verification scripts that guard capability registry integrity, published surface correctness, MCP tool surface consistency, and pre-publish packaging
tags: [verification, guards, capabilities, packaging, mcp, surface]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-3383a16d78dafb1db01162a3
    resource: repo://scripts/check-capabilities.mjs
  - id: openwiki-source-01b67765554b723f0127ac16
    resource: repo://scripts/check-mcp-surface.mjs
  - id: openwiki-source-0843d00131b708e8c127a8c9
    resource: repo://scripts/check-negative-fixture.mjs
  - id: openwiki-source-66dbab57a1140165f0142539
    resource: repo://scripts/public-surface.mjs
  - id: openwiki-source-0d0fb4e283de16529338ded7
    resource: repo://scripts/verify-pack.mjs
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Verification and Surface Guards

The SDK employs a suite of verification scripts that act as quality gates, ensuring the capability registry stays synchronized with implementation, the published surface matches declarations, the MCP tool surface maintains its invariants, and the packaged artifact is shippable.

## Overview

Five primary verification scripts guard different aspects of the SDK:

| Script | Purpose | Run via | Exit codes |
|--------|---------|---------|------------|
| `check-capabilities.mjs` | Capability registry integrity | `npm run capabilities:check` | 0 = pass, 1 = drift |
| `public-surface.mjs` | Published surface correctness | `node scripts/public-surface.mjs` | 0 = intact, 1 = drift |
| `check-mcp-surface.mjs` | MCP tool surface invariants | `npm run mcp:check-surface` | 0 = ok, 1 = violated |
| `verify-pack.mjs` | Pre-publish packaging | `npm run verify:pack` | 0 = shippable, 1 = not |
| `check-negative-fixture.mjs` | Gate failure proof | `npm run capabilities:check:fixture` | 0 = gate works, 1 = toothless |

All scripts follow a `--check` style: silent on success apart from a one-line summary, exit 1 with a failure list on violations.

## Capability Registry Gate

**Script:** `scripts/check-capabilities.mjs`

**Purpose:** Proves the capability registry (`capabilities.json`) matches the plan (`capabilities.plan.json`), implementation source, and test coverage, with no drift or stale metadata.

### Usage

```bash
# Check all groups
node scripts/check-capabilities.mjs

# Check one group
node scripts/check-capabilities.mjs --group timesheets

# Ship gate (no row may remain planned/implemented)
node scripts/check-capabilities.mjs --ship

# Override fixtures (for negative-fixture proof)
node scripts/check-capabilities.mjs --plan <path> --registry <path>
```

### Gates Enforced

The script enforces eight distinct gate rules:

#### 1. Registry Section (`[registry-section]`)
- Each resource group's section exists in `capabilities.json`
- Failure: "group X section missing from capabilities.json"

#### 2. Row Coverage (`[row-coverage]`)
- Every in-scope implemented/tested row has a registry record
- Status must match between plan and registry
- No record for planned rows (not yet implemented)
- No record without a matching plan row (hand-written registry)

**Failures:**
- "implemented/tested rows missing from the registry: X, Y, Z"
- "records with a status that lags the plan: X (plan tested vs registry implemented)"
- "records for planned (unbuilt) rows: X, Y"

#### 3. Mutation Safety (`[mutation-safety]`)
- Every mutation (write/destructive) has an `effect` classification
- Every mutation must accept `{ dryRun: true }`

**Failure:** "X (dryRun false — every mutation must accept { dryRun: true })"

#### 4. Judgement (`[judgement]`)
- Every plan row has all required keys present
- Closed-set values for `effect`, `status`, `helperBasis`, `redaction`
- Helpers have a `helperRationale`
- Mutations answer `staleCheck` and `redaction`

**Keys required:** `endpoint`, `primitive`, `specialOp`, `vendorFilters`, `search`, `helper`, `helperBasis`, `helperRationale`, `effect`, `flags`, `dryRun`, `metadata`, `compact`, `resolution`, `staleCheck`, `redaction`, `errors`, `tests`, `group`, `status`

**Closed sets:**
- `effect`: read, write, destructive
- `status`: planned, implemented, tested
- `helperBasis`: server-filter, client-scan, composite, workflow
- `redaction`: none, credentials

#### 5. Metadata (`[metadata]`)
- Every record has `purpose`, boolean `dryRun`, `staleCheck` block, ≥1 example, `permissions`
- Helpers: rationale + usage + test rows
- Compact helpers: named `drops` in `outputSchema`

#### 6. Test Rows (`[test-rows]`)
- Tested rows: every `tests[]` title exists in its named file
- Implemented rows: non-empty `tests` array

#### 7. Staleness (`[staleness]`)
- Section `planHash` matches the plan bytes
- Per-record source/test hashes match current files
- Registry module (`src/capabilities.ts`) equals a fresh re-render of `capabilities.json` (normalized timestamps)

This is the **anti-drift lock**: a hand edit to the registry module fails the gate.

#### 8. Ship (`[ship]`)
- With `--ship` flag, no row remains `planned` or `implemented`
- All operations must be `tested` before publish

### Verification Flow

1. Parse `capabilities.plan.json` and compute its SHA-256 hash
2. Load `capabilities.json` and verify group sections exist
3. Match plan rows to registry records by id (`primitive` or `helper` field)
4. Run eight gate rules across all in-scope rows/records
5. Hash source files (`src/resources/*.ts`) and test files (`test/resources/*.test.ts`)
6. Re-render registry module from JSON and compare byte-for-byte (timestamps normalized)

### Exported for Testing

`runCheck(planBytes, caps, readFile, opts)` is exported so the negative-fixture proof (`check-negative-fixture.mjs`) can drive the checker against deliberately drifted inputs without touching real files.

## Published Surface Guard

**Script:** `scripts/public-surface.mjs`

**Purpose:** Guards the PUBLISHED surface against the BUILT `dist/` tree, proving exports declarations match emitted artifacts and the runtime dependency set stays empty.

### Usage

```bash
# Check (exit 0 = surface intact)
node scripts/public-surface.mjs

# Machine-readable report
node scripts/public-surface.mjs --json

# Only failures
node scripts/public-surface.mjs --quiet
```

### Four Proofs

#### 1. Subpath Set Derivation
- Expected subpaths DERIVED from `package.json` exports + `tsup.config.ts` entries
- Never hardcoded: adding an entry point is picked up automatically
- No missing subpath, no extra subpath

**Example derivation:**
```
tsup entry: { index: 'src/index.ts' } → subpath '.'
tsup entry: { 'resources/index': 'src/resources/index.ts' } → subpath './resources'
```

#### 2. Targets Exist
- Every condition path declared in `exports` (import/require × types/default) resolves to a file the build actually emitted
- Checks all declared targets in `dist/`

#### 3. Deep Subpaths Load
- Subpaths `.`, `./resources`, `./types`, `./errors`, `./capabilities`, `./operations`, `./mcp`, `./untrusted` are LOADED for real
- `require()` of the CJS target
- Dynamic `import()` of the ESM target
- A resolvable-but-broken build fails here

#### 4. Runtime Dependencies Empty
- No `dependencies` in `package.json` (native fetch only)
- No bare-specifier imports in `dist/` outside Node builtins and self-referencing package name

**Allowed:**
- Node builtins: `node:fs`, `node:path`, etc.
- Self-referencing: `node-kimai/errors` (issue #11 identity guarantee)

**Rejected:** Any external package name

### Verification Flow

1. Parse `tsup.config.ts` to extract entry map
2. Derive expected subpaths from entry keys
3. Walk `dist/` directory and collect all emitted files
4. For each `exports` entry:
   - Verify target file exists in `dist/`
   - Load via `require()` (CJS) and `import()` (ESM)
5. Scan all `dist/*.{mjs,cjs,js}` files for bare specifiers
6. Report any external dependencies found

## MCP Surface Invariants

**Script:** `scripts/check-mcp-surface.mjs`

**Purpose:** Scripted invariants of the SERVED MCP surface, verifying the generated catalog and dispatcher maintain their contracts.

### Usage

```bash
# Check
node scripts/check-mcp-surface.mjs

# Machine-readable report
node scripts/check-mcp-surface.mjs --json
```

### Design Note

Ported from the node-autotask line with the transport half REPLACED by a static half: node-kimai ships no reference MCP server in this repository (the server lives in a separate package), so there is no process to spawn. What is checkable is the generated surface the server is built from: `dist/mcp/index.js` (compiled bytes), `MCP_TOOL_CATALOG.json`, and `MCP_TOOL_MANIFEST.md`.

### Six Invariants

#### 1. Effect-Split Dispatch Tools
- Three dispatch tools exist: `kimai_read`, `kimai_write`, `kimai_delete`
- All three are in `META_TOOLS` and `CORE_TOOLS`
- `DISPATCH_OPERATIONS` has exactly three effect keys: read, write, destructive

#### 2. Registry-Catalog Reachability
- Every registry operation has a catalog row
- No unreachable row without a `reason` string
- Catalog size matches registry size

#### 3. Dispatch Coverage
- Every reachable operation is in `DISPATCH_OPERATIONS[effect]`
- Every dispatcher enum operation is reachable

#### 4. Core Size Documented
- Always-on core is the DOCUMENTED size
- Counts cross-read from `MCP_TOOL_MANIFEST.md`

#### 5. META Tool Descriptions Verbatim
- Every META tool description matches the manifest VERBATIM
- No silent re-wording

#### 6. No Credential Leakage
- Generated module and artifact carry no bearer header
- No `token=`-style assignment
- No key-shaped literal
- No served schema declares a credential field

### Verification Flow

1. Load `dist/mcp/index.js` (the compiled module)
2. Load `MCP_TOOL_CATALOG.json` and `capabilities.json`
3. Load `MCP_TOOL_MANIFEST.md` as text
4. Check effect-split dispatch tools
5. Cross-check registry ↔ catalog ↔ manifest
6. Verify dispatch coverage
7. Scan for credential patterns

## Pre-Publish Packaging Gate

**Script:** `scripts/verify-pack.mjs`

**Purpose:** The reproducible packaging gate, proving the tarball is shippable and imports work in both ESM and CJS.

### Usage

```bash
# Full verification
npm run verify:pack

# Or directly
node scripts/verify-pack.mjs
```

### Five Proofs

#### 1. Build + Pack
- Runs `npm run build` to ensure `dist/` is current
- Runs `npm pack --pack-destination <temp>` into a temp directory
- Verifies exactly one `.tgz` file produced

#### 2. Entry Points in Tarball
- Every declared entry point exists INSIDE the tarball
- Checks `main`, `module`, `types`, and all `exports` subpaths
- Verifies `src/` is NOT shipped (only `dist/`)

#### 3. Data Artifacts Shipped
- `capabilities.json` and `capabilities.schema.json`
- `MCP_TOOL_CATALOG.json`
- `MCP_TOOL_MANIFEST.md`
- `MCP_TOOL_OVERRIDES.json`

All declared in `package.json` `files[]` array.

#### 4. Compiled Registry Hash Agrees
- Extracts `capabilities.json` from tarball
- Extracts all `dist/*.{js,cjs}` files
- Verifies every `planHash` from JSON exists in compiled code
- Prevents shipping stale compiled registry

#### 5. Install + Import Test
- Installs tarball into clean temp project
- Creates both ESM and CJS test files
- Imports every VALUE subpath from both module systems
- Verifies `./types` (TYPE-ONLY) still resolves

**ESM test:**
```javascript
import { ApiClient } from 'node-kimai';
import { ActivityClient } from 'node-kimai/resources';
// ... all value subpaths
```

**CJS test:**
```javascript
const { ApiClient } = require('node-kimai');
const { ActivityClient } = require('node-kimai/resources');
// ... all value subpaths
```

**Type-only resolution:**
```typescript
import type { Activity } from 'node-kimai/types';
```

### Why This Matters

`npm pack` can emit a tarball from whatever is on disk, so a stale (or absent) `dist/` would ship compiled bytes that are not the code under review. `prepack` (in `package.json`) always rebuilds, and this script proves the packaging claim is transferable from the commit.

### Runs in `prepublishOnly`

This gate is wired into `prepublishOnly` lifecycle and CI, because only an install proves a consuming MCP server can import what shipped.

## Negative Fixture Proof

**Script:** `scripts/check-negative-fixture.mjs`

**Purpose:** Proof that the capability gate FAILS on drifted inputs — a checker that has never failed is an untested checker.

### Usage

```bash
npm run capabilities:check:fixture
```

### Two Proofs

#### Proof 1: Drifted Plan
- Committed fixture: `test/__fixtures__/capabilities.plan.drifted.json`
- Same rows as `capabilities.plan.json` with six pinned defects:
  1. A mutation with `dryRun: false`
  2. A mutation without a `staleCheck` answer
  3. A helper without a `helperRationale`
  4. A `redaction` outside the closed set
  5. An implemented row downgraded to "planned"
  6. A ghost test title (not in test file)

**Requirement:** Gate must exit non-zero with at least 5 failures across at least 4 distinct rules.

A fixture satisfiable by deleting one rule would be toothless.

#### Proof 2: Hand-Edited Registry
- Creates a copy of `src/capabilities.ts` with one record's `dryRun` flipped
- Runs gate with `--registry` override
- Must fail via the `[staleness]` re-render rule specifically

The committed module must equal a fresh re-render of `capabilities.json`.

### Fixture Regeneration

If the plan's shape ever changes, regenerate the fixture from `capabilities.plan.json` by re-applying the six defects. The script fails with a clear "fixture is stale" message instead of passing silently.

### Exit Codes

- **Exit 0:** Both proofs show the gate failing as intended
- **Exit 1:** Gate passed on a drifted input (toothless), failure evidence is too thin, or fixture no longer matches plan

## Integration with npm Scripts

Verification scripts are integrated into standard npm workflows:

```json
{
  "scripts": {
    "capabilities:check": "node scripts/check-capabilities.mjs",
    "capabilities:check:fixture": "node scripts/check-negative-fixture.mjs",
    "mcp:check-surface": "node scripts/check-mcp-surface.mjs",
    "verify": "npm run capabilities:check && npm run mcp:check-surface && npm run mcp:project:check",
    "verify:pack": "node scripts/verify-pack.mjs",
    "prepublishOnly": "npm run verify && npm run verify:pack"
  }
}
```

### Verification Flow in CI

1. **Build:** `npm run build` creates `dist/`
2. **Type check:** `npm run typecheck` verifies TypeScript
3. **Lint:** `npm run lint` checks code style
4. **Test:** `npm test` runs unit tests with coverage
5. **Capabilities:** `npm run capabilities:check` guards registry
6. **MCP surface:** `npm run mcp:check-surface` guards tool surface
7. **Public surface:** `node scripts/public-surface.mjs` guards exports
8. **Ship gate:** `npm run capabilities:check -- --ship` (before publish)
9. **Pack gate:** `npm run verify:pack` (before publish)

## Related Documentation

- Capability registry: `capabilities.json`, ARCHITECTURE.md §15.6
- Generation pipeline: `scripts/derive-plan.mjs`, `scripts/generate-capabilities.mjs`
- MCP catalog generation: `scripts/build-tool-catalog.mjs`
- MCP manifest projection: `scripts/project-mcp-tools.mjs`
- Published surface exports: `package.json` exports map
- Build configuration: `tsup.config.ts`
- Test coverage: `vitest.config.ts`
