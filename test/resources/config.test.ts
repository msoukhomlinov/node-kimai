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
