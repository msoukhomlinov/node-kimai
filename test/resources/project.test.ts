// ProjectClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import type { ProjectEditForm } from '../../src/types';
import { createApiError, KimaiConfigError, NotFoundError, ResolutionError } from '../../src/errors';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

/** Collect an AsyncIterable into an array (the D2 `list` stream). */
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
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

      const result = await collect(client.projects.list());

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

      await collect(client.projects.list({ customer: 1, visible: true }));

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/projects',
        query: { customer: 1, visible: true },
      });
    });
  });

  describe('listAll', () => {
    it('should delegate to list for non-paginated resource', async () => {
      const fixture = loadFixture('project');
      transport.request.mockResolvedValueOnce(fixture);

      const result = await client.projects.listAll();

      expect(transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should call GET /api/projects/{id}', async () => {
      const fixture = loadFixture('project_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.projects.get(1);

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


// ---------------------------------------------------------------------------
// Phase F agent-execution-layer rows. The `describe`/`it` titles below are
// pinned VERBATIM from capabilities.plan.json (scripts/check-capabilities.mjs
// [test-rows] matches each title in this file).
// ---------------------------------------------------------------------------

describe('projects.list (pinned rows)', () => {
  it('streams the unwrapped projects records', async () => {
    const fixture = loadFixture('project');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await collect(client.projects.list({ name: 'Website', visible: true }));

    expect(rows).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects',
      query: { name: 'Website', visible: true },
    });
  });

  it('listAll collects the single non-paginated batch', async () => {
    const fixture = loadFixture('project');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.projects.listAll();

    expect(rows).toEqual(fixture);
  });

  it('does not send page/size params for this non-paginated endpoint', async () => {
    // This endpoint is not paged by the SDK: `listAll` delegates to a single
    // `list` and never injects paging params, so the whole collection arrives
    // in one request.
    const fixture = loadFixture('project');
    transport.request.mockResolvedValueOnce(fixture);

    const result = await client.projects.listAll();

    expect(transport.request).toHaveBeenCalledTimes(1);
    const call = transport.request.mock.calls[0]![0];
    // no paging params are injected for this endpoint
    expect(call.query).toBeUndefined();
    expect(result).toEqual(fixture);
  });
});

describe('projects.get (pinned rows)', () => {
  it('returns the unwrapped projects record', async () => {
    const fixture = loadFixture('project_single');
    transport.request.mockResolvedValueOnce(fixture);

    const project = await client.projects.get(1);

    expect(project).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects/1',
      query: undefined,
    });
  });

  it('normalises a 404 into NOT_FOUND', async () => {
    transport.request.mockRejectedValueOnce(
      createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
    );

    const err = await client.projects.get(404).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).code).toBe('NOT_FOUND');
    expect((err as NotFoundError).category).toBe('not_found');
    expect((err as NotFoundError).retryable).toBe(false);
  });
});

describe('projects.listComments (pinned rows)', () => {
  it('calls the projects.listComments endpoint and returns the documented shape', async () => {
    const fixture = loadFixture('comment');
    transport.request.mockResolvedValueOnce(fixture);

    const comments = await client.projects.listComments(1);

    expect(comments).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects/1/comments',
      query: undefined,
    });
  });
});

describe('projects.getRates (pinned rows)', () => {
  it('calls the projects.getRates endpoint and returns the documented shape', async () => {
    const fixture = loadFixture('project_rate');
    transport.request.mockResolvedValueOnce(fixture);

    const rates = await client.projects.getRates(1);

    expect(rates).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects/1/rates',
      query: undefined,
    });
  });
});

describe('projects.create (pinned rows)', () => {
  it('returns the created projects record', async () => {
    const fixture = loadFixture('project_entity');
    transport.request.mockResolvedValueOnce(fixture);

    const input: ProjectEditForm = { name: 'Website Redesign', customer: 1 };
    const created = await client.projects.create(input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/projects',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const input: ProjectEditForm = { name: 'Website Redesign', customer: 1 };
    const res = await client.projects.create(input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.wouldApply).toBe(true);
    expect(res.operation).toBe('projects.create');
    expect(res.target).toEqual({ resource: 'projects', ids: [] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/projects' });
    expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.update (pinned rows)', () => {
  it('returns the updated projects record', async () => {
    const fixture = loadFixture('project_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input: ProjectEditForm = { name: 'Website Redesign', customer: 1 };
    const updated = await client.projects.update(1, input);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/projects/1',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no PATCH request and returns simulated: true', async () => {
    const input: ProjectEditForm = { name: 'Website Redesign', customer: 1 };
    const res = await client.projects.update(1, input, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.update');
    expect(res.target).toEqual({ resource: 'projects', ids: [1] });
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/projects/1' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(res.data).toEqual(input);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.updateMeta (pinned rows)', () => {
  it('calls the projects.updateMeta endpoint and normalises the result', async () => {
    const fixture = loadFixture('project_single');
    transport.request.mockResolvedValueOnce(fixture);

    const meta = { department: 'engineering' };
    const updated = await client.projects.updateMeta(1, meta);

    expect(updated).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/projects/1/meta',
      query: undefined,
      body: meta,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.updateMeta(1, { department: 'engineering' }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.updateMeta');
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/projects/1/meta' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'meta-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.createRate (pinned rows)', () => {
  it('calls the projects.createRate endpoint and normalises the result', async () => {
    const fixture = loadFixture('project_rate_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { rate: 80, user: 1 };
    const created = await client.projects.createRate(1, input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/projects/1/rates',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.createRate(1, { rate: 80, user: 1 }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.createRate');
    expect(res.target).toEqual({ resource: 'projects', ids: [1] });
    expect(res.request).toEqual({ method: 'POST', path: '/api/projects/1/rates' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.createComment (pinned rows)', () => {
  it('calls the projects.createComment endpoint and normalises the result', async () => {
    const fixture = loadFixture('comment_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { message: 'Kick-off scheduled', pinned: false };
    const created = await client.projects.createComment(1, input);

    expect(created).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/projects/1/comments',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.createComment(1, { message: 'Kick-off scheduled' }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.createComment');
    expect(res.request).toEqual({ method: 'POST', path: '/api/projects/1/comments' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'required-fields', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.pinComment (pinned rows)', () => {
  it('calls the projects.pinComment endpoint and normalises the result', async () => {
    const fixture = loadFixture('comment_single');
    transport.request.mockResolvedValueOnce(fixture);

    const pinned = await client.projects.pinComment(1, 3);

    expect(pinned).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/projects/1/comments/3/pin',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.pinComment(1, 3, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.pinComment');
    expect(res.target).toEqual({ resource: 'projects', ids: [1, 3] });
    expect(res.request).toEqual({ method: 'PATCH', path: '/api/projects/1/comments/3/pin' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'comment-id', ok: true },
    ]);
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.addToTeam (pinned rows)', () => {
  it('calls the projects.addToTeam endpoint and normalises the result', async () => {
    const fixture = loadFixture('team_single');
    transport.request.mockResolvedValueOnce(fixture);

    const input = { teams: [1] };
    const team = await client.projects.addToTeam(1, input);

    expect(team).toEqual(fixture);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/projects/1/team',
      query: undefined,
      body: input,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.addToTeam(1, { teams: [1] }, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.addToTeam');
    expect(res.request).toEqual({ method: 'POST', path: '/api/projects/1/team' });
    expect(res.checks).toEqual([
      { name: 'target-id', ok: true },
      { name: 'team-ids', ok: true },
    ]);
    expect(res.data).toEqual({ teams: [1] });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.delete (pinned rows)', () => {
  it('resolves void after a successful delete', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.projects.delete(1);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/projects/1',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no DELETE request and returns simulated: true', async () => {
    const res = await client.projects.delete(1, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.delete');
    expect(res.target).toEqual({ resource: 'projects', ids: [1] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/projects/1' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.deleteRate (pinned rows)', () => {
  it('calls the projects.deleteRate endpoint and normalises the result', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.projects.deleteRate(1, 5);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/projects/1/rates/5',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.deleteRate(1, 5, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.deleteRate');
    expect(res.target).toEqual({ resource: 'projects', ids: [1, 5] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/projects/1/rates/5' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.deleteComment (pinned rows)', () => {
  it('calls the projects.deleteComment endpoint and normalises the result', async () => {
    transport.request.mockResolvedValueOnce(undefined);

    const result = await client.projects.deleteComment(1, 3);

    expect(result).toBeUndefined();
    expect(transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/api/projects/1/comments/3',
      query: undefined,
      body: undefined,
    });
  });

  it('dry-run issues no mutating request and returns simulated: true', async () => {
    const res = await client.projects.deleteComment(1, 3, { dryRun: true });

    expect(res.simulated).toBe(true);
    expect(res.operation).toBe('projects.deleteComment');
    expect(res.target).toEqual({ resource: 'projects', ids: [1, 3] });
    expect(res.request).toEqual({ method: 'DELETE', path: '/api/projects/1/comments/3' });
    expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
    expect(transport.request).not.toHaveBeenCalled();
  });
});

describe('projects.resolve (pinned rows)', () => {
  it('resolves a project by numeric id', async () => {
    transport.request.mockResolvedValueOnce(loadFixture('project_single'));

    const res = await client.projects.resolve(7);

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects/7',
      query: undefined,
    });
    expect(res).toMatchObject({ id: 1, name: 'Website Redesign', customer: 1, number: 'PROJ-001' });
    expect(res).not.toHaveProperty('metaFields');
    expect(res).not.toHaveProperty('comment');
    expect(res).not.toHaveProperty('color-safe');

    // `{ id }` and a bare numeric string take the same direct path
    transport.request.mockResolvedValueOnce(loadFixture('project_single'));
    await client.projects.resolve({ id: 7 });
    expect(transport.request.mock.calls[1]![0].path).toBe('/api/projects/7');
    transport.request.mockResolvedValueOnce(loadFixture('project_single'));
    await client.projects.resolve('7');
    expect(transport.request.mock.calls[2]![0].path).toBe('/api/projects/7');

    // the Resolution wrapper marks the direct fetch honestly
    transport.request.mockResolvedValueOnce(loadFixture('project_single'));
    const wrapped = await client.projects.resolve(7, { resolutionDetails: true });
    expect(wrapped).toMatchObject({
      value: { id: 1 },
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
    });
  });

  it('resolves a project by exact name', async () => {
    const rows = loadFixture('project') as Array<Record<string, unknown>>;
    transport.request.mockResolvedValueOnce(rows);

    const res = await client.projects.resolve({ name: 'Website Redesign' });

    expect(transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/projects',
      query: { name: 'Website Redesign', size: 500 },
    });
    expect(res).toMatchObject({ id: 1, name: 'Website Redesign', customer: 1 });
    expect(res).not.toHaveProperty('metaFields');

    // a bare string takes the same server-filter path
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.projects.resolve('Website Redesign')).resolves.toMatchObject({ id: 1 });

    // expand returns the full record
    transport.request.mockResolvedValueOnce(rows);
    await expect(client.projects.resolve({ name: 'Website Redesign' }, { expand: true })).resolves.toEqual(rows[0]);
  });

  it('returns null after a complete match with no hit', async () => {
    // the vendor `name` filter matches partially: the exact compare rejects it
    const partial = [{ id: 9, name: 'Website Redesign Phase 2' }];
    transport.request.mockResolvedValueOnce(partial);

    await expect(client.projects.resolve({ name: 'Website' })).resolves.toBeNull();

    // the Resolution wrapper is honest about the complete scan
    transport.request.mockResolvedValueOnce(partial);
    const res = await client.projects.resolve({ name: 'Website' }, { resolutionDetails: true });
    expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 1, scanTruncated: false });

    // a page that filled its cap without a hit is NOT reported as null
    const fullPage = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: 'Other' }));
    transport.request.mockResolvedValueOnce(fullPage);
    const err = await client.projects.resolve({ name: 'Website' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_TRUNCATED');
  });

  it('throws RESOLUTION_AMBIGUOUS when a name matches several projects', async () => {
    const base = loadFixture('project_single') as Record<string, unknown>;
    const twinA = { ...base, id: 11 };
    const twinB = { ...base, id: 12 };
    transport.request.mockResolvedValueOnce([twinA, twinB]);

    const err = await client.projects.resolve({ name: 'Website Redesign' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResolutionError);
    expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
    expect((err as ResolutionError).category).toBe('resolution');
    expect((err as ResolutionError).retryable).toBe(false);
    expect((err as ResolutionError).resourceIds).toEqual([11, 12]);
    expect((err as ResolutionError).operation).toBe('projects.resolve');
    expect((err as ResolutionError).suggestedAction).toBe('Retry with one of the candidate ids in resourceIds.');
  });
});

describe('projects.search (pinned rows)', () => {
  it('returns compact ProjectSummary rows for the spec filters', async () => {
    const fixture = loadFixture('project');
    transport.request.mockResolvedValueOnce(fixture);

    const rows = await client.projects.search({ name: 'Website', visible: true, customer: 1, activity: 2 });

    const call = transport.request.mock.calls[0]![0];
    expect(call.method).toBe('GET');
    expect(call.path).toBe('/api/projects');
    // every spec filter passes through unchanged; paging is the limit, not a param
    expect(call.query).toEqual({ name: 'Website', visible: true, customer: 1, activity: 2, size: 25 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 1, name: 'Website Redesign', customer: 1, number: 'PROJ-001' });
    expect(rows[0]).not.toHaveProperty('metaFields');
    expect(rows[0]).not.toHaveProperty('comment');
    expect(rows[0]).not.toHaveProperty('color-safe');

    // the documented maximum is honoured, and expand returns the full records
    transport.request.mockResolvedValueOnce(fixture);
    const full = await client.projects.search({ name: 'Website' }, { limit: 100, expand: true });
    expect(transport.request.mock.calls[1]![0].query.size).toBe(100);
    expect(full).toEqual(fixture);
  });

  it('throws KimaiConfigError for a non-integer or out-of-range limit', async () => {
    await expect(client.projects.search({}, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.projects.search({}, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
    await expect(client.projects.search({}, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
    expect(transport.request).not.toHaveBeenCalled();

    const err = await client.projects.search({}, { limit: 101 }).catch((e: unknown) => e);
    expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
    expect((err as KimaiConfigError).category).toBe('validation');
    expect((err as KimaiConfigError).retryable).toBe(false);
  });
});

describe('projects.getContext (pinned rows)', () => {
  it('returns the project with its customer, rates and meta', async () => {
    const project = loadFixture('project_single') as Record<string, unknown>; // customer: 1
    const customer = loadFixture('customer_single');
    const rates = loadFixture('project_rate');
    transport.request
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(rates);

    const ctx = await client.projects.getContext(1);

    expect(transport.request).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/api/projects/1',
      query: undefined,
    });
    expect(transport.request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/api/customers/1',
      query: undefined,
    });
    expect(transport.request).toHaveBeenNthCalledWith(3, {
      method: 'GET',
      path: '/api/projects/1/rates',
      query: undefined,
    });
    expect(transport.request).toHaveBeenCalledTimes(3);

    // the project is compact (no metaFields/long-form comment) …
    expect(ctx.project).toMatchObject({ id: 1, name: 'Website Redesign', customer: 1 });
    expect(ctx.project).not.toHaveProperty('metaFields');
    expect(ctx.project).not.toHaveProperty('comment');
    // … and the record's own metaFields ride along without another wire call
    expect(ctx.meta).toEqual(project.metaFields);
    // the customer and the rate rows are compact too
    expect(ctx.customer).toMatchObject({ id: 1, name: 'Acme Corp', country: 'US' });
    expect(ctx.customer).not.toHaveProperty('phone');
    expect(ctx.rates[0]).toMatchObject({ id: 1, rate: 80 });
    expect(ctx.rates[0]).not.toHaveProperty('user');

    // a project with no customer reference issues no customer read
    const orphan = { id: 2, name: 'Internal', customer: undefined, metaFields: [] };
    transport.request
      .mockResolvedValueOnce(orphan)
      .mockResolvedValueOnce(loadFixture('project_rate'));
    const noCustomer = await client.projects.getContext(2);
    expect(noCustomer.customer).toBeNull();
    expect(transport.request).toHaveBeenCalledTimes(5);
  });

  it('returns the full child records when expand is set', async () => {
    const project = loadFixture('project_single') as Record<string, unknown>; // customer: 1
    const customer = loadFixture('customer_single');
    const rates = loadFixture('project_rate');
    transport.request
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(rates);

    const ctx = await client.projects.getContext(1, { expand: true });

    expect(ctx.project).toEqual(project);
    expect(ctx.project).toHaveProperty('metaFields');
    expect(ctx.customer).toEqual(customer);
    expect(ctx.customer).toHaveProperty('phone');
    expect(ctx.rates).toEqual(rates);
  });
});
});
