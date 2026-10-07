// TagClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { KimaiConfigError, ResolutionError } from '../../src/errors';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
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
    it('should call GET /api/tags/find without params', async () => {
      const fixture = loadFixture('tag');
      transport.request.mockResolvedValueOnce(fixture);

      await client.tags.list();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
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

// ---------------------------------------------------------------------------
// Phase F (agent execution layer, group: tags).
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: tags).
// ---------------------------------------------------------------------------

/** Tags as `GET /api/tags/find` returns them (with the derived color-safe). */
const PHASE_F_TAGS = [
  { id: 3, name: 'feature', visible: true, color: '#4caf50', 'color-safe': 'dark' },
  { id: 4, name: 'urgent', visible: false, color: '#f44336', 'color-safe': 'light' },
];

/** The compact projection the helpers return by default (no color-safe). */
const PHASE_F_TAG_SUMMARY = { id: 3, name: 'feature', visible: true, color: '#4caf50' };

describe('TagClient — Phase F agent execution layer', () => {
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

  describe('tags.list (pinned rows)', () => {
    it('returns the unwrapped tags list', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);

      const rows = await client.tags.list();

      expect(rows).toEqual(PHASE_F_TAGS);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: undefined,
      });
    });

    it('does not send page/size params for this non-paginated endpoint', async () => {
      // Non-paginated endpoint: GET declares no page/size, so the whole
      // collection is one page and no page params may be sent.
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);

      const rows = await client.tags.list();

      expect(rows).toEqual(PHASE_F_TAGS);
      expect(transport.request).toHaveBeenCalledTimes(1);
      const call = transport.request.mock.calls[0]![0];
      expect(call.query).toBeUndefined();
    });
  });

  describe('tags.find (pinned rows)', () => {
    it('calls the tags.find endpoint and returns the documented shape', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);

      const rows = await client.tags.find('feat');

      expect(rows).toEqual(PHASE_F_TAGS);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: { name: 'feat' },
      });
    });
  });

  describe('tags.create (pinned rows)', () => {
    it('returns the created tags record', async () => {
      const fixture = loadFixture('tag_single');
      transport.request.mockResolvedValueOnce(fixture);

      const created = await client.tags.create({ name: 'feature', color: '#4caf50' });

      expect(created).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/tags',
        body: { name: 'feature', color: '#4caf50' },
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const input = { name: 'feature', color: '#4caf50' };
      const res = await client.tags.create(input, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.wouldApply).toBe(true);
      expect(res.operation).toBe('tags.create');
      expect(res.target).toEqual({ resource: 'tags', ids: [] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/tags' });
      expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(res.data).toEqual(input);
      expect(transport.request).not.toHaveBeenCalled();

      // a blank name fails the local check without a wire call
      const blank = await client.tags.create({ name: '   ' }, { dryRun: true });
      expect(blank.checks).toEqual([{ name: 'required-fields', ok: false }]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('tags.delete (pinned rows)', () => {
    it('resolves void after a successful delete', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.tags.delete(3);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/tags/3',
      });
    });

    it('dry-run issues no DELETE request and returns simulated: true', async () => {
      const res = await client.tags.delete(3, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('tags.delete');
      expect(res.target).toEqual({ resource: 'tags', ids: [3] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/tags/3' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('tags.resolve (pinned rows)', () => {
    it('resolves a tag by numeric id', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);

      const res = await client.tags.resolve(3);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: undefined,
      });
      expect(res).toEqual(PHASE_F_TAG_SUMMARY);
      expect(res).not.toHaveProperty('color-safe');

      // a bare numeric string is an id, and { id } takes the same path
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      await expect(client.tags.resolve('3')).resolves.toEqual(PHASE_F_TAG_SUMMARY);

      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      const wrapped = await client.tags.resolve({ id: 3 }, { resolutionDetails: true });
      expect(wrapped).toMatchObject({ value: { id: 3 }, resolutionCost: 'client-scan', scanned: 2, scanTruncated: false });
    });

    it('resolves a tag by exact name', async () => {
      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!]);

      const res = await client.tags.resolve({ name: 'feature' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: { name: 'feature' },
      });
      expect(res).toEqual(PHASE_F_TAG_SUMMARY);

      // a bare non-numeric string is a name; expand returns the full record
      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!]);
      await expect(client.tags.resolve('feature')).resolves.toEqual(PHASE_F_TAG_SUMMARY);

      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!]);
      const full = await client.tags.resolve('feature', { expand: true });
      expect(full).toHaveProperty('color-safe', 'dark');

      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!]);
      const wrapped = await client.tags.resolve({ name: 'feature' }, { resolutionDetails: true });
      expect(wrapped).toMatchObject({ value: { id: 3 }, resolutionCost: 'server-filter', scanned: 1 });
    });

    it('returns null when no tag matches', async () => {
      transport.request.mockResolvedValueOnce([]);
      await expect(client.tags.resolve({ name: 'nope' })).resolves.toBeNull();

      // the id path reads the complete list, so a miss is a complete scan too
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      await expect(client.tags.resolve(99)).resolves.toBeNull();

      transport.request.mockResolvedValueOnce([]);
      const res = await client.tags.resolve({ name: 'nope' }, { resolutionDetails: true });
      expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false });

      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      const byId = await client.tags.resolve(99, { resolutionDetails: true });
      expect(byId).toEqual({ value: null, resolutionCost: 'client-scan', scanned: 2, scanTruncated: false });
    });

    it('throws RESOLUTION_AMBIGUOUS with the candidate ids for several exact matches', async () => {
      const twin = { ...PHASE_F_TAGS[0]!, id: 8 };
      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!, twin]);

      const err = await client.tags.resolve('feature').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([3, 8]);
      expect((err as ResolutionError).operation).toBe('tags.resolve');
    });

    it('throws RESOLUTION_AMBIGUOUS when the complete tag list holds two records with the id', async () => {
      const twin = { ...PHASE_F_TAGS[0]! };
      transport.request.mockResolvedValueOnce([PHASE_F_TAGS[0]!, twin]);

      const err = await client.tags.resolve(3).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([3, 3]);
    });

    it('throws RESOLUTION_AMBIGUOUS when the inexact name filter matches none exactly', async () => {
      transport.request.mockResolvedValueOnce([{ id: 9, name: 'feature-request' }]);

      const err = await client.tags.resolve('feature').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([9]);
    });

    it('throws KimaiConfigError for an identifier of no documented kind', async () => {
      await expect(client.tags.resolve('   ')).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.tags.resolve({ nope: 1 } as never)).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.tags.resolve(null as never)).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
      await expect(client.tags.resolve(0)).rejects.toBeInstanceOf(KimaiConfigError);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('tags.search (pinned rows)', () => {
    it('returns compact TagSummary rows for a name filter', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);

      const rows = await client.tags.search({ name: 'feat' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: { name: 'feat' },
      });
      expect(rows).toEqual([PHASE_F_TAG_SUMMARY, { id: 4, name: 'urgent', visible: false, color: '#f44336' }]);
      expect(rows[0]).not.toHaveProperty('color-safe');

      // no filter is one unfiltered read; expand keeps the full records
      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      const all = await client.tags.search();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/tags/find',
        query: undefined,
      });
      expect(all).toHaveLength(2);

      transport.request.mockResolvedValueOnce(PHASE_F_TAGS);
      const full = await client.tags.search({ name: 'feat' }, { limit: 100, expand: true });
      expect(full[0]).toHaveProperty('color-safe', 'dark');

      // a non-array body yields no rows
      transport.request.mockResolvedValueOnce({});
      await expect(client.tags.search()).resolves.toEqual([]);
    });

    it('throws KimaiConfigError for a non-integer or out-of-range limit', async () => {
      await expect(client.tags.search({}, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.tags.search({}, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.tags.search({}, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
      expect(transport.request).not.toHaveBeenCalled();

      const err = await client.tags.search({}, { limit: 101 }).catch((e: unknown) => e);
      expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
      expect((err as KimaiConfigError).category).toBe('validation');
      expect((err as KimaiConfigError).retryable).toBe(false);

      // the default (25) and the hard maximum (100) both slice the rows
      const many = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: `tag${i + 1}` }));
      transport.request.mockResolvedValueOnce(many);
      await expect(client.tags.search()).resolves.toHaveLength(25);
      transport.request.mockResolvedValueOnce(many);
      await expect(client.tags.search(undefined, { limit: 100 })).resolves.toHaveLength(40);
    });
  });
});
