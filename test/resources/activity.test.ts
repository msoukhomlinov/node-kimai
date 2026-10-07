// ActivityClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { ActivityClient } from '../../src/resources/ActivityClient';
import { createApiError, KimaiConfigError, NotFoundError, ResolutionError } from '../../src/errors';
import type { ActivityEditForm } from '../../src/types';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
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

      const call = transport.request.mock.calls[0]![0];
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

// ---------------------------------------------------------------------------
// Phase F agent-execution-layer rows. The `describe`/`it` titles below are
// pinned VERBATIM from capabilities.plan.json (scripts/check-capabilities.mjs
// [test-rows] matches each title in this file).
// ---------------------------------------------------------------------------

describe('activities.list (pinned rows)', () => {
  it('returns the unwrapped activities list', async () => {
    const fixture = loadFixture('activity');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.activities.list({ name: 'Development', visible: true });

    expect(rows).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities',
      query: { name: 'Development', visible: true },
    });
  });

  it('does not send page/size params for this non-paginated endpoint', async () => {
    // This endpoint is not paged by the SDK: `getAll` delegates to a single
    // `list` and never injects paging params, so the whole collection arrives
    // in one request.
    const fixture = loadFixture('activity');
    transport.request.mockResolvedValueOnce(fixture);

    const result = await client.activities.getAll();

    expect(transport.request).toHaveBeenCalledTimes(1);
    const call = transport.request.mock.calls[0]![0];
    // no paging params are injected for this endpoint
    expect(call.query).toBeUndefined();
    expect(result).toEqual(fixture);
  });
});

describe('activities.getById (pinned rows)', () => {
  it('returns the unwrapped activities record', async () => {
    const fixture = loadFixture('activity_single');
    transport.request.mockResolvedValueOnce(fixture);

    const activity = await client.activities.getById(1);

    expect(activity).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities/1',
      query: undefined,
    });
  });

  it('normalises a 404 into NOT_FOUND', async () => {
    transport.request.mockRejectedValueOnce(
      createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
    );

    const err = await client.activities.getById(404).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).code).toBe('NOT_FOUND');
    expect((err as NotFoundError).category).toBe('not_found');
    expect((err as NotFoundError).retryable).toBe(false);
  });
});

describe('activities.getRates (pinned rows)', () => {
  it('calls the activities.getRates endpoint and returns the documented shape', async () => {
    const fixture = loadFixture('activity_rate');
    transport.request.mockResolvedValueOnce(fixture);

    const rates = await client.activities.getRates(1);

    expect(rates).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities/1/rates',
      query: undefined,
    });
  });
});

describe('activities.create (pinned rows)', () => {
  it('returns the created activities record', async () => {
    const fixture = loadFixture('activity_entity');
    transport.request.mockResolvedValueOnce(fixture);

    const input: ActivityEditForm = { name: 'New Activity', visible: true, billable: true };
    const created = await client.activities.create(input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/activities',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const input: ActivityEditForm = { name: 'New Activity', visible: true };
    const res = await client.activities.create(input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.wouldApply).toBe(true);
    expect(res.operation).toBe('activities.create');
    expect(res.target).toEqual({ resource: 'activities', ids: [] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/activities' });
    expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.update (pinned rows)', () => {
  it('returns the updated activities record', async () => {
    const fixture = loadFixture('activity_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input: ActivityEditForm = { name: 'Updated Activity' };
    const updated = await client.activities.update(1, input);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/activities/1',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no PATCH request and returns simulated: true', async () => {
    const input: ActivityEditForm = { name: 'Updated Activity' };
    const res = await client.activities.update(1, input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.update');
    expect(res.target).toEqual({ resource: 'activities', ids: [1] });
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/activities/1' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.updateMeta (pinned rows)', () => {
  it('calls the activities.updateMeta endpoint and normalises the result', async () => {
    const fixture = loadFixture('activity_single');
    transport.request.mockResolvedValueOnce(fixture);

    const meta = { department: 'engineering' };
    const updated = await client.activities.updateMeta(1, meta);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/activities/1/meta',
      query: undefined,
      body: meta,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.activities.updateMeta(1, { department: 'engineering' }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.updateMeta');
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/activities/1/meta' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'meta-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.createRate (pinned rows)', () => {
  it('calls the activities.createRate endpoint and normalises the result', async () => {
    const fixture = loadFixture('activity_rate_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { rate: 50, user: 1 };
    const created = await client.activities.createRate(1, input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/activities/1/rates',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.activities.createRate(1, { rate: 50, user: 1 }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.createRate');
    expect(res.target).toEqual({ resource: 'activities', ids: [1] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/activities/1/rates' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.addToTeam (pinned rows)', () => {
  it('calls the activities.addToTeam endpoint and normalises the result', async () => {
    const fixture = loadFixture('team_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { teams: [1, 2] };
    const team = await client.activities.addToTeam(1, input);

    expect(team).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/activities/1/team',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.activities.addToTeam(1, { teams: [1, 2] }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.addToTeam');
    expect(res.request).toEqual({ method: 'POST', path: '/api/activities/1/team' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'team-ids', ok: true },
    ]);
    expect(res.data).toEqual({ teams: [1, 2] });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.delete (pinned rows)', () => {
  it('resolves void after a successful delete', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.activities.delete(1);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/activities/1',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no DELETE request and returns simulated: true', async () => {
    const res = await client.activities.delete(1, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.delete');
    expect(res.target).toEqual({ resource: 'activities', ids: [1] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/activities/1' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.deleteRate (pinned rows)', () => {
  it('calls the activities.deleteRate endpoint and normalises the result', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.activities.deleteRate(1, 5);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/activities/1/rates/5',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.activities.deleteRate(1, 5, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('activities.deleteRate');
    expect(res.target).toEqual({ resource: 'activities', ids: [1, 5] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/activities/1/rates/5' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('activities.resolve (pinned rows)', () => {
  it('resolves an activity by numeric id', async () => {
    transport.request.mockResolvedValueOnce(loadFixture('activity_single'));

    const res = await client.activities.resolve(7);

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities/7',
      query: undefined,
    });
    expect(res).toMatchObject({ id: 1, name: 'Development', project: 1, number: 'ACT-001' });
    expect(res).not.toHaveProperty('metaFields');
    expect(res).not.toHaveProperty('comment');
    expect(res).not.toHaveProperty('color-safe');

    // `{ id }` and a bare numeric string take the same direct path
    transport.request.mockResolvedValueOnce(loadFixture('activity_single'));
    await client.activities.resolve({ id: 7 });
    expect(transport.request.mock.calls[1]![0].path).toBe('/api/activities/7');
    transport.request.mockResolvedValueOnce(loadFixture('activity_single'));
    await client.activities.resolve('7');
    expect(transport.request.mock.calls[2]![0].path).toBe('/api/activities/7');

    // the Resolution wrapper marks the direct fetch honestly
    transport.request.mockResolvedValueOnce(loadFixture('activity_single'));
    const wrapped = await client.activities.resolve(7, { resolutionDetails: true });
    expect(wrapped).toMatchObject({
      value: { id: 1 },
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
    });
  });

  it('resolves an activity by exact name', async () => {
    const rows = loadFixture('activity') as Array<Record<string, unknown>>;
    transport.request.mockResolvedValueOnce(rows);

    const res = await client.activities.resolve({ name: 'Development' });

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities',
      query: { name: 'Development', size: 500 },
    });
    expect(res).toMatchObject({ id: 1, name: 'Development', project: 1 });
    expect(res).not.toHaveProperty('metaFields');

    // a bare string takes the same server-filter path
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.activities.resolve('Development')).resolves.toMatchObject({ id: 1 });

    // expand returns the full record
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.activities.resolve({ name: 'Development' }, { expand: true })).resolves.toEqual(rows[0]);
  });

  it('returns null after a complete match with no hit', async () => {
    // the vendor `name` filter matches partially: the exact compare rejects it
    const partial = [{ id: 9, name: 'Development Support' }];
    transport.request.mockResolvedValueOnce(partial);

    await expect(client.activities.resolve({ name: 'Develop' })).resolves.toBeNull();

    // the Resolution wrapper is honest about the complete scan
    transport.request.mockResolvedValueOnce(partial);
    const res = await client.activities.resolve({ name: 'Develop' }, { resolutionDetails: true });
    expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 1, scanTruncated: false });

    // a page that filled its cap without a hit is NOT reported as null
    const fullPage = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: 'Other' }));
    transport.request.mockResolvedValueOnce(fullPage);
    const err = await client.activities.resolve({ name: 'Develop' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_TRUNCATED');
  });

  it('throws RESOLUTION_AMBIGUOUS when a name matches several activities', async () => {
    const base = loadFixture('activity_single') as Record<string, unknown>;
    const twinA = { ...base, id: 11 };
    const twinB = { ...base, id: 12 };
    transport.request.mockResolvedValueOnce([twinA, twinB]);

    const err = await client.activities.resolve({ name: 'Development' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
    expect((err as ResolutionError).category).toBe('resolution');
    expect((err as ResolutionError).retryable).toBe(false);
    expect((err as ResolutionError).resourceIds).toEqual([11, 12]);
    expect((err as ResolutionError).operation).toBe('activities.resolve');
    expect((err as ResolutionError).suggestedAction).toBe('Retry with one of the candidate ids in resourceIds.');
  });
});

describe('activities.search (pinned rows)', () => {
  it('returns compact ActivitySummary rows for the spec filters', async () => {
    const fixture = loadFixture('activity');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.activities.search({ name: 'Development', visible: true, customer: 4 });

    const call = transport.request.mock.calls[0]![0];
    expect(call.method).toBe('GET');
    expect(call.path).toBe('/api/activities');
    // every spec filter passes through unchanged; paging is the limit, not a param
    expect(call.query).toEqual({ name: 'Development', visible: true, customer: 4, size: 25 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 1, name: 'Development', project: 1, number: 'ACT-001' });
    expect(rows[0]).not.toHaveProperty('metaFields');
    expect(rows[0]).not.toHaveProperty('comment');
    expect(rows[0]).not.toHaveProperty('color-safe');

    // expand returns the full records
    transport.request.mockResolvedValueOnce(fixture);
    await expect(client.activities.search({ name: 'Development' }, { expand: true })).resolves.toEqual(fixture);
  });

  it('sends a default limit of 25', async () => {
    transport.request.mockResolvedValueOnce([]);

    await client.activities.search();

    expect(transport.request.mock.calls[0]![0].query.size).toBe(25);
  });

  it('caps the limit at 100', async () => {
    transport.request.mockResolvedValueOnce([]);

    await client.activities.search({}, { limit: 100 });

    expect(transport.request.mock.calls[0]![0].query.size).toBe(100);
  });

  it('throws KimaiConfigError for a non-integer or out-of-range limit', async () => {
    await expect(client.activities.search({}, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.activities.search({}, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.activities.search({}, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();

    const err = await client.activities.search({}, { limit: 101 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).category).toBe('validation');
    expect((err as KimaiConfigError).retryable).toBe(false);
  });
});
});
