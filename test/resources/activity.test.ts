// ActivityClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { ActivityClient } from '../../src/resources/ActivityClient';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../../test/__fixtures__/${name}.json`);
}

describe('ActivityClient', () => {
  let client: ApiClient;
  let activityClient: ActivityClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
    activityClient = client.activities;
  });

  describe('list', () => {
    it('should call GET /api/activities without page params', async () => {
      const fixture = loadFixture('activity');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await activityClient.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });

    it('should pass query params when provided', async () => {
      const fixture = loadFixture('activity');
      transport.request.mockResolvedValueOnce(fixture);

      await activityClient.list({ name: 'test', visible: true });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities',
        query: { name: 'test', visible: true },
      });
    });

    it('should NOT send page/size params', async () => {
      const fixture = loadFixture('activity');
      transport.request.mockResolvedValueOnce(fixture);

      await activityClient.list({ name: 'test' });

      const call = transport.request.mock.calls[0][0];
      expect(call.query).not.toHaveProperty('page');
      expect(call.query).not.toHaveProperty('size');
    });
  });

  describe('getAll', () => {
    it('should delegate to list for non-paginated resource', async () => {
      const fixture = loadFixture('activity');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await activityClient.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fixture);
    });
  });

  describe('getById', () => {
    it('should call GET /api/activities/{id}', async () => {
      const fixture = loadFixture('activity_single');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await activityClient.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities/1',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('create', () => {
    it('should call POST /api/activities with body', async () => {
      const fixture = loadFixture('activity_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { name: 'New Activity', visible: true, billable: true };
      const result = await activityClient.create(input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/activities',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('update', () => {
    it('should call PATCH /api/activities/{id} with body', async () => {
      const fixture = loadFixture('activity_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { name: 'Updated Activity' };
      const result = await activityClient.update(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/activities/1',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/activities/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await activityClient.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/activities/1',
        query: undefined,
        body: undefined,
      });
    });
  });

  describe('updateMeta', () => {
    it('should call PATCH /api/activities/{id}/meta with meta object', async () => {
      const fixture = loadFixture('activity_single');
      transport.request.mockResolvedValueOnce(fixture);

      const meta = { department: 'engineering', level: 'senior' };
      const result = await activityClient.updateMeta(1, meta);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/activities/1/meta',
        query: undefined,
        body: meta,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('getRates', () => {
    it('should call GET /api/activities/{id}/rates', async () => {
      const fixture = loadFixture('activity_rate');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await activityClient.getRates(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities/1/rates',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('createRate', () => {
    it('should call POST /api/activities/{id}/rates with body', async () => {
      const fixture = loadFixture('activity_rate_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { rate: 50, user: 1 };
      const result = await activityClient.createRate(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/activities/1/rates',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('deleteRate', () => {
    it('should call DELETE /api/activities/{id}/rates/{rateId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await activityClient.deleteRate(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/activities/1/rates/5',
        query: undefined,
        body: undefined,
      });
    });
  });

  describe('addToTeam', () => {
    it('should call POST /api/activities/{id}/team with body', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { teams: [1, 2] };
      const result = await activityClient.addToTeam(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/activities/1/team',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });
});
