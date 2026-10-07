// `node-kimai/mcp` dispatch boundary.
//
// `dispatchOperation` adds an EXACT effect boundary before the host's own invocation: it refuses
// an operation the registry does not know, an operation the projection refuses outright, and an
// operation whose registry effect differs from the dispatcher's effect. Everything else
// (argument validation, dry-run semantics, approval policy) stays in exactly ONE place - the
// SDK's own refuse-unknown-keys path and the host's governance - never a second copy here.
//
// DEVIATION FROM THE SIBLING SDKS (documented on purpose): node-hudu / node-autotask dispatch
// into `client.operations.invoke`, a generic registry-key invoker. node-kimai has no such
// generic invoker: its methods are typed resource-client calls. `dispatchOperation` therefore
// takes a `DispatchTarget` - the host's invoker for a canonical registry key - validates the
// effect boundary, and only then calls it. The boundary is the same boundary; the call target is
// the host's, because the SDK has no generic one to hand it.
import { getCapability } from '../capabilities.js';
import { KimaiConfigError } from '../errors.js';
import { REFUSALS, nearestKeys } from './catalog.generated.js';

/** The three dispatch effects, split one per dispatcher tool. */
export type DispatchEffect = 'read' | 'write' | 'destructive';

/**
 * The host's invoker for a canonical registry key. `input` is the operation's closed contract
 * (see `kimaiDispatchInputSchema`); the `dryRun` bag is the host's own argument, not part of it.
 */
export interface DispatchTarget {
  invoke(operation: string, input?: Record<string, unknown>): Promise<unknown>;
}

const EFFECTS: readonly string[] = ['read', 'write', 'destructive'];

function refuse(message: string, operation: string, code: string, suggestedAction: string): KimaiConfigError {
  return new KimaiConfigError(message, { code, operation, suggestedAction });
}

/**
 * Invoke one registry operation through the dispatcher for `effect`.
 *
 * Refused with a typed `CONFIG_ERROR` (zero wire activity, never forwarded):
 * - an `effect` outside read | write | destructive;
 * - an operation key the registry does not know (the message names the nearest keys);
 * - an operation the projection refuses outright (binary/download) - the escape hatch cannot
 *   bypass the projection rule;
 * - an operation whose registry effect differs from `effect` (including any dispatcher record).
 */
export function dispatchOperation(
  target: DispatchTarget,
  effect: DispatchEffect,
  operation: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  if (!EFFECTS.includes(effect)) {
    return Promise.reject(refuse(`Unknown dispatch effect "${String(effect)}". One of: read, write, destructive.`, operation, 'DISPATCHER_EFFECT', 'Use the dispatcher matching the operation effect.'));
  }
  const record = getCapability(operation);
  if (record === undefined) {
    const near = nearestKeys(operation, 5);
    return Promise.reject(refuse(`Unknown operation "${operation}". Operation keys are exact registry keys (never a tool name, never fuzzy). Nearest keys: ${near.length ? near.join(', ') : '(none)'}. Call kimai_catalog to list every operation.`, operation, 'UNKNOWN_OPERATION', 'Call kimai_catalog to list every operation key.'));
  }
  if (REFUSALS[operation] !== undefined) {
    return Promise.reject(refuse(`Operation "${operation}" is outside the served surface: ${REFUSALS[operation].reason}`, operation, 'UNREACHABLE_OPERATION', 'Use the bounded alternative this operation points at; it is not dispatchable.'));
  }
  if ((record as { kind: string }).kind === 'dispatcher' || record.effect !== effect) { // this registry has no dispatcher records; the guard is kept at parity with the sibling SDKs
    return Promise.reject(refuse(`Operation "${operation}" has registry effect "${record.effect}" and is outside this "${effect}" dispatcher.`, operation, 'DISPATCHER_EFFECT', `Use the dispatcher matching the operation effect: ${record.effect}.`));
  }
  return target.invoke(operation, input);
}
