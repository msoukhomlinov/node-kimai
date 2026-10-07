// UserClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { KimaiConfigError, NotFoundError, ResolutionError, createApiError } from '../../src/errors';
import type { UserCreateForm, UserEditForm } from '../../src/types';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
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

      const input: UserCreateForm = { username: 'newuser', email: 'new@example.com', language: 'en', locale: 'en', timezone: 'UTC', plainPassword: 'secret123' };
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

      const input: UserEditForm = { email: 'updated@example.com', language: 'en', locale: 'en', timezone: 'UTC' };
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
      expect('delete' in client.users).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Phase F (agent execution layer, group: users).
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: users).
// ---------------------------------------------------------------------------

/** Two users as `GET /api/users` returns them (with the deprecated apiToken marker). */
const PHASE_F_USERS = [
  {
    id: 1,
    username: 'admin',
    alias: 'Admin User',
    title: 'Mr.',
    email: 'admin@example.com',
    language: 'en',
    locale: 'en',
    timezone: 'UTC',
    enabled: true,
    systemAccount: false,
    apiToken: true,
  },
  {
    id: 2,
    username: 'dev',
    alias: 'Dev User',
    email: 'dev@example.com',
    language: 'en',
    locale: 'en',
    timezone: 'UTC',
    enabled: true,
    systemAccount: false,
    apiToken: true,
  },
];

/** The compact projection the helpers return by default (no apiToken). */
const PHASE_F_USER_SUMMARY = {
  id: 1,
  username: 'admin',
  alias: 'Admin User',
  title: 'Mr.',
  email: 'admin@example.com',
  language: 'en',
  locale: 'en',
  timezone: 'UTC',
  enabled: true,
  systemAccount: false,
};

const PHASE_F_NEW_USER = {
  username: 'newuser',
  email: 'new@example.com',
  language: 'en',
  locale: 'en',
  timezone: 'UTC',
  plainPassword: 'secret123',
} as const;

describe('UserClient — Phase F agent execution layer', () => {
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

  describe('users.list (pinned rows)', () => {
    it('returns the unwrapped users list', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      const rows = await client.users.list();

      expect(rows).toEqual(PHASE_F_USERS);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users',
        query: undefined,
      });
    });

    it('does not send page/size params for this non-paginated endpoint', async () => {
      // Non-paginated endpoint: GET declares no page/size, so the whole
      // collection is one page and no page params may be sent.
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      const rows = await client.users.list();

      expect(rows).toEqual(PHASE_F_USERS);
      expect(transport.request).toHaveBeenCalledTimes(1);
      const call = transport.request.mock.calls[0]![0];
      expect(call.query).toBeUndefined();
    });
  });

  describe('users.getById (pinned rows)', () => {
    it('returns the unwrapped users record', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const user = await client.users.getById(1);

      expect(user).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users/1',
      });
    });

    it('normalises a 404 into NOT_FOUND', async () => {
      transport.request.mockRejectedValueOnce(
        createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
      );

      const err = await client.users.getById(404).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).code).toBe('NOT_FOUND');
      expect((err as NotFoundError).category).toBe('not_found');
      expect((err as NotFoundError).retryable).toBe(false);
    });
  });

  describe('users.getMe (pinned rows)', () => {
    it('calls the users.getMe endpoint and returns the documented shape', async () => {
      const fixture = loadFixture('user_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const me = await client.users.getMe();

      expect(me).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users/me',
      });
    });
  });

  describe('users.create (pinned rows)', () => {
    it('returns the created users record', async () => {
      const fixture = loadFixture('user_entity');
      transport.request.mockResolvedValueOnce(fixture);

      const created = await client.users.create({ ...PHASE_F_NEW_USER });

      expect(created).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/users',
        body: { ...PHASE_F_NEW_USER },
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.users.create({ ...PHASE_F_NEW_USER }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.wouldApply).toBe(true);
      expect(res.operation).toBe('users.create');
      expect(res.target).toEqual({ resource: 'users', ids: [] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/users' });
      expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(res.data).toEqual({ ...PHASE_F_NEW_USER });
      expect(transport.request).not.toHaveBeenCalled();
    });

    it('dry-run reports the required fields the vendor model needs as a failed check', async () => {
      const res = await client.users.create({} as never, { dryRun: true });

      expect(res.checks).toEqual([{ name: 'required-fields', ok: false }]);
      expect(res.warnings.join(' | ')).toContain('username');
      expect(res.warnings.join(' | ')).toContain('timezone');
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('users.update (pinned rows)', () => {
    it('returns the updated users record', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const input = { email: 'updated@example.com', language: 'en', locale: 'en', timezone: 'UTC' } as const;
      const updated = await client.users.update(1, { ...input });

      expect(updated).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/users/1',
        body: { ...input },
      });
    });

    it('dry-run issues no PATCH request and returns simulated: true', async () => {
      const input = { email: 'updated@example.com', language: 'en', locale: 'en', timezone: 'UTC' } as const;
      const res = await client.users.update(1, { ...input }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('users.update');
      expect(res.target).toEqual({ resource: 'users', ids: [1] });
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/users/1' });
      expect(res.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'required-fields', ok: true },
      ]);
      expect(res.data).toEqual({ ...input });
      expect(transport.request).not.toHaveBeenCalled();
    });

    it('dry-run reports an invalid target id and missing required fields without a wire call', async () => {
      const res = await client.users.update(0, {} as never, { dryRun: true });

      expect(res.checks).toEqual([
        { name: 'target-id', ok: false },
        { name: 'required-fields', ok: false },
      ]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('users.updatePreferences (pinned rows)', () => {
    it('calls the users.updatePreferences endpoint and normalises the result', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const prefs = [{ name: 'theme', value: 'dark' }];
      const updated = await client.users.updatePreferences(1, prefs);

      expect(updated).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/users/1/preferences',
        body: prefs,
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const prefs = [{ name: 'theme', value: 'dark' }];
      const res = await client.users.updatePreferences(1, prefs, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('users.updatePreferences');
      expect(res.target).toEqual({ resource: 'users', ids: [1] });
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/users/1/preferences' });
      expect(res.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'preferences-payload', ok: true },
      ]);
      expect(res.data).toEqual(prefs);
      expect(transport.request).not.toHaveBeenCalled();

      const empty = await client.users.updatePreferences(1, [], { dryRun: true });
      expect(empty.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'preferences-payload', ok: false },
      ]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('users.deleteApiToken (pinned rows)', () => {
    it('calls the users.deleteApiToken endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.users.deleteApiToken(5);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/users/api-token/5',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.users.deleteApiToken(5, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('users.deleteApiToken');
      expect(res.target).toEqual({ resource: 'users', ids: [5] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/users/api-token/5' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(res.checks).toEqual([{ name: 'target-id', ok: true }]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('users.resolve (pinned rows)', () => {
    it('resolves a user by numeric id', async () => {
      const fixture = loadFixture('user_single');
      transport.request.mockResolvedValueOnce(fixture);

      const res = await client.users.resolve(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users/1',
      });
      expect(res).toMatchObject({ id: 1, username: 'admin' });

      // a bare numeric string is an id, never a username
      transport.request.mockResolvedValueOnce(fixture);
      await expect(client.users.resolve('1')).resolves.toMatchObject({ id: 1 });

      // the documented { id } object form takes the same direct path
      transport.request.mockResolvedValueOnce(fixture);
      const wrapped = await client.users.resolve({ id: 1 }, { resolutionDetails: true });
      expect(wrapped).toMatchObject({ value: { id: 1 }, resolutionCost: 'direct', scanned: 1, scanTruncated: false });
      expect(wrapped.candidates).toEqual([{ id: 1, label: expect.stringContaining('admin') }]);
    });

    it('resolves a user by exact username through the bounded scan', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      const res = await client.users.resolve({ username: 'dev' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users',
        query: undefined,
      });
      expect(res).toMatchObject({ id: 2, username: 'dev' });

      // a bare non-numeric string is a username
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);
      await expect(client.users.resolve('dev')).resolves.toMatchObject({ id: 2 });

      // expand: true returns the full record, credentials included
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);
      const full = await client.users.resolve('admin', { expand: true });
      expect(full).toMatchObject({ id: 1, apiToken: true });
    });

    it('returns null after a complete scan with no hit', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      await expect(client.users.resolve('nobody')).resolves.toBeNull();

      // the Resolution wrapper is honest about the complete scan
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);
      const res = await client.users.resolve({ username: 'nobody' }, { resolutionDetails: true });
      expect(res).toEqual({ value: null, resolutionCost: 'client-scan', scanned: 2, scanTruncated: false });
    });

    it('throws RESOLUTION_TRUNCATED when the scan cap is reached', async () => {
      const many = Array.from({ length: 501 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        email: `u${i + 1}@example.com`,
      }));
      transport.request.mockResolvedValueOnce(many);

      const err = await client.users.resolve('nobody').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_TRUNCATED');
      expect((err as ResolutionError).category).toBe('resolution');
      expect((err as ResolutionError).retryable).toBe(false);
      expect((err as ResolutionError).operation).toBe('users.resolve');
      expect((err as ResolutionError).suggestedAction).toBeTruthy();
    });

    it('throws RESOLUTION_AMBIGUOUS with the candidate ids when several usernames match exactly', async () => {
      const twin = { ...PHASE_F_USERS[0]!, id: 3 };
      transport.request.mockResolvedValueOnce([PHASE_F_USERS[0]!, twin]);

      const err = await client.users.resolve('admin').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([1, 3]);
      expect((err as ResolutionError).operation).toBe('users.resolve');
    });

    it('throws NOT_FOUND when the id does not exist', async () => {
      transport.request.mockRejectedValueOnce(createApiError({ status: 404, message: 'Not Found' }));

      await expect(client.users.resolve(404)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('throws KimaiConfigError for an identifier of no documented kind', async () => {
      await expect(client.users.resolve('   ')).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.users.resolve({} as never)).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.users.resolve({ nope: 1 } as never)).rejects.toBeInstanceOf(KimaiConfigError);
      const err = await client.users.resolve(null as never).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(KimaiConfigError);
      expect((err as KimaiConfigError).code).toBe('CONFIG_ERROR');
      expect((err as KimaiConfigError).category).toBe('validation');
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('users.search (pinned rows)', () => {
    it('returns compact UserSummary rows for the spec filters', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      const params = {
        role: 'ROLE_ADMIN',
        team: 2,
        visible: '1',
        term: 'adm',
        orderBy: 'username',
        order: 'ASC',
      };
      const rows = await client.users.search(params);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/users',
        query: { ...params },
      });
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject(PHASE_F_USER_SUMMARY);
    });

    it('drops credential fields from the compact rows', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);

      const rows = await client.users.search();

      expect(rows[0]).not.toHaveProperty('apiToken');
      expect(rows[1]).not.toHaveProperty('apiToken');

      // the full record keeps it, so the drop is the compact shape's doing
      transport.request.mockResolvedValueOnce(PHASE_F_USERS);
      const full = await client.users.search(undefined, { limit: 100, expand: true });
      expect(full[0]).toHaveProperty('apiToken', true);
    });

    it('bounds the returned rows by limit (default 25, max 100) and rejects garbage', async () => {
      const many = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, username: `user${i + 1}`, email: `u${i + 1}@e.com` }));
      transport.request.mockResolvedValueOnce(many);
      await expect(client.users.search()).resolves.toHaveLength(25);

      transport.request.mockResolvedValueOnce(many);
      await expect(client.users.search(undefined, { limit: 100 })).resolves.toHaveLength(40);

      await expect(client.users.search(undefined, { limit: 101 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.users.search(undefined, { limit: 2.5 })).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.users.search(undefined, { limit: 0 })).rejects.toBeInstanceOf(KimaiConfigError);
      expect(transport.request).toHaveBeenCalledTimes(2);
    });

    it('returns an empty row set when the transport answers with a non-array body', async () => {
      transport.request.mockResolvedValueOnce({});

      await expect(client.users.search()).resolves.toEqual([]);
    });
  });
});
