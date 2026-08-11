// TeamClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('TeamClient', () => {
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
    it('should call GET /api/teams', async () => {
      const fixture = loadFixture('team');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams',
        query: undefined,
      });
    });
  });

  describe('getAll', () => {
    it('should delegate to list', async () => {
      const fixture = loadFixture('team');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('should call GET /api/teams/{id}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams/1',
      });
    });
  });

  describe('create', () => {
    it('should call POST /api/teams', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.create({ name: 'New Team' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams',
        body: { name: 'New Team' },
      });
    });
  });

  describe('update', () => {
    it('should call PATCH /api/teams/{id}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.update(1, { name: 'Updated' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/teams/1',
        body: { name: 'Updated' },
      });
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/teams/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.teams.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1',
      });
    });
  });

  describe('addMember', () => {
    it('should call POST /api/teams/{teamId}/members/{userId}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.addMember(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/members/5',
      });
    });
  });

  describe('removeMember', () => {
    it('should call DELETE /api/teams/{teamId}/members/{userId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.teams.removeMember(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/members/5',
      });
    });
  });

  describe('grantCustomerAccess', () => {
    it('should call POST /api/teams/{teamId}/customers/{customerId}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.grantCustomerAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/customers/5',
      });
    });
  });

  describe('revokeCustomerAccess', () => {
    it('should call DELETE /api/teams/{teamId}/customers/{customerId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.teams.revokeCustomerAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/customers/5',
      });
    });
  });

  describe('grantProjectAccess', () => {
    it('should call POST /api/teams/{teamId}/projects/{projectId}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.grantProjectAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/projects/5',
      });
    });
  });

  describe('revokeProjectAccess', () => {
    it('should call DELETE /api/teams/{teamId}/projects/{projectId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.teams.revokeProjectAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/projects/5',
      });
    });
  });

  describe('grantActivityAccess', () => {
    it('should call POST /api/teams/{teamId}/activities/{activityId}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.grantActivityAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/activities/5',
      });
    });
  });

  describe('revokeActivityAccess', () => {
    it('should call DELETE /api/teams/{teamId}/activities/{activityId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.teams.revokeActivityAccess(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/activities/5',
      });
    });
  });
});
