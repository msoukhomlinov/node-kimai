// CustomerClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import type { CustomerEditForm } from '../../src/types';
import { createApiError, KimaiConfigError, NotFoundError, ResolutionError } from '../../src/errors';

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


// ---------------------------------------------------------------------------
// Phase F agent-execution-layer rows. The `describe`/`it` titles below are
// pinned VERBATIM from capabilities.plan.json (scripts/check-capabilities.mjs
// [test-rows] matches each title in this file).
// ---------------------------------------------------------------------------

describe('customers.list (pinned rows)', () => {
  it('returns the unwrapped customers list', async () => {
    const fixture = loadFixture('customer');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.customers.list({ name: 'Acme', visible: true });

    expect(rows).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers',
      query: { name: 'Acme', visible: true },
    });
  });

  it('does not send page/size params for this non-paginated endpoint', async () => {
    // This endpoint is not paged by the SDK: `getAll` delegates to a single
    // `list` and never injects paging params, so the whole collection arrives
    // in one request.
    const fixture = loadFixture('customer');
    transport.request.mockResolvedValueOnce(fixture);

    const result = await client.customers.getAll();

    expect(transport.request).toHaveBeenCalledTimes(1);
    const call = transport.request.mock.calls[0]![0];
    // no paging params are injected for this endpoint
    expect(call.query).toBeUndefined();
    expect(result).toEqual(fixture);
  });
});

describe('customers.getById (pinned rows)', () => {
  it('returns the unwrapped customers record', async () => {
    const fixture = loadFixture('customer_single');
    transport.request.mockResolvedValueOnce(fixture);

    const customer = await client.customers.getById(1);

    expect(customer).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers/1',
      query: undefined,
    });
  });

  it('normalises a 404 into NOT_FOUND', async () => {
    transport.request.mockRejectedValueOnce(
      createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
    );

    const err = await client.customers.getById(404).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).code).toBe('NOT_FOUND');
    expect((err as NotFoundError).category).toBe('not_found');
    expect((err as NotFoundError).retryable).toBe(false);
  });
});

describe('customers.listComments (pinned rows)', () => {
  it('calls the customers.listComments endpoint and returns the documented shape', async () => {
    const fixture = loadFixture('comment');
    transport.request.mockResolvedValueOnce(fixture);

    const comments = await client.customers.listComments(1);

    expect(comments).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers/1/comments',
      query: undefined,
    });
  });
});

describe('customers.getRates (pinned rows)', () => {
  it('calls the customers.getRates endpoint and returns the documented shape', async () => {
    const fixture = loadFixture('customer_rate');
    transport.request.mockResolvedValueOnce(fixture);

    const rates = await client.customers.getRates(1);

    expect(rates).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers/1/rates',
      query: undefined,
    });
  });
});

describe('customers.create (pinned rows)', () => {
  it('returns the created customers record', async () => {
    const fixture = loadFixture('customer_entity');
    transport.request.mockResolvedValueOnce(fixture);

    const input: CustomerEditForm = { name: 'Wayne Enterprises', country: 'US', currency: 'USD', timezone: 'UTC', language: 'en' };
    const created = await client.customers.create(input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/customers',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const input: CustomerEditForm = { name: 'Wayne Enterprises', country: 'US', currency: 'USD', timezone: 'UTC', language: 'en' };
    const res = await client.customers.create(input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.wouldApply).toBe(true);
    expect(res.operation).toBe('customers.create');
    expect(res.target).toEqual({ resource: 'customers', ids: [] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/customers' });
    expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.update (pinned rows)', () => {
  it('returns the updated customers record', async () => {
    const fixture = loadFixture('customer_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input: CustomerEditForm = { name: 'Acme Corp', country: 'US', currency: 'USD', timezone: 'UTC', language: 'en' };
    const updated = await client.customers.update(1, input);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/customers/1',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no PATCH request and returns simulated: true', async () => {
    const input: CustomerEditForm = { name: 'Acme Corp', country: 'US', currency: 'USD', timezone: 'UTC', language: 'en' };
    const res = await client.customers.update(1, input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.update');
    expect(res.target).toEqual({ resource: 'customers', ids: [1] });
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/customers/1' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.updateMeta (pinned rows)', () => {
  it('calls the customers.updateMeta endpoint and normalises the result', async () => {
    const fixture = loadFixture('customer_single');
    transport.request.mockResolvedValueOnce(fixture);

    const meta = { department: 'engineering' };
    const updated = await client.customers.updateMeta(1, meta);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/customers/1/meta',
      query: undefined,
      body: meta,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.updateMeta(1, { department: 'engineering' }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.updateMeta');
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/customers/1/meta' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'meta-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.createRate (pinned rows)', () => {
  it('calls the customers.createRate endpoint and normalises the result', async () => {
    const fixture = loadFixture('customer_rate_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { rate: 100, user: 1 };
    const created = await client.customers.createRate(1, input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/customers/1/rates',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.createRate(1, { rate: 100, user: 1 }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.createRate');
    expect(res.target).toEqual({ resource: 'customers', ids: [1] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/customers/1/rates' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.createComment (pinned rows)', () => {
  it('calls the customers.createComment endpoint and normalises the result', async () => {
    const fixture = loadFixture('comment_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { message: 'Follow up next week', pinned: false };
    const created = await client.customers.createComment(1, input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/customers/1/comments',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.createComment(1, { message: 'Follow up next week' }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.createComment');
    expect(res.request).toEqual({ method: 'POST', path: '/api/customers/1/comments' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.pinComment (pinned rows)', () => {
  it('calls the customers.pinComment endpoint and normalises the result', async () => {
    const fixture = loadFixture('comment_single');
    transport.request.mockResolvedValueOnce(fixture);

    const pinned = await client.customers.pinComment(1, 3);

    expect(pinned).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/customers/1/comments/3/pin',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.pinComment(1, 3, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.pinComment');
    expect(res.target).toEqual({ resource: 'customers', ids: [1, 3] });
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/customers/1/comments/3/pin' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'comment-id', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.addToTeam (pinned rows)', () => {
  it('calls the customers.addToTeam endpoint and normalises the result', async () => {
    const fixture = loadFixture('team_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { teams: [1] };
    const team = await client.customers.addToTeam(1, input);

    expect(team).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/customers/1/team',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.addToTeam(1, { teams: [1] }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.addToTeam');
    expect(res.request).toEqual({ method: 'POST', path: '/api/customers/1/team' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'team-ids', ok: true },
    ]);
    expect(res.data).toEqual({ teams: [1] });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.delete (pinned rows)', () => {
  it('resolves void after a successful delete', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.customers.delete(1);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/customers/1',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no DELETE request and returns simulated: true', async () => {
    const res = await client.customers.delete(1, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.delete');
    expect(res.target).toEqual({ resource: 'customers', ids: [1] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/customers/1' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.deleteRate (pinned rows)', () => {
  it('calls the customers.deleteRate endpoint and normalises the result', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.customers.deleteRate(1, 5);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/customers/1/rates/5',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.deleteRate(1, 5, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.deleteRate');
    expect(res.target).toEqual({ resource: 'customers', ids: [1, 5] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/customers/1/rates/5' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.deleteComment (pinned rows)', () => {
  it('calls the customers.deleteComment endpoint and normalises the result', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.customers.deleteComment(1, 3);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/customers/1/comments/3',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.customers.deleteComment(1, 3, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('customers.deleteComment');
    expect(res.target).toEqual({ resource: 'customers', ids: [1, 3] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/customers/1/comments/3' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('customers.resolve (pinned rows)', () => {
  it('resolves a customer by numeric id', async () => {
    transport.request.mockResolvedValueOnce(loadFixture('customer_single'));

    const res = await client.customers.resolve(7);

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers/7',
      query: undefined,
    });
    expect(res).toMatchObject({ id: 1, name: 'Acme Corp', country: 'US', currency: 'USD' });
    expect(res).not.toHaveProperty('metaFields');
    expect(res).not.toHaveProperty('phone');
    expect(res).not.toHaveProperty('color-safe');

    // `{ id }` and a bare numeric string take the same direct path
    transport.request.mockResolvedValueOnce(loadFixture('customer_single'));
    await client.customers.resolve({ id: 7 });
    expect(transport.request.mock.calls[1]![0].path).toBe('/api/customers/7');
    transport.request.mockResolvedValueOnce(loadFixture('customer_single'));
    await client.customers.resolve('7');
    expect(transport.request.mock.calls[2]![0].path).toBe('/api/customers/7');

    // the Resolution wrapper marks the direct fetch honestly
    transport.request.mockResolvedValueOnce(loadFixture('customer_single'));
    const wrapped = await client.customers.resolve(7, { resolutionDetails: true });
    expect(wrapped).toMatchObject({
      value: { id: 1 },
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
    });
  });

  it('resolves a customer by exact name', async () => {
    const rows = loadFixture('customer') as Array<Record<string, unknown>>;
    transport.request.mockResolvedValueOnce(rows);

    const res = await client.customers.resolve({ name: 'Acme Corp' });

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/customers',
      query: { name: 'Acme Corp', size: 500 },
    });
    expect(res).toMatchObject({ id: 1, name: 'Acme Corp', country: 'US' });
    expect(res).not.toHaveProperty('metaFields');

    // a bare string takes the same server-filter path
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.customers.resolve('Acme Corp')).resolves.toMatchObject({ id: 1 });

    // expand returns the full record
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.customers.resolve({ name: 'Acme Corp' }, { expand: true })).resolves.toEqual(rows[0]);
  });

  it('returns null after a complete match with no hit', async () => {
    // the vendor `name` filter matches partially: the exact compare rejects it
    const partial = [{ id: 9, name: 'Acme Corporation' }];
    transport.request.mockResolvedValueOnce(partial);

    await expect(client.customers.resolve({ name: 'Acme' })).resolves.toBeNull();

    // the Resolution wrapper is honest about the complete scan
    transport.request.mockResolvedValueOnce(partial);
    const res = await client.customers.resolve({ name: 'Acme' }, { resolutionDetails: true });
    expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 1, scanTruncated: false });

    // a page that filled its cap without a hit is NOT reported as null
    const fullPage = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: 'Other' }));
    transport.request.mockResolvedValueOnce(fullPage);
    const err = await client.customers.resolve({ name: 'Acme' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_TRUNCATED');
  });

  it('throws RESOLUTION_AMBIGUOUS when a name matches several customers', async () => {
    const base = loadFixture('customer_single') as Record<string, unknown>;
    const twinA = { ...base, id: 11 };
    const twinB = { ...base, id: 12 };
    transport.request.mockResolvedValueOnce([twinA, twinB]);

    const err = await client.customers.resolve({ name: 'Acme Corp' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
    expect((err as ResolutionError).category).toBe('resolution');
    expect((err as ResolutionError).retryable).toBe(false);
    expect((err as ResolutionError).resourceIds).toEqual([11, 12]);
    expect((err as ResolutionError).operation).toBe('customers.resolve');
    expect((err as ResolutionError).suggestedAction).toBe('Retry with one of the candidate ids in resourceIds.');
  });
});

describe('customers.search (pinned rows)', () => {
  it('returns compact CustomerSummary rows for the spec filters', async () => {
    const fixture = loadFixture('customer');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.customers.search({ name: 'Acme', visible: true, customer: 4 });

    const call = transport.request.mock.calls[0]![0];
    expect(call.method).toBe('GET');
    expect(call.path).toBe('/api/customers');
    // every spec filter passes through unchanged; paging is the limit, not a param
    expect(call.query).toEqual({ name: 'Acme', visible: true, customer: 4, size: 25 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 1, name: 'Acme Corp', country: 'US' });
    expect(rows[0]).not.toHaveProperty('metaFields');
    expect(rows[0]).not.toHaveProperty('phone');
    expect(rows[0]).not.toHaveProperty('color-safe');

    // the documented maximum is honoured, and expand returns the full records
    transport.request.mockResolvedValueOnce(fixture);
    const full = await client.customers.search({ name: 'Acme' }, { limit: 100, expand: true });
    expect(transport.request.mock.calls[1]![0].query.size).toBe(100);
    expect(full).toEqual(fixture);
  });

  it('throws KimaiConfigError for a non-integer or out-of-range limit', async () => {
    await expect(client.customers.search({}, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.customers.search({}, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.customers.search({}, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();

    const err = await client.customers.search({}, { limit: 101 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).category).toBe('validation');
    expect((err as KimaiConfigError).retryable).toBe(false);
  });
});

describe('customers.getContext (pinned rows)', () => {
  it('returns the customer with its rates, comments and meta', async () => {
    const customer = loadFixture('customer_single') as Record<string, unknown>;
    const rates = loadFixture('customer_rate');
    const comments = loadFixture('comment');
    transport.request
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(rates)
      .mockResolvedValueOnce(comments);

    const ctx = await client.customers.getContext(1);

    expect(transport.request).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/api/customers/1',
      query: undefined,
    });
    expect(transport.request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/api/customers/1/rates',
      query: undefined,
    });
    expect(transport.request).toHaveBeenNthCalledWith(3, {
      method: 'GET',
      path: '/api/customers/1/comments',
      query: undefined,
    });
    expect(transport.request).toHaveBeenCalledTimes(3);

    // the customer is compact (no metaFields/contact detail) …
    expect(ctx.customer).toMatchObject({ id: 1, name: 'Acme Corp', country: 'US', currency: 'USD' });
    expect(ctx.customer).not.toHaveProperty('metaFields');
    expect(ctx.customer).not.toHaveProperty('phone');
    // … and the record's own metaFields ride along without another wire call
    expect(ctx.meta).toEqual(customer.metaFields);
    // the child rows are compact too: the embedded user objects are dropped
    expect(ctx.rates[0]).toMatchObject({ id: 1, userId: 1, rate: 100 });
    expect(ctx.rates[0]).not.toHaveProperty('user');
    expect(ctx.comments[0]).toMatchObject({ id: 1, message: 'Important client note' });
    expect(ctx.comments[0]).not.toHaveProperty('createdBy');
  });

  it('returns the full child records when expand is set', async () => {
    const customer = loadFixture('customer_single') as Record<string, unknown>;
    const rates = loadFixture('customer_rate');
    const comments = loadFixture('comment');
    transport.request
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(rates)
      .mockResolvedValueOnce(comments);

    const ctx = await client.customers.getContext(1, { expand: true });

    expect(ctx.customer).toEqual(customer);
    expect(ctx.customer).toHaveProperty('metaFields');
    expect(ctx.rates).toEqual(rates);
    expect((ctx.rates[0] as Record<string, unknown>)).toHaveProperty('user');
    expect((ctx.comments[0] as unknown as Record<string, unknown>)).toHaveProperty('createdBy');
  });
});
});
