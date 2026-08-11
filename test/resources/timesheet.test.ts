// TimesheetClient tests - includes user-filter override and pagination
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
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

      const call = transport.request.mock.calls[0][0];
      expect(call.query.user).toBe(5);
    });

    it('should NOT override user when users[] filter is provided', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list({ users: [1, 2] });

      const call = transport.request.mock.calls[0][0];
      expect(call.query.users).toEqual([1, 2]);
      expect(call.query.user).toBeUndefined();
    });

    it('should pass additional query params', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.list({ begin: '2024-01-01', end: '2024-01-31' });

      const call = transport.request.mock.calls[0][0];
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

      const call = transport.request.mock.calls[0][0];
      expect(call.query.page).toBe(5);
      expect(call.query.size).toBe(200);
    });

    it('should NOT override user when user filter provided', async () => {
      const fixture = loadFixture('timesheet');
      transport.request.mockResolvedValueOnce(fixture);

      await client.timesheets.getAll({ user: 3 });

      const call = transport.request.mock.calls[0][0];
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

      const input = { activity: 1, begin: '2024-01-15T09:00:00+00:00' };
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

      const input = { description: 'Updated' };
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
