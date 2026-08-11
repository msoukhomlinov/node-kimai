// ExportClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

describe('ExportClient', () => {
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

  describe('deleteTemplate', () => {
    it('should call DELETE /api/export/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.export.deleteTemplate(5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/export/5',
      });
    });
  });

  describe('no list endpoint', () => {
    it('should NOT have a list method (binary GET not implemented)', () => {
      expect((client.export as any).list).toBeUndefined();
    });
  });
});
