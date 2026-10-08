// TeamClient - Team resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - the `resolve` helper (policy §5) with a server-side `name` filter and an
//    exact compare afterwards;
//  - `{ dryRun: true }` on every mutation (policy §7.2): the dry-run path
//    validates and echoes, issues NO wire call, and returns a DryRunResult
//    with `simulated: true`;
//  - structured resolution errors (policy §6): RESOLUTION_AMBIGUOUS carries
//    the candidate ids; an id miss keeps NOT_FOUND (never `null`).
// The pre-existing primitives are untouched (additive only).

import type { Team, TeamEditForm, TeamListParams, TeamIdentifier, TeamSummary } from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError, ResolutionError } from 'node-kimai/errors';

import type { ApiClient } from '../client';
import { pathId } from '../guards';
import { streamOnce } from './paging';

/** The identifier kinds `teams.resolve` documents (policy §6). */
const TEAM_IDENTIFIER_KINDS =
  'teams.resolve accepts { id }, { name } or a bare numeric id / exact name';

/** Compact projection of a full team record (policy §9). */
export function toTeamSummary(team: Team): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    color: team.color,
    'color-safe': team['color-safe'],
  };
}

/** One-line label for a team (ambiguity candidates, Resolution wrapper). */
function teamLabel(team: Team): string {
  const id = team.id === undefined ? '?' : String(team.id);
  return `team ${id} (${team.name})`;
}

/**
 * Apply the caller's requested shape to a resolution: compact by default,
 * `expand: true` for the full record, `resolutionDetails: true` for the
 * `Resolution<T>` wrapper (cost, scanned, scanTruncated, candidates).
 */
function projectResolution<U, S>(
  resolution: Resolution<U>,
  opts: HelperOptions | undefined,
  summarize: (item: U) => S,
): unknown {
  if (opts?.resolutionDetails === true) {
    if (resolution.value === null) return { ...resolution, value: null } as Resolution<S>;
    const value = (opts.expand === true ? resolution.value : summarize(resolution.value)) as S;
    return { ...resolution, value } as Resolution<S>;
  }
  if (resolution.value === null) return null;
  return opts?.expand === true ? resolution.value : summarize(resolution.value);
}

/** True for a valid target id (positive integer). */
function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/**
 * Build a dry-run envelope (policy §7.2). The dry-run path issues NO wire
 * call: `impact` is best-effort and says so in `warnings`.
 */
function mutationDryRun<T>(
  operation: string,
  method: string,
  path: string,
  ids: number[],
  impact: { affected: number; scope: string; reversible: boolean },
  data: T | undefined,
  checks: Array<{ name: string; ok: boolean }>,
  warnings: string[],
): DryRunResult<T> {
  const result: DryRunResult<T> = {
    operation,
    wouldApply: true,
    target: { resource: 'teams', ids },
    request: { method, path },
    checks,
    impact,
    simulated: true,
    warnings: [
      'dry-run issues no wire call: referenced resources are not verified',
      'impact is a best-effort estimate, not a server guarantee',
      ...warnings,
    ],
  };
  if (data !== undefined) {
    result.data = data;
  }
  return result;
}

const DRY_RUN_WARNING_NO_DIFF = 'the current record is not fetched by dry-run (zero wire calls), so no diff is computed';

export class TeamClient {
  constructor(private client: ApiClient) {}

  /** Stream every Team record from the single non-paginated batch. */
  list(params?: TeamListParams): AsyncIterable<Team> {
    return streamOnce(() => this.listAll(params));
  }

  /** Collect the single non-paginated batch of Team records (MCP-preferred read). */
  async listAll(params?: TeamListParams): Promise<Team[]> {
    return this.client.get<Team[]>('/api/teams', { query: params });
  }

  /** Get one Team record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Team> {
    return this.client.get<Team>(`/api/teams/${pathId(id)}`);
  }

  async create(input: TeamEditForm): Promise<Team>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: TeamEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<TeamEditForm>>;
  async create(input: TeamEditForm, opts?: MutationOptions): Promise<Team | DryRunResult<TeamEditForm>>;
  /**
   * POST /api/teams. `{ dryRun: true }` validates and echoes without issuing
   * the write (policy §7.2). Classification: write, not idempotent.
   */
  async create(input: TeamEditForm, opts?: MutationOptions): Promise<Team | DryRunResult<TeamEditForm>> {
    if (opts?.dryRun === true) {
      const members = Array.isArray(input.members) ? input.members : [];
      const warnings: string[] = [];
      if (members.length === 0) {
        warnings.push('members is empty: the vendor model expects at least one member, so the live create may fail');
      }
      return mutationDryRun<TeamEditForm>(
        'teams.create',
        'POST',
        '/api/teams',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: Boolean(input.name) && Array.isArray(input.members) }],
        warnings,
      );
    }
    return this.client.post<Team>('/api/teams', { body: input });
  }

  async update(id: number, input: TeamEditForm): Promise<Team>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: TeamEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<TeamEditForm>>;
  async update(id: number, input: TeamEditForm, opts?: MutationOptions): Promise<Team | DryRunResult<TeamEditForm>>;
  /**
   * PATCH /api/teams/{id}. `{ dryRun: true }` validates and echoes without
   * issuing the write. Classification: write, idempotent. The vendor exposes
   * no version field for teams, so there is no stale-object guard.
   */
  async update(id: number, input: TeamEditForm, opts?: MutationOptions): Promise<Team | DryRunResult<TeamEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<TeamEditForm>(
        'teams.update',
        'PATCH',
        `/api/teams/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: Boolean(input.name) && Array.isArray(input.members) },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Team>(`/api/teams/${pathId(id)}`, { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/teams/{id}. `{ dryRun: true }` validates the target without
   * issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.delete',
        'DELETE',
        `/api/teams/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted team'],
      );
    }
    return this.client.delete(`/api/teams/${pathId(id)}`);
  }

  async addMember(teamId: number, userId: number): Promise<Team>;
  /** Dry-run: describe the membership grant without issuing it (zero wire calls). */
  async addMember(teamId: number, userId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async addMember(teamId: number, userId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>>;
  /**
   * POST /api/teams/{id}/members/{userId}. `{ dryRun: true }` validates both
   * ids without issuing the write. Classification: write, idempotent (adding an
   * existing member leaves the same membership).
   */
  async addMember(teamId: number, userId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.addMember',
        'POST',
        `/api/teams/${pathId(teamId, 'teamId')}/members/${pathId(userId, 'userId')}`,
        [teamId, userId],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(userId) }],
        [],
      );
    }
    return this.client.post<Team>(`/api/teams/${pathId(teamId, 'teamId')}/members/${pathId(userId, 'userId')}`);
  }

  async removeMember(teamId: number, userId: number): Promise<void>;
  /** Dry-run: describe the membership removal without issuing it (zero wire calls). */
  async removeMember(teamId: number, userId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async removeMember(teamId: number, userId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/teams/{id}/members/{userId}. `{ dryRun: true }` validates both
   * ids without issuing the delete. Classification: destructive, not
   * reversible (the membership is removed).
   */
  async removeMember(teamId: number, userId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.removeMember',
        'DELETE',
        `/api/teams/${pathId(teamId, 'teamId')}/members/${pathId(userId, 'userId')}`,
        [teamId, userId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(userId) }],
        [],
      );
    }
    return this.client.delete(`/api/teams/${pathId(teamId, 'teamId')}/members/${pathId(userId, 'userId')}`);
  }

  async grantCustomerAccess(teamId: number, customerId: number): Promise<Team>;
  /** Dry-run: describe the customer access grant without issuing it (zero wire calls). */
  async grantCustomerAccess(teamId: number, customerId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async grantCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>>;
  /**
   * POST /api/teams/{id}/customers/{customerId}. `{ dryRun: true }` validates
   * both ids without issuing the write. Classification: write, idempotent.
   */
  async grantCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.grantCustomerAccess',
        'POST',
        `/api/teams/${pathId(teamId, 'teamId')}/customers/${pathId(customerId, 'customerId')}`,
        [teamId, customerId],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(customerId) }],
        [],
      );
    }
    return this.client.post<Team>(`/api/teams/${pathId(teamId, 'teamId')}/customers/${pathId(customerId, 'customerId')}`);
  }

  async revokeCustomerAccess(teamId: number, customerId: number): Promise<void>;
  /** Dry-run: describe the customer access revoke without issuing it (zero wire calls). */
  async revokeCustomerAccess(teamId: number, customerId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async revokeCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/teams/{id}/customers/{customerId}. `{ dryRun: true }` validates
   * both ids without issuing the delete. Classification: destructive, not
   * reversible.
   */
  async revokeCustomerAccess(teamId: number, customerId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.revokeCustomerAccess',
        'DELETE',
        `/api/teams/${pathId(teamId, 'teamId')}/customers/${pathId(customerId, 'customerId')}`,
        [teamId, customerId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(customerId) }],
        [],
      );
    }
    return this.client.delete(`/api/teams/${pathId(teamId, 'teamId')}/customers/${pathId(customerId, 'customerId')}`);
  }

  async grantProjectAccess(teamId: number, projectId: number): Promise<Team>;
  /** Dry-run: describe the project access grant without issuing it (zero wire calls). */
  async grantProjectAccess(teamId: number, projectId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async grantProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>>;
  /**
   * POST /api/teams/{id}/projects/{projectId}. `{ dryRun: true }` validates
   * both ids without issuing the write. Classification: write, idempotent.
   */
  async grantProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.grantProjectAccess',
        'POST',
        `/api/teams/${pathId(teamId, 'teamId')}/projects/${pathId(projectId, 'projectId')}`,
        [teamId, projectId],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(projectId) }],
        [],
      );
    }
    return this.client.post<Team>(`/api/teams/${pathId(teamId, 'teamId')}/projects/${pathId(projectId, 'projectId')}`);
  }

  async revokeProjectAccess(teamId: number, projectId: number): Promise<void>;
  /** Dry-run: describe the project access revoke without issuing it (zero wire calls). */
  async revokeProjectAccess(teamId: number, projectId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async revokeProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/teams/{id}/projects/{projectId}. `{ dryRun: true }` validates
   * both ids without issuing the delete. Classification: destructive, not
   * reversible.
   */
  async revokeProjectAccess(teamId: number, projectId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.revokeProjectAccess',
        'DELETE',
        `/api/teams/${pathId(teamId, 'teamId')}/projects/${pathId(projectId, 'projectId')}`,
        [teamId, projectId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(projectId) }],
        [],
      );
    }
    return this.client.delete(`/api/teams/${pathId(teamId, 'teamId')}/projects/${pathId(projectId, 'projectId')}`);
  }

  async grantActivityAccess(teamId: number, activityId: number): Promise<Team>;
  /** Dry-run: describe the activity access grant without issuing it (zero wire calls). */
  async grantActivityAccess(teamId: number, activityId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async grantActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>>;
  /**
   * POST /api/teams/{id}/activities/{activityId}. `{ dryRun: true }` validates
   * both ids without issuing the write. Classification: write, idempotent.
   */
  async grantActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<Team | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.grantActivityAccess',
        'POST',
        `/api/teams/${pathId(teamId, 'teamId')}/activities/${pathId(activityId, 'activityId')}`,
        [teamId, activityId],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(activityId) }],
        [],
      );
    }
    return this.client.post<Team>(`/api/teams/${pathId(teamId, 'teamId')}/activities/${pathId(activityId, 'activityId')}`);
  }

  async revokeActivityAccess(teamId: number, activityId: number): Promise<void>;
  /** Dry-run: describe the activity access revoke without issuing it (zero wire calls). */
  async revokeActivityAccess(teamId: number, activityId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async revokeActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/teams/{id}/activities/{activityId}. `{ dryRun: true }`
   * validates both ids without issuing the delete. Classification:
   * destructive, not reversible.
   */
  async revokeActivityAccess(teamId: number, activityId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'teams.revokeActivityAccess',
        'DELETE',
        `/api/teams/${pathId(teamId, 'teamId')}/activities/${pathId(activityId, 'activityId')}`,
        [teamId, activityId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(teamId) && validId(activityId) }],
        [],
      );
    }
    return this.client.delete(`/api/teams/${pathId(teamId, 'teamId')}/activities/${pathId(activityId, 'activityId')}`);
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helper (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a team from an id or a name (policy §6).
   *
   * `{ id }` (or a bare number) is a direct fetch: a miss throws `NOT_FOUND`,
   * never `null`. `{ name }` (or a bare non-numeric string) is ONE bounded
   * server-filtered read (`name=<value>`, the vendor filter) with an exact
   * compare afterwards: several exact matches throw `RESOLUTION_AMBIGUOUS`
   * with the candidate ids, a filtered set that matches none exactly throws
   * RESOLUTION_AMBIGUOUS (the filter is inexact, so "no exact hit" is not a
   * proof of absence), and an empty filtered set returns `null`.
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: TeamIdentifier): Promise<TeamSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: TeamIdentifier, opts: HelperOptions & { expand: true }): Promise<Team | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: TeamIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<TeamSummary>>;
  async resolve(
    identifier: TeamIdentifier,
    opts?: HelperOptions,
  ): Promise<TeamSummary | Team | null | Resolution<TeamSummary>>;
  async resolve(
    identifier: TeamIdentifier,
    opts?: HelperOptions,
  ): Promise<TeamSummary | Team | null | Resolution<TeamSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toTeamSummary) as TeamSummary | Team | null | Resolution<TeamSummary>;
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): a direct fetch or one bounded
  // server-filtered read.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: TeamIdentifier): Promise<Resolution<Team>> {
    if (typeof identifier === 'number') return this.resolveByIdentifier(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(TEAM_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveByIdentifier(Number(text));
      return this.resolveByName(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(TEAM_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveByIdentifier(identifier.id);
    if ('name' in identifier && typeof identifier.name === 'string') return this.resolveByName(identifier.name);
    throw new KimaiConfigError(TEAM_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveByIdentifier(id: number): Promise<Resolution<Team>> {
    const team = await this.get(id);
    const candidate: ResolutionCandidate = { id: team.id ?? id, label: teamLabel(team) };
    return {
      value: team,
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
      candidates: [candidate],
    };
  }

  /**
   * One bounded server-filtered read (policy §6): `name=<value>`, compared
   * exactly afterwards. Several exact matches throw RESOLUTION_AMBIGUOUS; a
   * filtered set that matches none exactly is ambiguous too (an inexact filter
   * cannot prove absence); an empty filtered set is a complete scan with no hit
   * and returns `null`.
   */
  private async resolveByName(name: string): Promise<Resolution<Team>> {
    const target = name.trim();
    if (target.length === 0) throw new KimaiConfigError(TEAM_IDENTIFIER_KINDS);
    const items = await this.client.get<Team[]>('/api/teams', { query: { name: target } });
    const rows = Array.isArray(items) ? items : [];
    const exact = rows.filter((team) => typeof team.name === 'string' && team.name.trim() === target);
    const candidateIds = (list: Team[]): number[] =>
      list.map((team) => team.id).filter((v): v is number => typeof v === 'number');
    if (exact.length > 1) {
      throw ResolutionError.ambiguous(
        `teams.resolve: ${exact.length} teams are named "${target}", so it is not unique.`,
        { operation: 'teams.resolve', resourceIds: candidateIds(exact) },
      );
    }
    const only = exact[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: rows.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: teamLabel(only) }],
      };
    }
    if (rows.length > 0) {
      throw ResolutionError.ambiguous(
        `teams.resolve: the name filter "${target}" matched ${rows.length} teams, none of them exactly.`,
        { operation: 'teams.resolve', resourceIds: candidateIds(rows) },
      );
    }
    return { value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false };
  }
}
