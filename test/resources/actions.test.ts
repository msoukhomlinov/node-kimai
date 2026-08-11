// ActionsClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('ActionsClient', () => {
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

  describe('getActions', () => {
    it('should call GET /api/actions/activity/{id}/{view}/{locale}', async () => {
      const fixture = loadFixture('page_actions');
      transport.request.mockResolvedValueOnce(fixture);

      await client.actions.getActions('activity', 1, 'edit', 'en');

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/actions/activity/1/edit/en',
      });
    });

    it('should call GET /api/actions/customer/{id}/{view}/{locale}', async () => {
      const fixture = loadFixture('page_actions');
      transport.request.mockResolvedValueOnce(fixture);

      await client.actions.getActions('customer', 5, 'show', 'de');

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/actions/customer/5/show/de',
      });
    });

    it('should call GET /api/actions/project/{id}/{view}/{locale}', async () => {
      const fixture = loadFixture('page_actions');
      transport.request.mockResolvedValueOnce(fixture);

      await client.actions.getActions('project', 10, 'detail', 'fr');

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/actions/project/10/detail/fr',
      });
    });

    it('should call GET /api/actions/timesheet/{id}/{view}/{locale}', async () => {
      const fixture = loadFixture('page_actions');
      transport.request.mockResolvedValueOnce(fixture);

      await client.actions.getActions('timesheet', 100, 'show', 'en_GB');

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/actions/timesheet/100/show/en_GB',
      });
    });
  });
});
