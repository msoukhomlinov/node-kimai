// ActionsClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
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


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — actions.
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: actions).
// ---------------------------------------------------------------------------

describe('ActionsClient — Phase F agent execution layer', () => {
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

  describe('actions.getActions (pinned rows)', () => {
    it('calls the actions.getActions endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('page_actions');

      const routes = [
        { resource: 'activity' as const, id: 1, view: 'edit', locale: 'en', path: '/api/actions/activity/1/edit/en' },
        { resource: 'customer' as const, id: 5, view: 'show', locale: 'de', path: '/api/actions/customer/5/show/de' },
        { resource: 'project' as const, id: 10, view: 'detail', locale: 'fr', path: '/api/actions/project/10/detail/fr' },
        { resource: 'timesheet' as const, id: 100, view: 'show', locale: 'en_GB', path: '/api/actions/timesheet/100/show/en_GB' },
      ];

      for (const route of routes) {
        transport.request.mockResolvedValueOnce(fixture);
        const res = await client.actions.getActions(route.resource, route.id, route.view, route.locale);
        expect(res).toEqual(fixture);
        expect(transport.request).toHaveBeenCalledWith({ method: 'GET', path: route.path });
      }
      expect(transport.request).toHaveBeenCalledTimes(4);
    });
  });
});
