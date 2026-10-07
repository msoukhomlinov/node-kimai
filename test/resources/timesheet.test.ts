// TimesheetClient tests - includes user-filter override and pagination
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/client';
import {
  ApiError,
  BadRequestError,
  createApiError,
  KimaiConfigError,
  NotFoundError,
  RateLimitError,
  ResolutionError,
  ServerError,
} from '../../src/errors';
import { CAPABILITY_GROUPS } from '../../src/capabilities';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

describe('TimesheetClient', () => {
  let client: ApiClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
  });

  describe('list', () => {
    it('should pass user=all when no user filter given', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all' },
      });
    });

    it('should NOT override user when user filter is provided', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list({ user: 5 });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.user).toBe(5);
    });

    it('should NOT override user when users[] filter is provided', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list({ users: [1, 2] });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.users).toEqual([1, 2]);
      expect(call.query.user).toBeUndefined();
    });

    it('should pass additional query params', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list({ begin: '2024-01-01', end: '2024-01-31' });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.user).toBe('all');
      expect(call.query.begin).toBe('2024-01-01');
      expect(call.query.end).toBe('2024-01-31');
    });
  });

  describe('getAll', () => {
    it('should pass user=all and paginate until empty', async () => {
      const page1 = loadFixture('timesheet');
      const emptyPage: unknown[] = [];

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(emptyPage);

      // Use size=1 so 2 items triggers pagination
      const result = await client.timesheets.getAll({ size: 1 });

      // First call with page=1, size=1, user=all
      expect(transport.request).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all', page: 1, size: 1 },
      });
      // Second call with page=2
      expect(transport.request).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all', page: 2, size: 1 },
      });
      expect(result).toEqual(page1);
    });

    it('should paginate until less than size returned', async () => {
      const fixture = loadFixture('timesheet') as unknown[];
      const page1 = fixture; // 2 items - equals size=2, continue
      const page2 = [fixture[0]]; // 1 item - less than size=2, stop

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await client.timesheets.getAll({ size: 2 });

      expect(transport.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual([...page1, ...page2]);
    });

    it('should respect custom page and size params', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getAll({ page: 5, size: 200 });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.page).toBe(5);
      expect(call.query.size).toBe(200);
    });

    it('should NOT override user when user filter provided', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getAll({ user: 3 });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.user).toBe(3);
    });
  });

  describe('listPages', () => {
    it('should yield pages as async iterable', async () => {
      const fixture = loadFixture('timesheet') as unknown[];
      const page1 = fixture; // 2 items - equals size=2, continue
      const page2 = [fixture[0]]; // 1 item - less than size=2, stop

      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const pages: unknown[][] = [];
      for await (const page of client.timesheets.listPages({ size: 2 })) {
        pages.push(page as unknown[]);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0]).toEqual(page1);
      expect(pages[1]).toEqual(page2);
    });

    it('should pass user=all by default', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      (async () => {
        for await (const _ of client.timesheets.listPages()) {
          // consume
        }
      })();

      await vi.waitFor(() => {
        expect(transport.request).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ user: 'all' }) }),
        );
      });
    });

    it('should stop on empty page', async () => {
      const page1 = loadFixture('timesheet');
      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce([]);

      const pages: unknown[][] = [];
      for await (const page of client.timesheets.listPages()) {
        pages.push(page as unknown[]);
      }

      expect(pages).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('should call GET /api/timesheets/{id}', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/1',
      });
    });
  });

  describe('create', () => {
    it('should call POST /api/timesheets', async () => {
      const fixture = loadFixture('timesheet_created');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { activity: 1, project: 1, begin: '2024-01-15T09:00:00+00:00' };
      await client.timesheets.create(input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/timesheets',
        body: input,
      });
    });
  });

  describe('update', () => {
    it('should call PATCH /api/timesheets/{id}', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { description: 'Updated', activity: 1, project: 1 };
      await client.timesheets.update(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1',
        body: input,
      });
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/timesheets/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.timesheets.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/timesheets/1',
      });
    });
  });

  describe('updateMeta', () => {
    it('should call PATCH /api/timesheets/{id}/meta', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.updateMeta(1, { tool: 'VSCode' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/meta',
        body: { tool: 'VSCode' },
      });
    });
  });

  describe('getActive', () => {
    it('should call GET /api/timesheets/active without page params', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getActive();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/active',
        query: undefined,
      });
    });
  });

  describe('getRecent', () => {
    it('should call GET /api/timesheets/recent without page params', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getRecent();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/recent',
        query: undefined,
      });
    });
  });

  describe('stop', () => {
    it('should call PATCH /api/timesheets/{id}/stop', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.stop(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/stop',
      });
    });
  });

  describe('restart', () => {
    it('should call PATCH /api/timesheets/{id}/restart without body', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.restart(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/restart',
        body: undefined,
      });
    });

    it('should call PATCH /api/timesheets/{id}/restart with begin', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.restart(1, { begin: '2024-01-15T10:00:00+00:00' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/restart',
        body: { begin: '2024-01-15T10:00:00+00:00' },
      });
    });
  });

  describe('duplicate', () => {
    it('should call PATCH /api/timesheets/{id}/duplicate', async () => {
      const fixture = loadFixture('timesheet_created');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.duplicate(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/duplicate',
      });
    });
  });

  describe('toggleExport', () => {
    it('should call PATCH /api/timesheets/{id}/export', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.toggleExport(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/export',
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Phase F (agent execution layer, pilot: timesheets).
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: timesheets).
// ---------------------------------------------------------------------------

/** A timesheet with numeric references (the getContext reference reads). */
const PHASE_F_TIMESHEET = {
  id: 20,
  begin: '2026-01-01T10:00:00Z',
  end: '2026-01-01T11:00:00Z',
  duration: 3600,
  break: 0,
  user: 1,
  activity: 2,
  project: 3,
  description: 'phase f',
  rate: 10,
  exported: false,
  billable: true,
  tags: ['x'],
} as const;

/** The compact projection the helpers return by default. */
const PHASE_F_SUMMARY = {
  id: 20,
  begin: '2026-01-01T10:00:00Z',
  end: '2026-01-01T11:00:00Z',
  duration: 3600,
  break: 0,
  user: 1,
  project: 3,
  activity: 2,
  description: 'phase f',
  rate: 10,
  exported: false,
  billable: true,
  tags: ['x'],
};

describe('TimesheetClient — Phase F agent execution layer', () => {
  let client: ApiClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
  });

  describe('timesheets.list (pinned rows)', () => {
    it('returns the unwrapped timesheets list', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      const rows = await client.timesheets.list({ page: 1, size: 2 });

      expect(rows).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all', page: 1, size: 2 },
      });
    });

    it('sends page/size and stops on a short page', async () => {
      const page1 = loadFixture('timesheet');
      transport.request
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce([]);

      const result = await client.timesheets.getAll({ size: 1 });

      expect(transport.request).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all', page: 1, size: 1 },
      });
      expect(transport.request).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        path: '/api/timesheets',
        query: { user: 'all', page: 2, size: 1 },
      });
      expect(transport.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual(page1);
    });
  });

  describe('timesheets.getById (pinned rows)', () => {
    it('returns the unwrapped timesheet record', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.getById(1);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/1',
      });
    });

    it('normalises a 404 into NOT_FOUND', async () => {
      transport.request.mockRejectedValueOnce(
        createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
      );

      const err = await client.timesheets.getById(404).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).code).toBe('NOT_FOUND');
      expect((err as NotFoundError).category).toBe('not_found');
      expect((err as NotFoundError).retryable).toBe(false);
    });
  });

  describe('timesheets.create (pinned rows)', () => {
    it('returns the created timesheet record', async () => {
      const fixture = loadFixture('timesheet_created');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { project: 1, activity: 1, begin: '2026-01-01T09:00:00Z' };
      const ts = await client.timesheets.create(input);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/timesheets',
        body: input,
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const input = { project: 1, activity: 1, begin: '2026-01-01T09:00:00Z' };
      const res = await client.timesheets.create(input, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.wouldApply).toBe(true);
      expect(res.operation).toBe('timesheets.create');
      expect(res.target).toEqual({ resource: 'timesheets', ids: [] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/timesheets' });
      expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(res.data).toEqual(input);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.update (pinned rows)', () => {
    it('returns the updated timesheet record', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { description: 'Updated', project: 1, activity: 1 };
      const ts = await client.timesheets.update(1, input);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1',
        body: input,
      });
    });

    it('dry-run issues no PATCH request and returns simulated: true', async () => {
      const input = { description: 'Updated', project: 1, activity: 1 };
      const res = await client.timesheets.update(1, input, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.update');
      expect(res.target).toEqual({ resource: 'timesheets', ids: [1] });
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1' });
      expect(res.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'required-fields', ok: true },
      ]);
      expect(res.data).toEqual(input);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.delete (pinned rows)', () => {
    it('resolves void after a successful delete', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.timesheets.delete(1);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/timesheets/1',
      });
    });

    it('dry-run issues no DELETE request and returns simulated: true', async () => {
      const res = await client.timesheets.delete(1, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.delete');
      expect(res.target).toEqual({ resource: 'timesheets', ids: [1] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/timesheets/1' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.duplicate (pinned rows)', () => {
    it('calls the duplicate endpoint and normalises the result', async () => {
      const fixture = loadFixture('timesheet_created');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.duplicate(1);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/duplicate',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.timesheets.duplicate(1, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.duplicate');
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1/duplicate' });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.toggleExport (pinned rows)', () => {
    it('calls the toggleExport endpoint and normalises the result', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.toggleExport(1);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/export',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.timesheets.toggleExport(1, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.toggleExport');
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1/export' });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.updateMeta (pinned rows)', () => {
    it('calls the updateMeta endpoint and normalises the result', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.updateMeta(1, { tool: 'VSCode' });

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/meta',
        body: { tool: 'VSCode' },
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.timesheets.updateMeta(1, { tool: 'VSCode' }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.updateMeta');
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1/meta' });
      expect(res.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'meta-fields', ok: true },
      ]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.restart (pinned rows)', () => {
    it('calls the restart endpoint and normalises the result', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.restart(1);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/restart',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.timesheets.restart(1, { copy: 'follow-up' }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.restart');
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1/restart' });
      expect(res.data).toEqual({ copy: 'follow-up' });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.stop (pinned rows)', () => {
    it('calls the stop endpoint and normalises the result', async () => {
      const fixture = loadFixture('timesheet_single');
      transport.request.mockResolvedValueOnce(fixture);

      const ts = await client.timesheets.stop(1);

      expect(ts).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/timesheets/1/stop',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.timesheets.stop(1, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('timesheets.stop');
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/timesheets/1/stop' });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('timesheets.getActive (pinned rows)', () => {
    it('calls the getActive endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      const rows = await client.timesheets.getActive();

      expect(rows).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/active',
        query: undefined,
      });
    });
  });

  describe('timesheets.getRecent (pinned rows)', () => {
    it('calls the getRecent endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      const rows = await client.timesheets.getRecent();

      expect(rows).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets/recent',
        query: undefined,
      });
    });
  });

  describe('timesheets.resolve (pinned rows)', () => {
    it('returns the compact TimesheetSummary for a unique begin filter', async () => {
      transport.request.mockResolvedValueOnce([PHASE_F_TIMESHEET]);

      const res = await client.timesheets.resolve({ begin: '2026-01-01T10:00:00Z' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/timesheets',
        query: { begin: '2026-01-01T10:00:00Z', user: 'all', size: 500 },
      });
      expect(res).toEqual(PHASE_F_SUMMARY);
      expect(res).not.toHaveProperty('internalRate');
      expect(res).not.toHaveProperty('metaFields');

      // a bare timestamp string takes the same server-filter path
      transport.request.mockResolvedValueOnce([PHASE_F_TIMESHEET]);
      await expect(client.timesheets.resolve('2026-01-01T10:00:00Z')).resolves.toEqual(PHASE_F_SUMMARY);
    });

    it('returns null when the begin filter matches no timesheet', async () => {
      transport.request.mockResolvedValueOnce([]);

      await expect(client.timesheets.resolve({ begin: '2030-01-01T00:00:00Z' })).resolves.toBeNull();

      // the Resolution wrapper is honest about the complete scan
      transport.request.mockResolvedValueOnce([]);
      const res = await client.timesheets.resolve({ begin: '2030-01-01T00:00:00Z' }, { resolutionDetails: true });
      expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false });
    });

    it('throws RESOLUTION_AMBIGUOUS with the candidate ids when begin matches several timesheets', async () => {
      const twin = { ...PHASE_F_TIMESHEET, id: 21 };
      transport.request.mockResolvedValueOnce([PHASE_F_TIMESHEET, twin]);

      const err = await client.timesheets.resolve({ begin: '2026-01-01T10:00:00Z' }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).category).toBe('resolution');
      expect((err as ResolutionError).retryable).toBe(false);
      expect((err as ResolutionError).resourceIds).toEqual([20, 21]);
      expect((err as ResolutionError).operation).toBe('timesheets.resolve');
      expect((err as ResolutionError).suggestedAction).toBe('Retry with one of the candidate ids in resourceIds.');
    });

    it('throws NOT_FOUND when the id does not exist', async () => {
      transport.request.mockRejectedValueOnce(
        createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
      );

      const err = await client.timesheets.resolve(404).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).code).toBe('NOT_FOUND');

      // a bare numeric string is an id, never a begin timestamp
      transport.request.mockRejectedValueOnce(
        createApiError({ status: 404, message: 'Not Found' }),
      );
      await expect(client.timesheets.resolve('404')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('returns the Resolution wrapper (resolutionCost, scanned, scanTruncated) for resolutionDetails: true', async () => {
      transport.request.mockResolvedValueOnce([PHASE_F_TIMESHEET]);
      const byBegin = await client.timesheets.resolve({ begin: '2026-01-01T10:00:00Z' }, { resolutionDetails: true });
      expect(byBegin).toMatchObject({
        value: { id: 20 },
        resolutionCost: 'server-filter',
        scanned: 1,
        scanTruncated: false,
      });
      expect(Array.isArray((byBegin as { candidates?: unknown[] }).candidates)).toBe(true);

      // the id path is a direct fetch
      transport.request.mockResolvedValueOnce(PHASE_F_TIMESHEET);
      const direct = await client.timesheets.resolve(20, { resolutionDetails: true });
      expect(direct).toMatchObject({ value: { id: 20 }, resolutionCost: 'direct', scanned: 1, scanTruncated: false });
    });

    it('returns the full record for expand: true', async () => {
      const full = { ...PHASE_F_TIMESHEET, internalRate: 5, metaFields: [{ name: 'tool', value: 'vim' }] };
      transport.request.mockResolvedValueOnce([full]);

      const res = await client.timesheets.resolve({ begin: '2026-01-01T10:00:00Z' }, { expand: true });

      expect(res).toEqual(full);
    });

    it('ResolutionError.truncated emits RESOLUTION_TRUNCATED (category resolution, not retryable)', () => {
      const err = ResolutionError.truncated('timesheets.resolve: the scan cap was hit before the data ran out.');

      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('RESOLUTION_TRUNCATED');
      expect(err.category).toBe('resolution');
      expect(err.retryable).toBe(false);
      expect(err.suggestedAction).toBeTruthy();
    });
  });

  describe('timesheets.search (pinned rows)', () => {
    it('returns compact TimesheetSummary rows for the spec filters', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      const params = {
        user: 7,
        customers: [3],
        projects: [5],
        activities: [2],
        tags: ['x'],
        exported: true,
        active: false,
        billable: true,
        full: true,
        term: 'fix',
        orderBy: 'end',
        order: 'desc',
        begin: '2026-01-01',
        end: '2026-01-31',
        modified_after: '2026-01-01T00:00:00Z',
      };
      const rows = await client.timesheets.search(params);

      const call = transport.request.mock.calls[0]![0];
      expect(call.method).toBe('GET');
      expect(call.path).toBe('/api/timesheets');
      // every spec filter passes through unchanged; paging is the limit, not a param
      expect(call.query).toEqual({ ...params, size: 25 });
      expect(rows).toHaveLength(2);
      expect(rows[0]).not.toHaveProperty('metaFields');
      expect(rows[0]).not.toHaveProperty('internalRate');
    });

    it('passes user=all when no user filter is given', async () => {
      transport.request.mockResolvedValueOnce([]);

      await client.timesheets.search({ begin: '2026-01-01' });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.user).toBe('all');
    });

    it('sends size 25 when no limit is given', async () => {
      transport.request.mockResolvedValueOnce([]);

      await client.timesheets.search();

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.size).toBe(25);
    });

    it('sends size 100 when limit is 100', async () => {
      transport.request.mockResolvedValueOnce([]);

      await client.timesheets.search({}, { limit: 100 });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.size).toBe(100);
    });

    it('throws KimaiConfigError for a limit above 100 or a non-integer limit', async () => {
      await expect(client.timesheets.search({}, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.timesheets.search({}, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.timesheets.search({}, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
      expect(transport.request).not.toHaveBeenCalled();

      const err = await client.timesheets.search({}, { limit: 101 }).catch((e: unknown) => e);
      expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
      expect((err as KimaiConfigError).category).toBe('validation');
      expect((err as KimaiConfigError).retryable).toBe(false);
    });

    it('returns the full records for expand: true', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      const rows = await client.timesheets.search({ begin: '2026-01-01' }, { limit: 100, expand: true });

      expect(rows).toEqual(fixture);
    });
  });

  describe('timesheets.getContext (pinned rows)', () => {
    it('returns the timesheet with its referenced user, activity, project and customer', async () => {
      const user = loadFixture('user_single');
      const activity = loadFixture('activity_single');
      const project = loadFixture('project_single'); // customer: 1
      const customer = loadFixture('customer_single');

      transport.request
        .mockResolvedValueOnce(PHASE_F_TIMESHEET)
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(activity)
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(customer);

      const ctx = await client.timesheets.getContext(20);

      expect(ctx.timesheet).toEqual(PHASE_F_SUMMARY);
      expect(ctx.user).toEqual(user);
      expect(ctx.activity).toEqual(activity);
      expect(ctx.project).toEqual(project);
      expect(ctx.customer).toEqual(customer);
      expect(transport.request).toHaveBeenCalledTimes(5);
    });

    it('returns null for absent references (no activity, no project, or a project without a customer)', async () => {
      // (a) user only — no activity, no project
      transport.request
        .mockResolvedValueOnce({ id: 21, begin: '2026-02-02T09:00:00Z', user: 1 })
        .mockResolvedValueOnce(loadFixture('user_single'));

      const a = await client.timesheets.getContext(21);
      expect(a.user).not.toBeNull();
      expect(a.activity).toBeNull();
      expect(a.project).toBeNull();
      expect(a.customer).toBeNull();
      expect(transport.request).toHaveBeenCalledTimes(2);

      // (b) activity + project present, but the project carries no customer
      const projectNoCustomer = { ...(loadFixture('project_single') as Record<string, unknown>), customer: undefined };
      transport.request
        .mockResolvedValueOnce({ id: 22, begin: '2026-02-03T09:00:00Z', user: 1, activity: 2, project: 3 })
        .mockResolvedValueOnce(loadFixture('user_single'))
        .mockResolvedValueOnce(loadFixture('activity_single'))
        .mockResolvedValueOnce(projectNoCustomer);

      const b = await client.timesheets.getContext(22);
      expect(b.project).not.toBeNull();
      expect(b.customer).toBeNull();
      expect(transport.request).toHaveBeenCalledTimes(6);
    });

    it('returns the full timesheet record for expand: true', async () => {
      const full = { ...PHASE_F_TIMESHEET, end: '2026-01-01T17:00:00Z', duration: 28800 };
      transport.request
        .mockResolvedValueOnce(full)
        .mockResolvedValueOnce(loadFixture('user_single'))
        .mockResolvedValueOnce(loadFixture('activity_single'))
        .mockResolvedValueOnce(loadFixture('project_single'));

      const ctx = await client.timesheets.getContext(20, { expand: true });

      expect(ctx.timesheet).toEqual(full);
    });
  });

  describe('registry classification (pinned row)', () => {
    it('classifies the mutations per the registry (create, restart, duplicate non-idempotent; update, stop, toggleExport, updateMeta idempotent; delete requires approval)', () => {
      const groups = CAPABILITY_GROUPS as unknown as Record<string, { records: Array<Record<string, unknown>> } | undefined>;
      expect(groups.timesheets, 'capabilities registry not built — run: npm run capabilities:build').toBeDefined();

      const recs = Object.fromEntries(
        groups.timesheets!.records.map((r) => [r.operation as string, r]),
      ) as Record<string, any>;
      expect(recs.create.effect).toBe('write');
      expect(recs.create.flags).toEqual([]);
      expect(recs.update.effect).toBe('write');
      expect(recs.update.flags).toEqual(['idempotent']);
      expect(recs.stop.flags).toEqual(['idempotent']);
      expect(recs.toggleExport.flags).toEqual(['idempotent']);
      expect(recs.updateMeta.flags).toEqual(['idempotent']);
      expect(recs.restart.flags).toEqual([]);
      expect(recs.duplicate.flags).toEqual([]);
      expect(recs.delete.effect).toBe('destructive');
      expect(recs.delete.flags).toEqual(['requiresApproval']);

      for (const r of groups.timesheets!.records) {
        if (r.effect !== 'read') {
          expect(r.dryRun).toBe(true);
          expect((r.retry as { idempotencySupport: string }).idempotencySupport).toBe('none');
        }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Phase F transport-level error contract — the REAL FetchTransport (stubbed
// global fetch), so correlationId/retryAfter are proven at the wire edge,
// not behind an injected transport stub.
// ---------------------------------------------------------------------------

describe('Phase F — FetchTransport error contract (timesheets)', () => {
  let liveClient: ApiClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    liveClient = new ApiClient({ baseUrl: BASE_URL, token: TOKEN });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const failResponse = (status: number, statusText: string, body: unknown, retryAfter: string | null = null) => ({
    ok: false,
    status,
    statusText,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'retry-after' ? retryAfter : null),
    },
    json: async () => body,
  });

  it('normalises a 429 into RATE_LIMITED with retryAfter from the Retry-After header', async () => {
    const fixture = loadFixture('error_429');
    mockFetch.mockResolvedValueOnce(failResponse(429, 'Too Many Requests', fixture, '30'));

    const err = await liveClient.timesheets.list().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    const e = err as RateLimitError;
    expect(e.code).toBe('RATE_LIMITED');
    expect(e.category).toBe('rate_limit');
    expect(e.retryable).toBe(true);
    expect(e.httpStatus).toBe(429);
    expect(e.status).toBe(429); // the legacy accessor stays
    expect(e.retryAfter).toBe(30);
    expect(e.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(e.vendorError).toEqual(fixture);
    expect(e.suggestedAction).toContain('retryAfter');
  });

  it('populates the structured error contract (category, code, retryable, httpStatus, vendorError, correlationId)', async () => {
    const fixture = loadFixture('error_500');
    mockFetch.mockResolvedValueOnce(failResponse(500, 'Internal Server Error', fixture));

    await expect(liveClient.timesheets.getById(404)).rejects.toMatchObject({
      name: 'ServerError',
      code: 'SERVER_ERROR',
      category: 'server',
      retryable: true,
      httpStatus: 500,
      status: 500,
    });

    // the same contract on a 404: not_found category, non-retryable
    mockFetch.mockResolvedValueOnce(failResponse(404, 'Not Found', loadFixture('error_404')));
    const err = await liveClient.timesheets.getById(1).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).category).toBe('not_found');
    expect((err as NotFoundError).retryable).toBe(false);
    expect((err as NotFoundError).correlationId).toBeTruthy();
    expect((err as NotFoundError).vendorError).toEqual(loadFixture('error_404'));
  });

  it('normalises a 400 into BAD_REQUEST', async () => {
    const fixture = loadFixture('error_400');
    mockFetch.mockResolvedValueOnce(failResponse(400, 'Bad Request', fixture));

    await expect(
      liveClient.timesheets.create({ project: 1, activity: 1 }),
    ).rejects.toMatchObject({
      name: 'BadRequestError',
      code: 'BAD_REQUEST',
      category: 'validation',
      retryable: false,
    });

    mockFetch.mockResolvedValueOnce(failResponse(400, 'Bad Request', fixture));
    const err = await liveClient.timesheets.create({ project: 1, activity: 1 }).catch((e: unknown) => e);
    expect((err as BadRequestError).vendorError).toEqual(fixture);
    expect((err as BadRequestError).suggestedAction).toContain('request payload');
  });
});
