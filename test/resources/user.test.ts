// UserClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('UserClient', () => {
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
    it('should call GET /api/users without page params', async () => {
      const fixture = loadFixture('user');
      transport.request.mockResolvedValueOnce(fixture);

      await client.users.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users',
        query: undefined,
      });
    });

    it('should pass query params', async () => {
      const fixture = loadFixture('user');
      transport.request.mockResolvedValueOnce(fixture);

      await client.users.list({ role: 'admin', team: 1 });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users',
        query: { role: 'admin', team: 1 },
      });
    });
  });

  describe('getAll', () => {
    it('should delegate to list for non-paginated resource', async () => {
      const fixture = loadFixture('user');
      transport.request.mockResolvedValueOnce(fixture);

      await client.users.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('should call GET /api/users/{id}', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.users.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users/1',
      });
    });
  });

  describe('getMe', () => {
    it('should call GET /api/users/me', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.users.getMe();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users/me',
      });
    });
  });

  describe('create', () => {
    it('should call POST /api/users', async () => {
      const fixture = loadFixture('user_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { username: 'newuser', email: 'new@example.com' };
      await client.users.create(input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/users',
        body: input,
      });
    });
  });

  describe('update', () => {
    it('should call PATCH /api/users/{id}', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { firstname: 'Updated' };
      await client.users.update(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/users/1',
        body: input,
      });
    });
  });

  describe('updatePreferences', () => {
    it('should call PATCH /api/users/{id}/preferences', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const prefs = [{ name: 'theme', value: 'dark' }];
      await client.users.updatePreferences(1, prefs);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/users/1/preferences',
        body: prefs,
      });
    });
  });

  describe('deleteApiToken', () => {
    it('should call DELETE /api/users/api-token/{tokenId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.users.deleteApiToken(5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/users/api-token/5',
      });
    });
  });

  describe('no delete method', () => {
    it('should NOT have a delete(id) method', () => {
      expect(client.users.delete).toBeUndefined();
    });
  });
});
