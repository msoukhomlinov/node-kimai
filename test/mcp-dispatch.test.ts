// `node-kimai/mcp` dispatch: the exact effect boundary before invocation.
import { describe, it, expect, vi } from 'vitest';
import { dispatchOperation, type DispatchTarget } from '../src/mcp/index';
import { KimaiConfigError, ApiError } from '../src/errors';

function target(): DispatchTarget & { invoke: ReturnType<typeof vi.fn> } {
  return { invoke: vi.fn(async () => ({ ok: true })) } as unknown as DispatchTarget & { invoke: ReturnType<typeof vi.fn> };
}

describe('dispatchOperation', () => {
  it('passes a matching operation through to the host invoker', async () => {
    const t = target();
    await expect(dispatchOperation(t, 'read', 'timesheets.search', { params: {} })).resolves.toEqual({ ok: true });
    expect(t.invoke).toHaveBeenCalledWith('timesheets.search', { params: {} });
  });

  it('defaults input to an empty record', async () => {
    const t = target();
    await dispatchOperation(t, 'write', 'timesheets.create');
    expect(t.invoke).toHaveBeenCalledWith('timesheets.create', {});
  });

  it('refuses an operation whose registry effect differs from the dispatcher effect', async () => {
    const t = target();
    await expect(dispatchOperation(t, 'read', 'timesheets.create')).rejects.toThrow(KimaiConfigError);
    await expect(dispatchOperation(t, 'write', 'timesheets.create')).resolves.toBeDefined();
    const err = await dispatchOperation(t, 'write', 'users.deleteApiToken').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as KimaiConfigError).code).toBe('DISPATCHER_EFFECT');
    expect((err as KimaiConfigError).suggestedAction).toContain('destructive');
  });

  it('refuses an unknown effect', async () => {
    const err = await dispatchOperation(target(), 'admin' as never, 'timesheets.search').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('DISPATCHER_EFFECT');
    expect((err as KimaiConfigError).message).toContain('read, write, destructive');
  });

  it('refuses an unknown operation key and names the nearest', async () => {
    const err = await dispatchOperation(target(), 'read', 'timesheet.stop').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('UNKNOWN_OPERATION');
    expect((err as KimaiConfigError).message).toContain('timesheets.stop');
  });

  it('refuses an operation the projection refuses outright', async () => {
    const err = await dispatchOperation(target(), 'read', 'invoices.download').catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('UNREACHABLE_OPERATION');
    expect((err as KimaiConfigError).message).toContain('binary/download');
  });

  it('never invokes the host invoker on a refusal', async () => {
    const t = target();
    await dispatchOperation(t, 'read', 'timesheets.create').catch(() => undefined);
    expect(t.invoke).not.toHaveBeenCalled();
  });
});
