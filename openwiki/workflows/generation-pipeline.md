---
type: workflow
title: Code Generation Pipeline
description: Multi-stage generation workflow transforming the vendor OpenAPI spec into the capability registry, MCP tools, and catalog artifacts through derive-plan, generate-capabilities, project-mcp-tools, and build-tool-catalog stages.
tags: [code-generation, capabilities, mcp, automation, workflow]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-624810923dc7b93d871b0100
    resource: repo://scripts/build-tool-catalog.mjs
  - id: openwiki-source-583800b7070d5c4b3a3b786c
    resource: repo://scripts/derive-plan.mjs
  - id: openwiki-source-f98a78ef91839fd28ee0944e
    resource: repo://scripts/generate-capabilities.mjs
  - id: openwiki-source-ba07b8a77b02fcee6813cf41
    resource: repo://scripts/project-mcp-tools.mjs
  - id: openwiki-source-0d4a2fbf2755f159a94b49cb
    resource: repo://test/mcp-served-text.test.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Code Generation Pipeline

The SDK generates its capability registry, MCP tool surface, and catalog artifacts through a four-stage pipeline that transforms the vendor OpenAPI spec (`api-docs.json`) into typed, tested, and documented SDK surfaces.

## Pipeline Stages

### Stage 1: derive-plan

**Script**: `scripts/derive-plan.mjs`
**Input**: `api-docs.json` (vendored Kimai OpenAPI spec)
**Output**: `capabilities.plan.json`

Derives the capability plan by mapping vendor endpoints to SDK operations via the OVERRIDES table. The script:

- Reads `api-docs.json` and applies endpoint-to-operation mappings from OVERRIDES
- Preserves judgement columns: `helper`, `flags`, `metadata`, `compact`, `resolution`, `errors`, `tests`
- Classifies operations by effect: `read`, `write`, `destructive`
- Records vendor pagination modes (`page`/`none`) based on spec query parameters
- Is idempotent: re-running produces byte-identical output

The OVERRIDES table addresses vendor spec gaps and naming inconsistencies, such as mapping `/api/invoices/{id}/download` to `invoices.download` while marking it refused (binary download operations are not served).

### Stage 2: generate-capabilities

**Script**: `scripts/generate-capabilities.mjs`
**Input**: `capabilities.plan.json`, TypeScript sources, test files
**Output**: `capabilities.json`, `src/capabilities.ts`

Builds the capability registry by combining the plan with SDK implementation details:

- Parses TypeScript method signatures to derive `inputSchema` and `outputSchema`
- Generates `src/capabilities.ts` as a zero-import module exporting `CAPABILITIES` and `getCapability()`
- Records `staleCheck` metadata: plan hash, source file hashes, test file hashes
- Validates that every planned operation has a corresponding SDK method

The registry serves as the single source of truth for operation metadata, consumed by later stages and runtime MCP tools.

### Stage 3: project-mcp-tools

**Script**: `scripts/project-mcp-tools.mjs`
**Input**: `capabilities.json`, `MCP_TOOL_OVERRIDES.json`
**Output**: `MCP_TOOL_MANIFEST.md`, tool descriptions

Projects the registry into MCP tool documentation using progressive disclosure:

- Implements the CORE_RULE with requirements R1-R5 to determine core tier inclusion (threshold: 10 tools)
- Applies curation from `MCP_TOOL_OVERRIDES.json` for per-tool description overrides
- Generates the catalog table with one row per registry operation
- Documents exposed tools, dispatch operations by effect, and input contracts

The CORE_RULE implements requirements R1-R5 to determine core tier inclusion: R1 (the five META tools for catalog/describe/read/write/delete), R2 (identify the API-key owner via users.getMe), R3 (discovery via catalog + describe), R4 (one bounded helper-tier read per workflow resource), and R5 (writes are NOT in the core—they are reachable through kimai_write/kimai_delete, dry-run first, destructive calls confirmation-gated). This keeps the core surface under the threshold while ensuring common read workflows complete without dispatch.

### Stage 4: build-tool-catalog

**Script**: `scripts/build-tool-catalog.mjs`
**Input**: `capabilities.json`, `api-docs.json`
**Output**: `MCP_TOOL_CATALOG.json`, `src/mcp/catalog.generated.ts`

Builds progressive-disclosure artifacts and closed input contracts:

- Generates `src/mcp/catalog.generated.ts` with `CATALOG`, `INPUT_CONTRACTS`, `DISPATCH_OPERATIONS`, and dispatch schemas
- Projects vendor request bodies from `api-docs.json` into served input schemas
- Validates vendor-required fields are served (prevents node-hudu #70 failure class)
- Creates one closed `additionalProperties: false` contract per dispatchable operation
- Removes tool-level arguments (`dry_run`, `confirm`) from operation contracts

The catalog enables runtime MCP tools to serve operation metadata, input schemas, examples, and pagination modes without hardcoding them in tool descriptions.

## Idempotence and Validation

All four stages are idempotent: given identical inputs, they produce byte-identical outputs. The pipeline includes validation layers:

- **Served-text pins**: `test/mcp-served-text.test.ts` enforces that served contracts never claim false closure or absence against the vendor spec
- **Catalog tests**: `test/mcp-catalog.test.ts` validates catalog structure, dispatch operations, and input contract closure
- **Stale checks**: `generate-capabilities.mjs` records plan and source hashes to detect drift between plan and implementation

## Triggering Regeneration

The pipeline runs in these scenarios:

1. **Vendor spec update**: When `api-docs.json` changes (new Kimai API version)
2. **SDK implementation changes**: When resource client methods or signatures change
3. **Plan adjustments**: When OVERRIDES table or judgement columns are updated
4. **MCP curation**: When `MCP_TOOL_OVERRIDES.json` is modified

Re-run the full pipeline with `npm run build` or individually:

```bash
node scripts/derive-plan.mjs
node scripts/generate-capabilities.mjs
node scripts/project-mcp-tools.mjs
node scripts/build-tool-catalog.mjs
```

## Artifacts Consumed at Runtime

Generated artifacts used by the MCP server and SDK:

- `src/capabilities.ts`: Imported by `src/mcp/index.ts` for operation lookup
- `src/mcp/catalog.generated.ts`: Provides `CATALOG`, `INPUT_CONTRACTS`, dispatch schemas
- `capabilities.json`: Read by scripts for downstream generation stages
- `MCP_TOOL_MANIFEST.md`: Documentation for SDK consumers and MCP host integrators
