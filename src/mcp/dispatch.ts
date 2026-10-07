// `node-kimai/mcp` dispatch boundary.
//
// `dispatchOperation` adds an EXACT effect boundary before the SDK's own invocation and then
// DELEGATES to the ONE governance path. It refuses an `effect` outside read | write |
// destructive, and an operation whose registry effect differs from the dispatcher's effect
// (including any dispatcher record) - that is the boundary this module owns and nothing else.
//
// Everything else - the exact-key lookup and its nearest-key refusal, the projection's
// unreachable-operation refusal, the closed input contract, dry-run-first writes and the
// confirmation gate - lives in exactly ONE place: the SDK's `operations.invoke`
// (`node-kimai/operations`). Never add a second write governor. A second implementation here
// would be a second chance to be wrong.
//
// `client` is the SDK's `ApiClient`: the typed resource clients are what `invokeOperation`
// dispatches into. There is no host-supplied invoker to hand it any more, because that
// target-shaped hole was the gap this boundary used to leave open.
import type { ApiClient } from '../client.js';
import { getCapability } from '../capabilities.js';
import { KimaiConfigError } from '../errors.js';
import { invokeOperation, type InvokeOptions } from '../operations/invoke.js';

/** The three dispatch effects, split one per dispatcher tool. */
export type DispatchEffect = 'read' | 'write' | 'destructive';

/** The client shape the dispatcher needs: the SDK's `ApiClient` (its typed resource clients). */
export type DispatchClient = ApiClient;

const EFFECTS: readonly string[] = ['read', 'write', 'destructive'];

function refuse(message: string, operation: string, code: string, suggestedAction: string): KimaiConfigError {
  return new KimaiConfigError(message, { code, operation, suggestedAction });
}

/**
 * Invoke one registry operation through the dispatcher for `effect`.
 *
 * Refused here with a typed `CONFIG_ERROR` (zero wire activity, never forwarded):
 * - an `effect` outside read | write | destructive;
 * - an operation whose registry effect differs from `effect` (including any dispatcher record).
 *
 * Every other refusal - unknown key, unreachable operation, unknown/invalid input, dry-run and
 * confirmation governance - is the SDK `operations.invoke` path's, and is raised by
 * `invokeOperation` below with the catalog's own refusal codes.
 */
export async function dispatchOperation(
  client: DispatchClient,
  effect: DispatchEffect,
  operation: string,
  input: Record<string, unknown> = {},
  options: InvokeOptions = {},
): Promise<unknown> {
  if (!EFFECTS.includes(effect)) {
    throw refuse(`Unknown dispatch effect "${String(effect)}". One of: read, write, destructive.`, operation, 'DISPATCHER_EFFECT', 'Use the dispatcher matching the operation effect.');
  }
  const record = getCapability(operation);
  if (record !== undefined && ((record as { kind: string }).kind === 'dispatcher' || record.effect !== effect)) {
    throw refuse(`Operation "${operation}" has registry effect "${record.effect}" and is outside this "${effect}" dispatcher.`, operation, 'DISPATCHER_EFFECT', `Use the dispatcher matching the operation effect: ${record.effect}.`);
  }
  return invokeOperation(client, operation, input, options);
}
