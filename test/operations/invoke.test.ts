// `node-kimai/operations` - the generic, registry-validated invoke path.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { KimaiConfigError } from '../../src/errors';
import {
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
} from '../../src/operations/index';
import { getCapability } from '../../src/capabilities';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

let client: ApiClient;
let transport: { request: ReturnType<typeof vi.fn> };

beforeEach(() => {
  transport = { request: vi.fn().mockResolvedValue({ ok: true }) };
  client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: transport as never });
});

describe('invokeOperation - reads', () => {
  it('dispatches a read to the typed method and returns its result', async () => {
    transport.request.mockResolvedValueOnce({ colors: 1 });
    const result = await invokeOperation(client, 'config.getColors');
    expect(result).toEqual({ colors: 1 });
    expect(transport.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/config/colors', query: undefined });
  });

  it('maps the closed contract fields onto the typed method in declaration order', async () => {
    transport.request.mockResolvedValueOnce([]);
    await invokeOperation(client, 'actions.getActions', {
      resource: 'timesheet',
      id: 5,
      view: 'compact',
      locale: 'en',
    });
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/actions/timesheet/5/compact/en',
      query: undefined,
    });
  });

  it('refuses a read with { dryRun: true } (a read has no dry run)', async () => {
    const err = await invokeOperation(client, 'config.getColors', {}, { dryRun: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KimaiConfigError);
    expect((err as KimaiConfigError).message).toContain('a read has no dry run');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('passes the helper affordances to the typed helper method as its opts bag', async () => {
    const spy = vi.spyOn(client.activities, 'search').mockResolvedValue([] as never);
    await invokeOperation(client, 'activities.search', { params: {}, limit: 5 });
    expect(spy).toHaveBeenCalledWith({}, { limit: 5 });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('invokeOperation - writes are dry-run-first', () => {
  it('defaults a write to the SDK dry-run path: NO wire call, a DryRunResult', async () => {
    const result = (await invokeOperation(client, 'timesheets.create', {
      input: { project: 1, activity: 1, begin: '2026-01-01T09:00:00Z' },
    })) as { simulated?: boolean; operation?: string };
    expect(result.simulated).toBe(true);
    expect(result.operation).toBe('timesheets.create');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('executes a write only on an explicit dryRun: false', async () => {
    transport.request.mockResolvedValueOnce({ id: 1 });
    await invokeOperation(
      client,
      'timesheets.create',
      { input: { project: 1, activity: 1, begin: '2026-01-01T09:00:00Z' } },
      { dryRun: false },
    );
    expect(transport.request).toHaveBeenCalledTimes(1);
    const call = transport.request.mock.calls[0]![0] as { method: string; path: string };
    expect(call.method).toBe('POST');
    expect(call.path).toBe('/api/timesheets');
  });

  it('refuses a destructive operation without its exact confirmation flag', async () => {
    const err = await invokeOperation(client, 'timesheets.delete', { id: 7 }, { dryRun: false }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KimaiConfigError);
    expect((err as KimaiConfigError).message).toContain('deliberate act');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('executes a destructive operation with the exact confirmation flag', async () => {
    transport.request.mockResolvedValueOnce(undefined);
    await invokeOperation(client, 'timesheets.delete', { id: 7 }, { confirm: 'timesheets.delete', dryRun: false });
    expect(transport.request).toHaveBeenCalledWith({ method: 'DELETE', path: '/api/timesheets/7', query: undefined, body: undefined });
  });

  it('refuses a confirm that names a different operation', async () => {
    const err = await invokeOperation(client, 'config.getColors', {}, { confirm: 'other.op' }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('confirm must equal the operation key exactly');
  });
});

describe('invokeOperation - refusals, zero wire', () => {
  it('refuses an unknown operation and names the nearest key', async () => {
    const err = await invokeOperation(client, 'timesheet.stop').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe(REFUSAL_CODES.UNKNOWN_OPERATION);
    expect((err as KimaiConfigError).message).toContain('timesheets.stop');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('refuses an empty operation key', async () => {
    const err = await invokeOperation(client, '').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe(REFUSAL_CODES.UNKNOWN_OPERATION);
    expect((err as KimaiConfigError).message).toContain('non-empty registry key');
  });

  it('refuses an operation the catalog marks unreachable, with the recorded reason', async () => {
    const err = await invokeOperation(client, 'invoices.download', { id: 1 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe(REFUSAL_CODES.UNREACHABLE_OPERATION);
    expect((err as KimaiConfigError).message).toContain('binary/download');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('refuses an unknown input key (closed contract)', async () => {
    const err = await invokeOperation(client, 'activities.get', { id: 1, nope: 2 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).message).toContain('unknown input key');
    expect((err as KimaiConfigError).message).toContain('valid keys: id');
  });

  it('refuses a missing required input key', async () => {
    const err = await invokeOperation(client, 'activities.get', {}).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('id: required');
  });

  it('refuses a non-object input', async () => {
    const err = await invokeOperation(client, 'activities.get', 'one' as never).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('must be an object');
  });

  it('refuses a dry_run key smuggled into the payload', async () => {
    const err = await invokeOperation(client, 'timesheets.create', { input: {}, dry_run: true }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('unknown input key');
    expect((err as KimaiConfigError).message).toContain('dry_run');
  });
});

describe('invokeOperation - streaming scans are refused (request-free)', () => {
  it('refuses a list operation before any wire call, naming the bounded search alternative', async () => {
    const err = await invokeOperation(client, 'activities.list', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KimaiConfigError);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).message).toContain('AsyncIterable');
    expect((err as KimaiConfigError).message).toContain('activities.search');
    expect((err as KimaiConfigError).message).toContain('kimai_search_activities');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('refuses a list operation in the planning path as well', () => {
    expect(() => planInvoke(client, 'activities.list', {})).toThrow(/AsyncIterable/);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('names the listAll collector when the resource has no search helper', async () => {
    const err = await invokeOperation(client, 'teams.list', {}).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('teams.listAll');
    expect((err as KimaiConfigError).message).toContain('explicit limit');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('refuses a stream returned by a method that is not named list (backstop)', async () => {
    const gen = async function* () {
      yield 1;
    };
    vi.spyOn(client.activities, 'get').mockImplementation(gen as never);
    const err = await invokeOperation(client, 'activities.get', { id: 1 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('AsyncIterable');
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('invokeOperation - registry / implementation drift', () => {
  it('refuses when the client has no such resource', async () => {
    const err = await invokeOperation({} as ApiClient, 'activities.get', { id: 1 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).message).toContain('drifted');
  });

  it('refuses when the resource has no such method', async () => {
    (client.activities as unknown as Record<string, unknown>).get = undefined;
    const err = await invokeOperation(client, 'activities.get', { id: 1 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).message).toContain('does not exist');
  });
});

describe('planInvoke - validate + describe, no wire call', () => {
  it('plans a read and maps the helper affordances without touching the transport', () => {
    const plan = planInvoke(client, 'activities.search', { params: { term: 'x' }, limit: 5, expand: true });
    expect(plan.operation).toBe('activities.search');
    expect(plan.effect).toBe('read');
    expect(plan.execute).toBe(true);
    expect(plan.dryRunSupported).toBe(false);
    expect(plan.target).toEqual({ resource: 'activities', method: 'search' });
    expect(plan.args).toEqual([{ term: 'x' }, { limit: 5, expand: true }]);
    expect(plan.checks.join(' ')).toContain('no dry run');
    expect(plan.impact).toEqual({ effect: 'read', reversible: true, requiresApproval: false, flags: [] });
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('maps resolution_details onto resolutionDetails', () => {
    const plan = planInvoke(client, 'activities.resolve', { identifier: { id: 1 }, resolution_details: true });
    expect(plan.args).toEqual([{ id: 1 }, { resolutionDetails: true }]);
  });

  it('omits the opts arg when no helper affordance was supplied', () => {
    const plan = planInvoke(client, 'activities.resolve', { identifier: { id: 1 } });
    expect(plan.args).toEqual([{ id: 1 }, undefined]);
  });

  it('plans a write as a dry run by default', () => {
    const plan = planInvoke(client, 'timesheets.update', { id: 1, input: { description: 'x' } });
    expect(plan.execute).toBe(false);
    expect(plan.dryRun).toBe(true);
    expect(plan.dryRunSupported).toBe(true);
    expect(plan.args).toEqual([1, { description: 'x' }, { dryRun: true }]);
    expect(plan.checks.join(' ')).toContain('dry run (no wire call)');
  });

  it('plans a write as a live call on dryRun: false', () => {
    const plan = planInvoke(client, 'timesheets.update', { id: 1, input: { description: 'x' } }, { dryRun: false });
    expect(plan.execute).toBe(true);
    expect(plan.dryRun).toBe(false);
    expect(plan.args).toEqual([1, { description: 'x' }, { dryRun: false }]);
    expect(plan.checks.join(' ')).toContain('LIVE call');
  });

  it('plans a destructive call and records the confirmation check', () => {
    const plan = planInvoke(client, 'timesheets.delete', { id: 3 }, { confirm: 'timesheets.delete' });
    expect(plan.impact.reversible).toBe(false);
    expect(plan.impact.requiresApproval).toBe(true);
    expect(plan.checks.join(' ')).toContain('confirmation required (confirm: timesheets.delete)');
  });

  it('refuses a plan whose target method is missing', () => {
    (client.tags as unknown as Record<string, unknown>).find = undefined;
    expect(() => planInvoke(client, 'tags.find', { name: 'x' })).toThrow(KimaiConfigError);
  });
});

describe('small exported helpers', () => {
  it('resolveOperation returns the registry record', () => {
    expect(resolveOperation('activities.get').id).toBe('activities.get');
  });

  it('exposes the target description and the confirmation predicate', () => {
    const record = getCapability('timesheets.delete');
    expect(record).toBeDefined();
    expect(invokeTargetDescription(record!)).toEqual({ resource: 'timesheets', method: 'delete' });
    expect(needsConfirmation(record!)).toBe(true);
    expect(needsConfirmation(getCapability('activities.get')!)).toBe(false);
    expect(typeof resolveInvokeTarget(client, record!)).toBe('function');
  });

  it('inputContractKeys lists the closed fields', () => {
    expect(inputContractKeys('activities.get')).toEqual(['id']);
    expect(inputContractKeys('config.getColors')).toEqual([]);
  });

  it('unknownKeysRefusal returns null for a clean or non-object input', () => {
    const record = getCapability('activities.get')!;
    expect(unknownKeysRefusal(record, { id: 1 })).toBeNull();
    expect(unknownKeysRefusal(record, 'nope')).toBeNull();
    expect(unknownKeysRefusal(record, null)).toBeNull();
    expect(unknownKeysRefusal(record, [1])).toBeNull();
  });

  it('unknownKeysRefusal suggests the nearest valid key when one is close', () => {
    const record = getCapability('activities.get')!;
    const err = unknownKeysRefusal(record, { id: 1, idx: 2 });
    expect(err).toBeInstanceOf(KimaiConfigError);
    expect(err!.message).toContain('"idx"');
    expect(err!.suggestedAction).toContain('-> "id"');
  });

  it('unknownKeysRefusal offers no suggestion when nothing is close', () => {
    const err = unknownKeysRefusal(getCapability('activities.get')!, { id: 1, zzzz: 2 });
    expect(err!.suggestedAction).toContain('Pass only the declared keys');
  });

  it('validateInvokeInput refuses a record with no served contract', () => {
    const fake = { id: 'not.a.real.op' } as never;
    const verdict = validateInvokeInput(fake, {});
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain('no closed input contract');
  });

  it('validateInvokeInput reports a clean verdict', () => {
    const verdict = validateInvokeInput(getCapability('activities.get')!, { id: 1 });
    expect(verdict).toEqual({ ok: true, code: null, problems: [], message: 'ok' });
  });

  it('publishes the refusal codes', () => {
    expect(REFUSAL_CODES.UNKNOWN_OPERATION).toBe('UNKNOWN_OPERATION');
    expect(REFUSAL_CODES.UNREACHABLE_OPERATION).toBe('UNREACHABLE_OPERATION');
    expect(REFUSAL_CODES.DISPATCHER_EFFECT).toBe('DISPATCHER_EFFECT');
  });
});
