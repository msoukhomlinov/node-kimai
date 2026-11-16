# Files

- [Agent Execution Layer](agent-execution.md) - Agent-facing helpers (resolve/search/getContext), dry-run on mutations, structured errors (ResolutionError), compact summaries vs expanded records, and resolution details
- [Capability Registry](capability-registry.md) - Generated capabilities.json structure, CapabilityRecord schema, operation metadata (effect/flags/dryRun/pagination/resolution), and the generation pipeline from api-docs.json
- [MCP Tool Catalog and Dispatcher](mcp-integration.md) - MCP tool catalog generation, CATALOG/CORE_TOOLS/META_TOOLS exports, dispatchOperation effect-split boundary (read/write/destructive), and single-source projection from the registry
- [Pagination and Streaming](pagination.md) - The SDK's three-method pagination surface (list/listAll/listPages), AsyncIterable streaming, and hasMore derivation from vendor bare arrays
- [Registry-Validated Invoke Layer](registry-invoke.md) - Generic invoke surface with registry resolution, closed-contract validation, dry-run-first governance, confirmation gates, and effect-boundary dispatch
- [Deep Import Subpaths](subpath-exports.md) - Eight package.json subpaths enabling tree-shaking, MCP-independent operations, zero-import static data, and dual ESM+CJS support
- [Timeout and Cancellation](timeout-cancellation.md) - Constructor-level and per-request timeoutMs, AbortSignal composition, timeout/network error categories, and status=0 convention for non-HTTP failures
