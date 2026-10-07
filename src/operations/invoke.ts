/**
 * `operations.invoke` — the SDK-side GENERIC, registry-validated invoke.
 *
 * The generated catalog lists EVERY registry operation. That listing is a promise: unless an agent
 * can actually CALL one of those operations by its canonical key, a capability with no tool of its
 * own is indistinguishable from a missing one. This module is that call path, and it is
 * deliberately MCP-independent — plain `node-kimai` code (no MCP runtime, no MCP type), so a host
 * can call it and nothing in it knows what a tool is.
 *
 * ```ts
 * const kimai = new ApiClient({ baseUrl, token });
 *
 * await invokeOperation(kimai, 'timesheets.search', { params: { active: 1 } });        // read
 * await invokeOperation(kimai, 'timesheets.create', { input: { project: 1, activity: 1, begin } }); // DRY RUN
 * await invokeOperation(kimai, 'timesheets.create', { input: {...} }, { dryRun: false });           // executes
 * await invokeOperation(kimai, 'timesheets.delete', { id: 7 }, { confirm: 'timesheets.delete', dryRun: false });
 * ```
 *
 * What this module owns, and what it deliberately does NOT:
 *
 * - it owns the RESOLVE step (exact registry-key lookup), the VALIDATE step (the caller's input
 *   against the operation's CLOSED input contract, derived from the generated catalog's
 *   `INPUT_CONTRACTS`, before any transport call) and the GOVERN step (dry-run-first writes, an
 *   exact confirmation string for destructive / approval-gated operations, the projection's
 *   refusals);
 * - it owns NO transport, NO retries, NO pagination and NO scanning. Dispatch calls the SAME typed
 *   method the SDK publishes, so every guard that path already has — the bounded helper `limit`,
 *   the structured resolution errors, the `{ dryRun: true }` no-wire path and its `DryRunResult`
 *   shape — is that path's, not a second implementation of it.
 *
 * Validation and governance live in exactly ONE place — here. `src/mcp/dispatch.ts` adds only the
 * effect boundary and DELEGATES to `invokeOperation`. Never add a second write governor.
 *
 * The unsound corner, named rather than hidden: the closed key set comes from the served
 * `INPUT_CONTRACTS`, while the typed method's PARAMETER ORDER comes from the registry
 * `inputSchema` (the generator emitted both from the same parameter resolution). A record whose
 * declared `opts` field is missing, or whose target method does not exist, is a `CONFIG_ERROR`
 * naming the drift — never a silent no-op and never a `TypeError` at the call site.
 */
import { getCapability, type CapabilityRecord } from '../capabilities.js';
import { EXPOSED, INPUT_CONTRACTS, REFUSALS, nearestKeys, type InputJsonSchema } from '../mcp/catalog.generated.js';
import { KimaiConfigError } from '../errors.js';
import type { ApiClient } from '../client.js';

// ---------------------------------------------------------------------------
// The invoke contract.
// ---------------------------------------------------------------------------

/** Caller options for `invokeOperation`. The dry-run flag lives HERE, never in the payload. */
export interface InvokeOptions {
  /**
   * Writes are DRY-RUN-FIRST: omit this (or pass `true`) and the operation runs on the SDK's own
   * dry-run path — the real request is never issued and the result is a `DryRunResult` with
   * `simulated: true`. Only an explicit `dryRun: false` executes a write.
   *
   * A read refuses `dryRun: true`: a read has no dry run to run.
   */
  dryRun?: boolean;
  /**
   * Deliberate-act acknowledgement. When present it must EQUAL the operation key exactly (no
   * fuzzy matching, no booleans), and it is REQUIRED for a destructive or approval-gated
   * operation.
   */
  confirm?: string;
}

/** One input problem, with the field path it applies to (`input.name`, `identifier.id`, ...). */
export interface InvokeProblem {
  path: string;
  message: string;
}

/** The validator's verdict. `ok: false` is always a refusal and never issues a request. */
export interface InvokeVerdict {
  ok: boolean;
  code: 'CONFIG_ERROR' | null;
  problems: InvokeProblem[];
  message: string;
}

/**
 * The refusal codes the invoke path and the effect dispatcher publish. `CONFIG_ERROR` is the SDK's
 * own caller-side code (`KimaiConfigError`); the three SCREAMING_SNAKE codes are the operation /
 * dispatcher vocabulary the catalog already serves, so a host can switch on them without parsing
 * prose. Never a value: a refusal names keys and paths only.
 */
export const REFUSAL_CODES = {
  UNKNOWN_OPERATION: 'UNKNOWN_OPERATION',
  UNREACHABLE_OPERATION: 'UNREACHABLE_OPERATION',
  INVALID_INPUT: 'CONFIG_ERROR',
  DISPATCHER_EFFECT: 'DISPATCHER_EFFECT',
} as const;

export type RefusalCode = (typeof REFUSAL_CODES)[keyof typeof REFUSAL_CODES];

/** The plan for one invoke: everything decided BEFORE the caller acts on it, and no wire call. */
export interface InvokePlan {
  /** The canonical registry key. */
  operation: string;
  /** The registry effect (`read` | `write` | `destructive`). */
  effect: 'read' | 'write' | 'destructive';
  /** True when the typed method will issue a wire call; false is the SDK dry-run path. */
  execute: boolean;
  /** True when the registry says this operation supports a dry run. */
  dryRunSupported: boolean;
  /** The dry-run flag the typed method will receive (always false for a read). */
  dryRun: boolean;
  /** Where the call lands: the registry resource and the typed method name. */
  target: { resource: string; method: string };
  /** The arguments the typed method will receive, in the registry's declaration order. */
  args: unknown[];
  /** The registry-declared checks, for a caller-side preview (deterministic, never invented). */
  checks: string[];
  /** Registry-derived impact description. */
  impact: { effect: 'read' | 'write' | 'destructive'; reversible: boolean; requiresApproval: boolean; flags: string[] };
}

// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The closed input contract of one operation, or null when the projection served none. */
function contractOf(operation: string): InputJsonSchema | null {
  const contract = INPUT_CONTRACTS[operation];
  if (contract === undefined) return null;
  return contract.schema.type === undefined ? { ...contract.schema, type: 'object' } : contract.schema;
}

/** The declared (closed) field names of one operation's input contract. */
export function inputContractKeys(operation: string): string[] {
  const schema = contractOf(operation);
  if (schema === null || schema.properties === undefined) return [];
  return Object.keys(schema.properties);
}

function refuse(operation: string, code: RefusalCode, message: string, suggestedAction?: string): KimaiConfigError {
  return new KimaiConfigError(message, {
    operation,
    code,
    ...(suggestedAction === undefined ? {} : { suggestedAction }),
  });
}

// ---------------------------------------------------------------------------
// The closed-key refusal (the shared shape of the siblings' unknownKeysRefusal).
// ---------------------------------------------------------------------------

/**
 * The typed refusal for an input whose keys are not all in the operation's CLOSED contract, or
 * `null` when every key is declared. Non-objects are a shape error the caller's own check refuses,
 * so this returns `null` for them (matching the sibling signature: an error-or-null, never a
 * throw).
 *
 * Names the unknown key(s) and the valid keys — NEVER a value (redaction discipline).
 */
export function unknownKeysRefusal(record: CapabilityRecord, input: unknown): KimaiConfigError | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const valid = inputContractKeys(record.id);
  const unknown = Object.keys(input).filter((key) => !valid.includes(key));
  if (unknown.length === 0) return null;
  const suggestions = unknown
    .map((key) => [key, suggestKey(key, valid)] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== null)
    .map(([key, suggestion]) => '"' + key + '" -> "' + suggestion + '"');
  return refuse(
    record.id,
    REFUSAL_CODES.INVALID_INPUT,
    'operations.invoke: unknown input key(s) ' + unknown.map((key) => '"' + key + '"').join(', ') +
      ' for ' + record.id + ' — the input contract is closed (valid keys: ' + (valid.join(', ') || 'none') + ').',
    suggestions.length > 0
      ? 'Fix the key name (' + suggestions.join(', ') + '); the full contract is in the generated catalog (INPUT_CONTRACTS).'
      : 'Pass only the declared keys (' + (valid.join(', ') || 'none') + ').',
  );
}

/** The nearest declared key to an unknown one, or null when nothing is close enough to suggest. */
function suggestKey(key: string, valid: readonly string[]): string | null {
  const target = key.toLowerCase();
  let best: string | null = null;
  let bestScore = 0;
  for (const candidate of valid) {
    const lower = candidate.toLowerCase();
    let score = 0;
    if (lower === target) score = 3;
    else if (lower.startsWith(target) || target.startsWith(lower)) score = 2;
    else if (lower.includes(target) || target.includes(lower)) score = 1;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Validation against the closed contract.
// ---------------------------------------------------------------------------

/** The runtime name of a value for a refusal message (a non-finite number is named literally). */
function runtimeTypeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return typeof value;
}

/** True for a record identifier: a safe positive integer. */
function isRecordId(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** A resolve `identifier`: a bare number, or an object's `id`, must be a record identifier. */
function identifierIdOk(value: unknown): boolean {
  if (typeof value === 'number') return isRecordId(value);
  if (isObject(value) && value.id !== undefined) return isRecordId(value.id);
  return true;
}

/**
 * Validate a call against the operation's closed input contract, BEFORE any request. A refusal
 * names every offending field path; nothing about it is a guess and nothing is clamped.
 *
 * A `dry_run` / `confirm` key in the payload is refused: those belong to `InvokeOptions`, and
 * accepting a second spelling would mean a caller could believe a write was acknowledged when it
 * was not.
 */
export function validateInvokeInput(record: CapabilityRecord, input: unknown): InvokeVerdict {
  const schema = contractOf(record.id);
  if (schema === null) {
    return {
      ok: false,
      code: 'CONFIG_ERROR',
      problems: [],
      message:
        'operations.invoke: the generated catalog serves no closed input contract for ' + record.id +
        ', so its input cannot be validated. Refusing rather than validating nothing.',
    };
  }
  if (input !== undefined && input !== null && !isObject(input)) {
    return {
      ok: false,
      code: 'CONFIG_ERROR',
      problems: [],
      message: 'operations.invoke: input for ' + record.id + ' must be an object of the operation\'s arguments (got ' + runtimeTypeOf(input) + ').',
    };
  }
  const bag: Record<string, unknown> = isObject(input) ? input : {};
  const unknown = unknownKeysRefusal(record, bag);
  if (unknown !== null) {
    return { ok: false, code: 'CONFIG_ERROR', problems: unknownInputProblems(record, bag), message: unknown.message };
  }
  const required = Array.isArray(schema.required) ? schema.required : [];
  const problems: InvokeProblem[] = [];
  for (const name of required) {
    if (bag[name] === undefined) problems.push({ path: name, message: 'required' });
  }
  // Record identifiers become request path segments: each must be a safe positive integer.
  for (const [name, value] of Object.entries(bag)) {
    if (value === undefined) continue;
    if (/^id$|Id$|_id$/.test(name) && !isRecordId(value)) {
      problems.push({ path: name, message: 'must be a positive integer' });
    } else if (name === 'identifier' && !identifierIdOk(value)) {
      problems.push({ path: 'identifier.id', message: 'must be a positive integer' });
    }
  }
  // NOTE: the contract's `type` keyword is the generator's rendering of the TypeScript type, and
  // a NAMED type (a string union, an interface) is rendered `object`. Enforcing it would refuse a
  // legitimate string id-union argument (measured: `actions.getActions` `resource`) — so this
  // validator enforces the CLOSED KEY SET and the REQUIRED set, which the registry states
  // reliably, and leaves value typing to the typed method the call lands on. Refusing on a
  // mis-rendered type would be stricter than the method this must mirror.
  if (problems.length > 0) {
    return {
      ok: false,
      code: 'CONFIG_ERROR',
      problems,
      message:
        'operations.invoke: invalid input for ' + record.id + ' — ' +
        problems.map((problem) => problem.path + ': ' + problem.message).join('; ') + '. No request was issued.',
    };
  }
  return { ok: true, code: null, problems: [], message: 'ok' };
}

/** One problem per unknown key, for the verdict's structured shape (the refusal message is shared). */
function unknownInputProblems(record: CapabilityRecord, bag: Record<string, unknown>): InvokeProblem[] {
  const valid = inputContractKeys(record.id);
  const problems: InvokeProblem[] = [];
  for (const key of Object.keys(bag)) {
    if (!valid.includes(key)) problems.push({ path: key, message: 'unknown key (valid keys: ' + (valid.join(', ') || 'none') + ')' });
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Resolution: registry key -> the typed method.
// ---------------------------------------------------------------------------

/** `approval_bundle` -> `approvalBundle`: the client property a registry resource maps to. */
function clientProperty(resource: string): string {
  return resource.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/**
 * The typed method a registry record dispatches to, bound to its resource object.
 *
 * Resolution is mechanical (`resource` -> the client property, `operation` -> the method), and it
 * is not taken on trust: a record whose target is missing is a `CONFIG_ERROR` naming the drift,
 * never a `TypeError` at the call site.
 */
export function resolveInvokeTarget(client: ApiClient, record: CapabilityRecord): (...args: unknown[]) => Promise<unknown> {
  const property = clientProperty(record.resource);
  const holder = (client as unknown as Record<string, unknown>)[property];
  if (holder === undefined || holder === null) {
    throw refuse(
      record.id,
      REFUSAL_CODES.INVALID_INPUT,
      'operations.invoke: ' + record.id + ' names resource "' + record.resource + '", but the client has no "' +
        property + '" resource. The registry and the implementation have drifted.',
    );
  }
  const candidate = (holder as Record<string, unknown>)[record.operation];
  if (typeof candidate !== 'function') {
    throw refuse(
      record.id,
      REFUSAL_CODES.INVALID_INPUT,
      'operations.invoke: ' + record.id + ' names method "' + record.operation + '()" on resource "' + record.resource +
        '", but it does not exist. The registry and the implementation have drifted.',
      'Call the typed resource client directly; report the registry drift.',
    );
  }
  const bound = (candidate as (...args: unknown[]) => unknown).bind(holder);
  return async (...args: unknown[]): Promise<unknown> => bound(...args);
}

/** The `{ resource, method }` a record dispatches to (the plan's target description). */
export function invokeTargetDescription(record: CapabilityRecord): { resource: string; method: string } {
  return { resource: record.resource, method: record.operation };
}

// ---------------------------------------------------------------------------
// The streaming-scan refusal.
// ---------------------------------------------------------------------------

/**
 * Registry-derived: a registry operation whose typed method returns a STREAMING scan. The
 * registry names those operations `list` (`listPages` is the same family). This is a rule about
 * the method's SHAPE, not a hand-written operation-key list — the key still comes from the
 * registry, and `isAsyncIterable` backstops any future stream-producing method whatever its name.
 */
export function isStreamingOperation(record: CapabilityRecord): boolean {
  return record.operation === 'list' || record.operation === 'listPages';
}

/** True for the lazy streaming result of the SDK's `list()` / `listPages()` family. */
function isAsyncIterable(value: unknown): boolean {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === 'function'
  );
}

/** The bounded alternative this resource offers, named from the registry, never hand-written. */
function boundedAlternative(record: CapabilityRecord): string {
  const search = getCapability(record.resource + '.search');
  if (search === undefined) {
    return 'Call the typed `' + record.resource + ".listAll(...)` to collect it into an array, or the resource's bounded helper with an explicit limit.";
  }
  const tool = EXPOSED[search.id];
  const named = tool === undefined
    ? 'operations.invoke("' + search.id + '", ...)'
    : 'the ' + tool + ' tool (operations.invoke("' + search.id + '", ...))';
  return 'Use the bounded read instead: ' + named + '.';
}

/**
 * The refusal for a streaming scan. The dispatcher is REQUEST-SCOPED: collecting a stream means
 * owning pagination and a bound, which this module deliberately does not. Returning the iterator
 * itself is worse than refusing — JSON serialises it as `{}`, a result that looks like data and
 * carries none — so an invoke of a `list()`-shaped operation stops here, request-free.
 */
export function streamRefusal(record: CapabilityRecord): string {
  return (
    'operations.invoke: ' + record.id + ' returns an AsyncIterable (a streaming scan), not a call result. ' +
    'The dispatcher is request-scoped and owns no pagination, so it will not collect a stream into an array — ' +
    'and handing the iterator back would serialise as {}. Nothing was sent to Kimai. ' + boundedAlternative(record)
  );
}

/**
 * The shared refusal for a streaming target: a `CONFIG_ERROR` naming the bounded alternative. The
 * message is REQUEST-FREE — an async generator (and a method that returns one) does no work until
 * it is iterated.
 */
function refuseStream(operation: string, record: CapabilityRecord): never {
  throw refuse(operation, REFUSAL_CODES.INVALID_INPUT, streamRefusal(record), 'Call the bounded alternative named in the message; nothing was sent to Kimai.');
}

// ---------------------------------------------------------------------------
// Governance + arguments.
// ---------------------------------------------------------------------------

/** True for an operation that needs a deliberate act before it runs. */
export function needsConfirmation(record: CapabilityRecord): boolean {
  return record.effect === 'destructive' || (record.flags ?? []).includes('requiresApproval');
}

/**
 * The `opts` argument a typed method expects, built from the caller's contract fields and the
 * invoke options. Reads take only the helper affordances the record declares (`limit`, `expand`,
 * `resolution_details` -> `resolutionDetails`); writes/destructive take `{ dryRun }` only.
 */
function buildOptions(
  record: CapabilityRecord,
  input: Record<string, unknown>,
  options: InvokeOptions,
): Record<string, unknown> | undefined {
  if (record.effect !== 'read') return { dryRun: options.dryRun !== false };
  const bag = contractOf(record.id)?.properties ?? {};
  const opts: Record<string, unknown> = {};
  if (bag.limit !== undefined && input.limit !== undefined) opts.limit = input.limit;
  if (bag.expand !== undefined && input.expand !== undefined) opts.expand = input.expand;
  if (bag.resolution_details !== undefined && input.resolution_details !== undefined) opts.resolutionDetails = input.resolution_details;
  return Object.keys(opts).length > 0 ? opts : undefined;
}

/** The positional arguments for the typed method, in the registry's declaration order. */
function buildArgs(record: CapabilityRecord, input: Record<string, unknown>, options: InvokeOptions): unknown[] {
  const args: unknown[] = [];
  for (const field of Object.keys(record.inputSchema)) {
    if (field === 'opts') {
      args.push(buildOptions(record, input, options));
      continue;
    }
    args.push(input[field]);
  }
  return args;
}

/**
 * Validate and govern one call WITHOUT dispatching it: the pure half of `invokeOperation`, split
 * out so the governor's decisions can be exercised directly. It resolves the target method too
 * (so a registry/implementation drift is a REFUSAL, not a late `TypeError`) but never touches the
 * transport.
 *
 * Order is part of the contract: RESOLVE (unknown key, the projection's refusals), VALIDATE
 * (closed contract), GOVERN (confirmation, dry-run). A refusal is a `KimaiConfigError` and no
 * request is ever built, let alone issued.
 */
export function planInvoke(
  client: ApiClient,
  operation: string,
  input: Record<string, unknown> = {},
  options: InvokeOptions = {},
): InvokePlan {
  const record = resolveOperation(operation);
  // Resolve the target FIRST: a registry/method drift must be a refusal even in the planning path.
  resolveInvokeTarget(client, record);
  if (isStreamingOperation(record)) refuseStream(operation, record);
  const verdict = validateInvokeInput(record, input);
  if (!verdict.ok) {
    throw refuse(operation, REFUSAL_CODES.INVALID_INPUT, verdict.message, 'Fix the named field(s); nothing was sent to Kimai.');
  }
  if (options.confirm !== undefined && options.confirm !== operation) {
    throw refuse(
      operation,
      REFUSAL_CODES.INVALID_INPUT,
      'operations.invoke: confirm must equal the operation key exactly to acknowledge ' + record.id + ' (got ' +
        JSON.stringify(options.confirm) + ').',
    );
  }
  const effect = record.effect;
  let execute = true;
  if (effect === 'read') {
    if (options.dryRun === true) {
      throw refuse(
        operation,
        REFUSAL_CODES.INVALID_INPUT,
        'operations.invoke: ' + record.id + ' is a read; a read has no dry run. Call it without { dryRun: true }.',
      );
    }
  } else {
    if (needsConfirmation(record) && options.confirm !== operation) {
      throw refuse(
        operation,
        REFUSAL_CODES.INVALID_INPUT,
        'operations.invoke: ' + record.id + ' is ' + effect + ' (or approval-gated) and needs a deliberate act: pass ' +
          '{ confirm: "' + record.id + '" }. Refusing without it.',
      );
    }
    if (record.dryRun !== true || record.inputSchema.opts === undefined) {
      throw refuse(
        operation,
        REFUSAL_CODES.INVALID_INPUT,
        'operations.invoke: ' + record.id + ' is a write whose registry schema exposes no dry-run option, so this ' +
          'dispatcher cannot force it through the SDK dry-run path. It is not invocable; call the typed method.',
        'Call the typed method directly.',
      );
    }
    execute = options.dryRun === false;
  }
  const bag: Record<string, unknown> = isObject(input) ? input : {};
  const required = contractOf(record.id)?.required ?? [];
  const checks: string[] = [
    'effect: ' + effect,
    'closed contract: ' + inputContractKeys(record.id).length + ' declared field(s)',
    'required: ' + (required.length > 0 ? required.join(', ') : 'none'),
    effect === 'read' ? 'no dry run (reads never mutate)' : execute ? 'LIVE call (dryRun: false)' : 'dry run (no wire call)',
  ];
  if (needsConfirmation(record)) checks.push('confirmation required (confirm: ' + record.id + ')');
  return {
    operation,
    effect,
    execute,
    dryRunSupported: record.dryRun === true,
    dryRun: effect === 'read' ? false : !execute,
    target: invokeTargetDescription(record),
    args: buildArgs(record, bag, options),
    checks,
    impact: { effect, reversible: effect !== 'destructive', requiresApproval: needsConfirmation(record), flags: record.flags ?? [] },
  };
}

// ---------------------------------------------------------------------------
// The dispatcher.
// ---------------------------------------------------------------------------

/** Resolve a canonical registry key, refusing an unknown one by naming the nearest keys. */
export function resolveOperation(operation: string): CapabilityRecord {
  if (typeof operation !== 'string' || operation.length === 0) {
    throw refuse(
      String(operation),
      REFUSAL_CODES.UNKNOWN_OPERATION,
      'operations.invoke: operation must be a non-empty registry key, for example "timesheets.search".',
      'Use an exact key from the capability catalog (`kimai_catalog` in the MCP layer).',
    );
  }
  const record = getCapability(operation);
  if (record !== undefined) return record;
  const near = nearestKeys(operation, 5);
  throw refuse(
    operation,
    REFUSAL_CODES.UNKNOWN_OPERATION,
    'operations.invoke: unknown operation "' + operation + '". Operation keys are exact registry keys (never a ' +
      'method name, never fuzzy). Nearest keys: ' + (near.length > 0 ? near.join(', ') : '(none)') + '.',
    'Use an exact key from the capability catalog (`kimai_catalog` in the MCP layer).',
  );
}

/** Resolve, validate, govern and dispatch one registry operation. */
export async function invokeOperation(
  client: ApiClient,
  operation: string,
  input: Record<string, unknown> = {},
  options: InvokeOptions = {},
): Promise<unknown> {
  const record = resolveOperation(operation);
  const refusal = REFUSALS[operation];
  if (refusal !== undefined) {
    throw refuse(
      operation,
      REFUSAL_CODES.UNREACHABLE_OPERATION,
      'Operation "' + operation + '" is outside the served surface: ' + refusal.reason,
      refusal.alternative === null || refusal.alternative === undefined
        ? 'Use the bounded alternative this operation points at; it is not dispatchable.'
        : refusal.alternative,
    );
  }
  const plan = planInvoke(client, operation, input, options);
  const target = resolveInvokeTarget(client, record);
  const result = await target(...plan.args);
  // Backstop: any method that returns a stream, whatever its name (a `list` op already refused above).
  if (isAsyncIterable(result)) refuseStream(operation, record);
  return result;
}
