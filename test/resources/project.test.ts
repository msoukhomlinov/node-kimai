// ProjectClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

describe('ProjectClient', () => {
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
    it('should call GET /api/projects without page params', async () => {
      const fixture = loadFixture('project');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.projects.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });

    it('should pass query params when provided', async () => {
      const fixture = loadFixture('project');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.list({ customer: 1, visible: true });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects',
        query: { customer: 1, visible: true },
      });
    });
  });

  describe('getAll', () => {
    it('should delegate to list for non-paginated resource', async () => {
      const fixture = loadFixture('project');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.projects.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('should call GET /api/projects/{id}', async () => {
      const fixture = loadFixture('project_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects/1',
        query: undefined,
      });
    });
  });

  describe('create', () => {
    it('should call POST /api/projects', async () => {
      const fixture = loadFixture('project_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { name: 'New Project', customer: 1 };
      await client.projects.create(input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/projects',
        body: input,
      });
    });
  });

  describe('update', () => {
    it('should call PATCH /api/projects/{id}', async () => {
      const fixture = loadFixture('project_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { name: 'Updated', customer: 1 };
      await client.projects.update(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/projects/1',
        body: input,
      });
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/projects/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.projects.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/projects/1',
      });
    });
  });

  describe('updateMeta', () => {
    it('should call PATCH /api/projects/{id}/meta', async () => {
      const fixture = loadFixture('project_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.updateMeta(1, { platform: 'web' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/projects/1/meta',
        body: { platform: 'web' },
      });
    });
  });

  describe('getRates', () => {
    it('should call GET /api/projects/{id}/rates', async () => {
      const fixture = loadFixture('project_rate');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.getRates(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects/1/rates',
      });
    });
  });

  describe('createRate', () => {
    it('should call POST /api/projects/{id}/rates', async () => {
      const fixture = loadFixture('project_rate_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.createRate(1, { rate: 80 });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/projects/1/rates',
        body: { rate: 80 },
      });
    });
  });

  describe('deleteRate', () => {
    it('should call DELETE /api/projects/{id}/rates/{rateId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.projects.deleteRate(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/projects/1/rates/5',
      });
    });
  });

  describe('listComments', () => {
    it('should call GET /api/projects/{id}/comments', async () => {
      const fixture = loadFixture('comment');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.listComments(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects/1/comments',
      });
    });
  });

  describe('createComment', () => {
    it('should call POST /api/projects/{id}/comments', async () => {
      const fixture = loadFixture('comment_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.createComment(1, { message: 'Comment' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/projects/1/comments',
        body: { message: 'Comment' },
      });
    });
  });

  describe('deleteComment', () => {
    it('should call DELETE /api/projects/{id}/comments/{commentId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.projects.deleteComment(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/projects/1/comments/5',
      });
    });
  });

  describe('pinComment', () => {
    it('should call PATCH /api/projects/{id}/comments/{commentId}/pin', async () => {
      const fixture = loadFixture('comment_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.pinComment(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/projects/1/comments/5/pin',
      });
    });
  });

  describe('addToTeam', () => {
    it('should call POST /api/projects/{id}/team', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.addToTeam(1, { teams: [1] });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/projects/1/team',
        body: { teams: [1] },
      });
    });
  });
});
