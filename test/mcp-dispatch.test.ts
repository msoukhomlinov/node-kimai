// `node-kimai/mcp` dispatch: the effect boundary + delegation to the ONE governance path.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchOperation, type DispatchClient } from '../src/mcp/index';
import { invokeOperation } from '../src/operations/index';
import { ApiClient } from '../src/client';
import { KimaiConfigError, ApiError } from '../src/errors';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

let client: ApiClient;
let transport: { request: ReturnType<typeof vi.fn> };

beforeEach(() => {
  transport = { request: vi.fn().mockResolvedValue({ ok: true }) };
  client = new ApiClient({ baseUrl: BASE_URL, token: TOKEN, transport: transport as never });
});

describe('dispatchOperation - effect boundary', () => {
  it('refuses an unknown effect', async () => {
    const err = await dispatchOperation(client, 'admin' as never, 'activities.get').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('DISPATCHER_EFFECT');
    expect((err as KimaiConfigError).message).toContain('read, write, destructive');
  });

  it('refuses an operation whose registry effect differs from the dispatcher effect', async () => {
    const err = await dispatchOperation(client, 'read', 'timesheets.create').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as KimaiConfigError).code).toBe('DISPATCHER_EFFECT');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('names the required dispatcher for a mismatched effect', async () => {
    const err = await dispatchOperation(client, 'write', 'users.deleteApiToken').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('DISPATCHER_EFFECT');
    expect((err as KimaiConfigError).suggestedAction).toContain('destructive');
  });
});

describe('dispatchOperation - delegates to operations.invoke', () => {
  it('dispatches a matching read through to the typed method', async () => {
    transport.request.mockResolvedValueOnce({ red: '#f00' });
    await expect(dispatchOperation(client, 'read', 'config.getColors')).resolves.toEqual({ red: '#f00' });
    expect(transport.request).toHaveBeenCalledWith({ method: 'GET', path: '/api/config/colors', query: undefined });
  });

  it('defaults input to an empty record and options to a dry run', async () => {
    const result = (await dispatchOperation(client, 'write', 'timesheets.create', {
      input: { project: 1, activity: 1, begin: '2026-01-01T09:00:00Z' },
    })) as { simulated?: boolean };
    expect(result.simulated).toBe(true);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('forwards dryRun + confirm to the operations layer', async () => {
    transport.request.mockResolvedValueOnce(undefined);
    await dispatchOperation(client, 'destructive', 'timesheets.delete', { id: 3 }, { confirm: 'timesheets.delete', dryRun: false });
    expect(transport.request).toHaveBeenCalledWith({ method: 'DELETE', path: '/api/timesheets/3', query: undefined, body: undefined });
  });

  it('raises the operations layer refusal codes for an unknown key', async () => {
    const err = await dispatchOperation(client, 'read', 'timesheet.stop').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('UNKNOWN_OPERATION');
    expect((err as KimaiConfigError).message).toContain('timesheets.stop');
  });

  it('raises the operations layer refusal codes for an unreachable operation', async () => {
    const err = await dispatchOperation(client, 'read', 'invoices.download', { id: 1 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('UNREACHABLE_OPERATION');
    expect((err as KimaiConfigError).message).toContain('binary/download');
  });

  it('adds NO second validation path: the refusal is byte-identical to invokeOperation', async () => {
    const viaDispatch = await dispatchOperation(client, 'read', 'activities.get', { id: 1, nope: 2 }).catch((e: unknown) => e);
    const viaInvoke = await invokeOperation(client, 'activities.get', { id: 1, nope: 2 }).catch((e: unknown) => e);
    expect((viaDispatch as KimaiConfigError).code).toBe((viaInvoke as KimaiConfigError).code);
    expect((viaDispatch as KimaiConfigError).message).toBe((viaInvoke as KimaiConfigError).message);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('never touches the network on a refusal', async () => {
    await dispatchOperation(client, 'write', 'timesheets.update', { id: 1, input: {}, nope: 1 }).catch(() => undefined);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('accepts the SDK client as its DispatchClient shape', () => {
    const typed: DispatchClient = client;
    expect(typed).toBe(client);
  });
});
