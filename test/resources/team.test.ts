// TeamClient tests
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';
import { KimaiConfigError, NotFoundError, ResolutionError, createApiError } from '../../src/errors';
import type { TeamEditForm } from '../../src/types';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
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

      await client.teams.create({ name: 'New Team', members: [] });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams',
        body: { name: 'New Team', members: [] },
      });
    });
  });

  describe('update', () => {
    it('should call PATCH /api/teams/{id}', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      await client.teams.update(1, { name: 'Updated', members: [] });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/teams/1',
        body: { name: 'Updated', members: [] },
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

// ---------------------------------------------------------------------------
// Phase F (agent execution layer, group: teams).
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: teams).
// ---------------------------------------------------------------------------

/** A team as `GET /api/teams` returns it (with the heavy sub-collections). */
const PHASE_F_TEAMS = [
  {
    id: 1,
    name: 'Engineering',
    members: [{ user: { id: 1, username: 'admin' }, teamlead: true }],
    customers: [{ id: 1, name: 'Acme Corp' }],
    projects: [{ id: 1, name: 'Website Redesign' }],
    activities: [{ id: 1, name: 'Development' }],
    color: '#3f51b5',
    'color-safe': 'light',
  },
  {
    id: 2,
    name: 'Operations',
    members: [{ user: { id: 2, username: 'dev' }, teamlead: false }],
    color: '#e91e63',
    'color-safe': 'dark',
  },
];

/** The compact projection the helpers return by default (no sub-collections). */
const PHASE_F_TEAM_SUMMARY = { id: 1, name: 'Engineering', color: '#3f51b5', 'color-safe': 'light' };

const PHASE_F_TEAM_FORM: TeamEditForm = {
  name: 'Engineering',
  members: [{ user: 1, teamlead: true }],
};

describe('TeamClient — Phase F agent execution layer', () => {
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

  describe('teams.list (pinned rows)', () => {
    it('returns the unwrapped teams list', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TEAMS);

      const rows = await client.teams.list();

      expect(rows).toEqual(PHASE_F_TEAMS);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams',
        query: undefined,
      });
    });

    it('does not send page/size params for this non-paginated endpoint', async () => {
      // Non-paginated endpoint: GET declares no page/size, so the whole
      // collection is one page and no page params may be sent.
      transport.request.mockResolvedValueOnce(PHASE_F_TEAMS);

      const rows = await client.teams.list();

      expect(rows).toEqual(PHASE_F_TEAMS);
      expect(transport.request).toHaveBeenCalledTimes(1);
      const call = transport.request.mock.calls[0]![0];
      expect(call.query).toBeUndefined();
    });
  });

  describe('teams.getById (pinned rows)', () => {
    it('returns the unwrapped teams record', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const team = await client.teams.getById(1);

      expect(team).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams/1',
      });
    });

    it('normalises a 404 into NOT_FOUND', async () => {
      transport.request.mockRejectedValueOnce(
        createApiError({ status: 404, message: 'Not Found', data: { title: 'Not Found' } }),
      );

      const err = await client.teams.getById(404).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).code).toBe('NOT_FOUND');
      expect((err as NotFoundError).category).toBe('not_found');
    });
  });

  describe('teams.create (pinned rows)', () => {
    it('returns the created teams record', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const created = await client.teams.create({ ...PHASE_F_TEAM_FORM });

      expect(created).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams',
        body: { ...PHASE_F_TEAM_FORM },
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.create({ ...PHASE_F_TEAM_FORM }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.wouldApply).toBe(true);
      expect(res.operation).toBe('teams.create');
      expect(res.target).toEqual({ resource: 'teams', ids: [] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/teams' });
      expect(res.checks).toEqual([{ name: 'required-fields', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(res.data).toEqual({ ...PHASE_F_TEAM_FORM });
      expect(transport.request).not.toHaveBeenCalled();

      // an empty member list is a warning, not a silent pass
      const empty = await client.teams.create({ name: 'Empty', members: [] }, { dryRun: true });
      expect(empty.warnings.join(' | ')).toContain('members is empty');
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.update (pinned rows)', () => {
    it('returns the updated teams record', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const updated = await client.teams.update(1, { ...PHASE_F_TEAM_FORM });

      expect(updated).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'PATCH',
        path: '/api/teams/1',
        body: { ...PHASE_F_TEAM_FORM },
      });
    });

    it('dry-run issues no PATCH request and returns simulated: true', async () => {
      const res = await client.teams.update(1, { ...PHASE_F_TEAM_FORM }, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.update');
      expect(res.target).toEqual({ resource: 'teams', ids: [1] });
      expect(res.request).toEqual({ method: 'PATCH', path: '/api/teams/1' });
      expect(res.checks).toEqual([
        { name: 'target-id', ok: true },
        { name: 'required-fields', ok: true },
      ]);
      expect(res.data).toEqual({ ...PHASE_F_TEAM_FORM });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.delete (pinned rows)', () => {
    it('resolves void after a successful delete', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.teams.delete(1);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1',
      });
    });

    it('dry-run issues no DELETE request and returns simulated: true', async () => {
      const res = await client.teams.delete(1, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.delete');
      expect(res.target).toEqual({ resource: 'teams', ids: [1] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/teams/1' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.addMember (pinned rows)', () => {
    it('calls the teams.addMember endpoint and normalises the result', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const team = await client.teams.addMember(1, 2);

      expect(team).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/members/2',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.addMember(1, 2, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.addMember');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 2] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/teams/1/members/2' });
      expect(res.checks).toEqual([{ name: 'target-id', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.removeMember (pinned rows)', () => {
    it('calls the teams.removeMember endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.teams.removeMember(1, 2);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/members/2',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.removeMember(1, 2, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.removeMember');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 2] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/teams/1/members/2' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(res.checks).toEqual([{ name: 'target-id', ok: true }]);
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.grantCustomerAccess (pinned rows)', () => {
    it('calls the teams.grantCustomerAccess endpoint and normalises the result', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const team = await client.teams.grantCustomerAccess(1, 3);

      expect(team).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/customers/3',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.grantCustomerAccess(1, 3, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.grantCustomerAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 3] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/teams/1/customers/3' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.revokeCustomerAccess (pinned rows)', () => {
    it('calls the teams.revokeCustomerAccess endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.teams.revokeCustomerAccess(1, 3);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/customers/3',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.revokeCustomerAccess(1, 3, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.revokeCustomerAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 3] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/teams/1/customers/3' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.grantProjectAccess (pinned rows)', () => {
    it('calls the teams.grantProjectAccess endpoint and normalises the result', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const team = await client.teams.grantProjectAccess(1, 4);

      expect(team).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/projects/4',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.grantProjectAccess(1, 4, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.grantProjectAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 4] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/teams/1/projects/4' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.revokeProjectAccess (pinned rows)', () => {
    it('calls the teams.revokeProjectAccess endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.teams.revokeProjectAccess(1, 4);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/projects/4',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.revokeProjectAccess(1, 4, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.revokeProjectAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 4] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/teams/1/projects/4' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.grantActivityAccess (pinned rows)', () => {
    it('calls the teams.grantActivityAccess endpoint and normalises the result', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const team = await client.teams.grantActivityAccess(1, 5);

      expect(team).toEqual(fixture);
      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/teams/1/activities/5',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.grantActivityAccess(1, 5, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.grantActivityAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 5] });
      expect(res.request).toEqual({ method: 'POST', path: '/api/teams/1/activities/5' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: true });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.revokeActivityAccess (pinned rows)', () => {
    it('calls the teams.revokeActivityAccess endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const result = await client.teams.revokeActivityAccess(1, 5);

      expect(result).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/teams/1/activities/5',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.teams.revokeActivityAccess(1, 5, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.operation).toBe('teams.revokeActivityAccess');
      expect(res.target).toEqual({ resource: 'teams', ids: [1, 5] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/teams/1/activities/5' });
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });

  describe('teams.resolve (pinned rows)', () => {
    it('resolves a team by numeric id', async () => {
      const fixture = loadFixture('team_single');
      transport.request.mockResolvedValueOnce(fixture);

      const res = await client.teams.resolve(1);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams/1',
      });
      expect(res).toEqual(PHASE_F_TEAM_SUMMARY);

      // a bare numeric string is an id, and { id } takes the same direct path
      transport.request.mockResolvedValueOnce(fixture);
      await expect(client.teams.resolve('1')).resolves.toEqual(PHASE_F_TEAM_SUMMARY);

      transport.request.mockResolvedValueOnce(fixture);
      const direct = await client.teams.resolve({ id: 1 }, { resolutionDetails: true });
      expect(direct).toMatchObject({ value: { id: 1 }, resolutionCost: 'direct', scanned: 1, scanTruncated: false });
    });

    it('resolves a team by exact name', async () => {
      transport.request.mockResolvedValueOnce(PHASE_F_TEAMS);

      const res = await client.teams.resolve({ name: 'Engineering' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/teams',
        query: { name: 'Engineering' },
      });
      expect(res).toEqual(PHASE_F_TEAM_SUMMARY);
      expect(res).not.toHaveProperty('members');

      // a bare non-numeric string is a name
      transport.request.mockResolvedValueOnce(PHASE_F_TEAMS);
      await expect(client.teams.resolve('Operations')).resolves.toMatchObject({ id: 2, name: 'Operations' });

      // expand returns the full record
      transport.request.mockResolvedValueOnce(PHASE_F_TEAMS);
      const full = await client.teams.resolve('Engineering', { expand: true });
      expect(full).toHaveProperty('members');
    });

    it('returns null after a complete match with no hit', async () => {
      transport.request.mockResolvedValueOnce([]);

      await expect(client.teams.resolve({ name: 'Nope' })).resolves.toBeNull();

      transport.request.mockResolvedValueOnce([]);
      const res = await client.teams.resolve({ name: 'Nope' }, { resolutionDetails: true });
      expect(res).toEqual({ value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false });
    });

    it('throws RESOLUTION_AMBIGUOUS with the candidate ids for several exact matches', async () => {
      const twin = { ...PHASE_F_TEAMS[0]!, id: 7 };
      transport.request.mockResolvedValueOnce([PHASE_F_TEAMS[0]!, twin]);

      const err = await client.teams.resolve('Engineering').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([1, 7]);
      expect((err as ResolutionError).operation).toBe('teams.resolve');
    });

    it('throws RESOLUTION_AMBIGUOUS when the inexact name filter matches none exactly', async () => {
      transport.request.mockResolvedValueOnce([{ id: 9, name: 'Engineering Support' }]);

      const err = await client.teams.resolve('Engineering').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ResolutionError);
      expect((err as ResolutionError).code).toBe('RESOLUTION_AMBIGUOUS');
      expect((err as ResolutionError).resourceIds).toEqual([9]);
    });

    it('throws NOT_FOUND for an id miss and KimaiConfigError for an identifier of no documented kind', async () => {
      transport.request.mockRejectedValueOnce(createApiError({ status: 404, message: 'Not Found' }));
      await expect(client.teams.resolve(404)).rejects.toMatchObject({ code: 'NOT_FOUND' });

      await expect(client.teams.resolve('  ')).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.teams.resolve({ nope: 1 } as never)).rejects.toBeInstanceOf(KimaiConfigError);
      await expect(client.teams.resolve(null as never)).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
    });
  });
});
