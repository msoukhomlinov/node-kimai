// CustomerClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import type { CustomerEditForm } from '../../src/types';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

describe('CustomerClient', () => {
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
    it('should call GET /api/customers without page params', async () => {
      const fixture = loadFixture('customer');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });

    it('should pass query params when provided', async () => {
      const fixture = loadFixture('customer');
      transport.request.mockResolvedValueOnce(fixture);

      await client.customers.list({ name: 'Acme', visible: true });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers',
        query: { name: 'Acme', visible: true },
      });
    });
  });

  describe('getAll', () => {
    it('should delegate to list for non-paginated resource', async () => {
      const fixture = loadFixture('customer');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.getAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fixture);
    });
  });

  describe('getById', () => {
    it('should call GET /api/customers/{id}', async () => {
      const fixture = loadFixture('customer_single');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.getById(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers/1',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('create', () => {
    it('should call POST /api/customers with body', async () => {
      const fixture = loadFixture('customer_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const input: CustomerEditForm = {
        name: 'New Customer',
        country: 'US',
        language: 'en',
        currency: 'USD',
        timezone: 'America/New_York',
      };
      const result = await client.customers.create(input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/customers',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('update', () => {
    it('should call PATCH /api/customers/{id} with body', async () => {
      const fixture = loadFixture('customer_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input: CustomerEditForm = {
        name: 'Updated Customer',
        country: 'US',
        language: 'en',
        currency: 'USD',
        timezone: 'America/New_York',
      };
      const result = await client.customers.update(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/customers/1',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('delete', () => {
    it('should call DELETE /api/customers/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.customers.delete(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/customers/1',
        query: undefined,
        body: undefined,
      });
    });
  });

  describe('updateMeta', () => {
    it('should call PATCH /api/customers/{id}/meta', async () => {
      const fixture = loadFixture('customer_single');
      transport.request.mockResolvedValueOnce(fixture);

      const meta = { account_manager: 'Jane Doe' };
      const result = await client.customers.updateMeta(1, meta);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/customers/1/meta',
        query: undefined,
        body: meta,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('getRates', () => {
    it('should call GET /api/customers/{id}/rates', async () => {
      const fixture = loadFixture('customer_rate');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.getRates(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers/1/rates',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('createRate', () => {
    it('should call POST /api/customers/{id}/rates', async () => {
      const fixture = loadFixture('customer_rate_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { rate: 100 };
      const result = await client.customers.createRate(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/customers/1/rates',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('deleteRate', () => {
    it('should call DELETE /api/customers/{id}/rates/{rateId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.customers.deleteRate(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/customers/1/rates/5',
        query: undefined,
        body: undefined,
      });
    });
  });

  describe('listComments', () => {
    it('should call GET /api/customers/{id}/comments', async () => {
      const fixture = loadFixture('comment');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.listComments(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/customers/1/comments',
        query: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('createComment', () => {
    it('should call POST /api/customers/{id}/comments', async () => {
      const fixture = loadFixture('comment_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { message: 'New comment' };
      const result = await client.customers.createComment(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/customers/1/comments',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('deleteComment', () => {
    it('should call DELETE /api/customers/{id}/comments/{commentId}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.customers.deleteComment(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/customers/1/comments/5',
        query: undefined,
        body: undefined,
      });
    });
  });

  describe('pinComment', () => {
    it('should call PATCH /api/customers/{id}/comments/{commentId}/pin', async () => {
      const fixture = loadFixture('comment_single');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.customers.pinComment(1, 5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/customers/1/comments/5/pin',
        query: undefined,
        body: undefined,
      });
      expect(result).toEqual(fixture);
    });
  });

  describe('addToTeam', () => {
    it('should call POST /api/customers/{id}/team', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { teams: [1] };
      const result = await client.customers.addToTeam(1, input);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/customers/1/team',
        query: undefined,
        body: input,
      });
      expect(result).toEqual(fixture);
    });
  });
});
