/**
 * `node-kimai/mcp` - the generated MCP tool catalog, as a compiled subpath export.
 *
 * WHY THIS SUBPATH EXISTS: the catalog is what a host needs to stand up an MCP server on top of
 * this SDK - the CORE profile, the five META tool specs, the curated tool descriptions, the
 * closed per-operation input contracts, and one catalog row per registry operation so a
 * capability with no tool of its own is DISCOVERABLE rather than indistinguishable from a
 * missing one.
 *
 * The generated catalog carries data and a schema reader. `dispatchOperation` adds an exact
 * effect boundary and then DELEGATES to `invokeOperation` (`node-kimai/operations`); it does not
 * duplicate argument validation or mutation governance. Never add a second write governor.
 * Validation and governance live in exactly ONE place - the SDK's `operations.invoke` /
 * `planInvoke` - and a second implementation here would be a second chance to be wrong. The
 * helpers are MCP-agnostic and take the registry record they need as an argument, so a host
 * passes `getCapability(op)` from `node-kimai/capabilities` and nothing can drift.
 *
 * `./catalog.generated.ts` is MACHINE-WRITTEN by `scripts/build-tool-catalog.mjs` from
 * `capabilities.json` + `MCP_TOOL_OVERRIDES.json`. Never hand-edit it;
 * `node scripts/build-tool-catalog.mjs --check` fails on a stale copy.
 */
export {
  CATALOG,
  CATALOG_PLAN_HASH,
  CONFIRM_REQUIRED_OPERATIONS,
  CORE_RULE,
  CORE_TOOLS,
  DEFAULT_CATALOG_LIMIT,
  DISPATCH_OPERATIONS,
  EXPOSED,
  INPUT_CONTRACTS,
  MAX_CATALOG_LIMIT,
  META_TOOLS,
  REFUSALS,
  TOOL_DESCRIPTIONS,
  catalogPage,
  catalogRow,
  configError,
  describeOperation,
  inputFields,
  kimaiDispatchInputSchema,
  nearestKeys,
  requireCatalogRow,
} from './catalog.generated.js';
export type {
  CatalogPageOptions,
  CatalogRow,
  InputContract,
  InputJsonSchema,
  MetaToolSpec,
  OperationDescription,
  ReflexiveField,
} from './catalog.generated.js';

export { dispatchOperation } from './dispatch.js';
export type { DispatchClient, DispatchEffect } from './dispatch.js';
