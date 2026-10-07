/**
 * `node-kimai/operations` — the registry-driven agent execution layer.
 *
 * Exported subpath for callers that want the generic, registry-validated invoke without the whole
 * client barrel. It is MCP-independent: no MCP runtime, no schema-library dependency.
 *
 * The rule this subpath exists to keep: validation and governance live in exactly ONE place —
 * `invokeOperation` / `planInvoke`. The MCP dispatch surface (`node-kimai/mcp`,
 * `dispatchOperation`) adds only the effect boundary and DELEGATES here. Never add a second write
 * governor.
 */
export {
  invokeOperation,
  planInvoke,
  resolveOperation,
  resolveInvokeTarget,
  invokeTargetDescription,
  validateInvokeInput,
  unknownKeysRefusal,
  inputContractKeys,
  needsConfirmation,
  REFUSAL_CODES,
} from './invoke.js';
export type { InvokeOptions, InvokePlan, InvokeProblem, InvokeVerdict, RefusalCode } from './invoke.js';
