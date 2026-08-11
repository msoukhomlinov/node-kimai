// SystemClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('SystemClient', () => {
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

  describe('ping', () => {
    it('should call GET /api/ping and return true for array response', async () => {
      transport.request.mockResolvedValueOnce([]);

      const result = await client.system.ping();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/ping',
      });
      expect(result).toBe(true);
    });

    it('should return true for non-null response', async () => {
      transport.request.mockResolvedValueOnce({ status: 'ok' });

      const result = await client.system.ping();

      expect(result).toBe(true);
    });

    it('should return false for null response', async () => {
      transport.request.mockResolvedValueOnce(null);

      const result = await client.system.ping();

      expect(result).toBe(false);
    });

    it('should return false for undefined response', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.system.ping();

      expect(result).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should call GET /api/version', async () => {
      const fixture = loadFixture('version');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.system.getVersion();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/version',
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('getPlugins', () => {
    it('should call GET /api/plugins', async () => {
      const fixture = loadFixture('plugins');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.system.getPlugins();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/plugins',
      });
      expect(result).toEqual(fixture);
    });
  });
});
