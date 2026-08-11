// TagClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('TagClient', () => {
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
    it('should call GET /api/tags without params', async () => {
      const fixture = loadFixture('tag');
      transport.request.mockResolvedValueOnce(fixture);

      await client.tags.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags',
        query: undefined,
      });
    });
  });

  describe('getAll', () => {
    it('should delegate to list', async () => {
      const fixture = loadFixture('tag');
      transport.request.mockResolvedValueOnce(fixture);

      await client.tags.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should call POST /api/tags', async () => {
      const fixture = loadFixture('tag_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.tags.create({ name: 'new-tag' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/tags',
        body: { name: 'new-tag' },
      });
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/tags/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.tags.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/tags/1',
      });
    });
  });

  describe('find', () => {
    it('should call GET /api/tags/find with name query param', async () => {
      const fixture = loadFixture('tag');
      transport.request.mockResolvedValueOnce(fixture);

      await client.tags.find('urgent');

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: { name: 'urgent' },
      });
    });
  });
});
