// ConfigClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

describe('ConfigClient', () => {
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

  describe('getTimesheetConfig', () => {
    it('should call GET /api/config/timesheet', async () => {
      const fixture = loadFixture('timesheet_config');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.config.getTimesheetConfig();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/config/timesheet',
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('getColors', () => {
    it('should call GET /api/config/colors', async () => {
      const fixture = loadFixture('colors');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.config.getColors();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/config/colors',
      });
      expect(result).toEqual(fixture);
    });
  });
});


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — config.
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: config).
// ---------------------------------------------------------------------------

describe('ConfigClient — Phase F agent execution layer', () => {
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

  describe('config.getColors (pinned rows)', () => {
    it('calls the config.getColors endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('colors');
      transport.request.mockResolvedValueOnce(fixture);

      const res = await client.config.getColors();

      expect(res).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/config/colors',
      });
    });
  });

  describe('config.getTimesheetConfig (pinned rows)', () => {
    it('calls the config.getTimesheetConfig endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('timesheet_config');
      transport.request.mockResolvedValueOnce(fixture);

      const res = await client.config.getTimesheetConfig();

      expect(res).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/config/timesheet',
      });
    });
  });
});
