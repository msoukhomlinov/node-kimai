// ActivityClient - Activity resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - helpers co-located on the client (policy §5): `resolve`, `search`;
//  - `{ dryRun: true }` on every mutation (policy §7.2): the dry-run path
//    validates and echoes, issues NO wire call, and returns a DryRunResult
//    with `simulated: true`;
//  - structured resolution errors (policy §6): RESOLUTION_AMBIGUOUS carries
//    the candidate ids; an id miss keeps throwing NOT_FOUND (never `null`).
// The pre-existing primitives are untouched (additive only).

import type {
  Activity,
  ActivityEntity,
  ActivityEditForm,
  ActivityIdentifier,
  ActivityRate,
  ActivityRateForm,
  ActivitySearchParams,
  ActivitySummary,
  Team,
} from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError, ResolutionError } from '../errors';

import type { ApiClient } from '../client';
import { pathId } from '../guards';
import { streamOnce } from './paging';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
export const MAX_HELPER_LIMIT = 100;
/** The single-page scan cap of `activities.resolve` (the spec's max page size). */
const RESOLVE_SCAN_PAGE_SIZE = 500;

/** The identifier kinds `activities.resolve` documents (policy §6). */
const ACTIVITY_IDENTIFIER_KINDS =
  'activities.resolve accepts { id }, { name } or a bare numeric id / exact name';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/** Compact projection of a full activity record (policy §9). */
export function toActivitySummary(activity: Activity): ActivitySummary {
  return {
    id: activity.id,
    name: activity.name,
    project: activity.project,
    number: activity.number,
    visible: activity.visible,
    billable: activity.billable,
    color: activity.color,
  };
}

/** One-line label for an activity (ambiguity candidates, Resolution wrapper). */
function activityLabel(activity: Activity): string {
  const id = activity.id === undefined ? '?' : String(activity.id);
  return `activity ${id} (${activity.name})`;
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

/** True for a non-blank string (the vendor's required name fields). */
function nonBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Build a dry-run envelope (policy §7.2). The dry-run path issues NO wire
 * call: `impact` and any `diff` are best-effort and say so in `warnings`.
 */
function mutationDryRun<T>(
  operation: string,
  resource: string,
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
    target: { resource, ids },
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

export class ActivityClient {
  constructor(private client: ApiClient) {}

  /** Stream every Activity record from the single non-paginated batch. */
  list(params?: ActivitySearchParams): AsyncIterable<Activity> {
    return streamOnce(() => this.listAll(params));
  }

  /** Collect the single non-paginated batch of Activity records (MCP-preferred read). */
  async listAll(params?: ActivitySearchParams): Promise<Activity[]> {
    return this.client.get<Activity[]>('/api/activities', { query: params });
  }

  /** Get one Activity record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Activity> {
    return this.client.get<Activity>(`/api/activities/${pathId(id)}`);
  }

  async create(input: ActivityEditForm): Promise<ActivityEntity>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: ActivityEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ActivityEditForm>>;
  async create(input: ActivityEditForm, opts?: MutationOptions): Promise<ActivityEntity | DryRunResult<ActivityEditForm>>;
  /**
   * POST /api/activities. `{ dryRun: true }` validates and echoes without
   * issuing the write (policy §7.2). Classification: write, not idempotent
   * (each call creates a new record).
   */
  async create(input: ActivityEditForm, opts?: MutationOptions): Promise<ActivityEntity | DryRunResult<ActivityEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ActivityEditForm>(
        'activities.create',
        'activities',
        'POST',
        '/api/activities',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: nonBlank(input.name) }],
        [],
      );
    }
    return this.client.post<ActivityEntity>('/api/activities', { body: input });
  }

  async update(id: number, input: ActivityEditForm): Promise<Activity>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: ActivityEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ActivityEditForm>>;
  async update(id: number, input: ActivityEditForm, opts?: MutationOptions): Promise<Activity | DryRunResult<ActivityEditForm>>;
  /**
   * PATCH /api/activities/{id}. `{ dryRun: true }` validates and echoes
   * without issuing the write. Classification: write, idempotent. The vendor
   * offers no `updated_at`/`If-Match`, so there is no stale-object guard
   * (plan `staleCheck: "unavailable"`).
   */
  async update(id: number, input: ActivityEditForm, opts?: MutationOptions): Promise<Activity | DryRunResult<ActivityEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ActivityEditForm>(
        'activities.update',
        'activities',
        'PATCH',
        `/api/activities/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: nonBlank(input.name) },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Activity>(`/api/activities/${pathId(id)}`, { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/activities/{id}. `{ dryRun: true }` validates the target
   * without issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'activities.delete',
        'activities',
        'DELETE',
        `/api/activities/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted record'],
      );
    }
    return this.client.delete(`/api/activities/${pathId(id)}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Activity>;
  /** Dry-run: describe the meta update without issuing it (zero wire calls). */
  async updateMeta(id: number, meta: Record<string, unknown>, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<Record<string, unknown>>>;
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Activity | DryRunResult<Record<string, unknown>>>;
  /**
   * PATCH /api/activities/{id}/meta. `{ dryRun: true }` validates the target
   * and the meta map without issuing the write. Classification: write,
   * idempotent.
   */
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Activity | DryRunResult<Record<string, unknown>>> {
    if (opts?.dryRun === true) {
      const metaOk =
        meta !== null && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0;
      return mutationDryRun<Record<string, unknown>>(
        'activities.updateMeta',
        'activities',
        'PATCH',
        `/api/activities/${pathId(id)}/meta`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        meta,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'meta-fields', ok: metaOk },
        ],
        [],
      );
    }
    return this.client.patch<Activity>(`/api/activities/${pathId(id)}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<ActivityRate[]> {
    return this.client.get<ActivityRate[]>(`/api/activities/${pathId(id)}/rates`);
  }

  async createRate(id: number, input: ActivityRateForm): Promise<ActivityRate>;
  /** Dry-run: describe the rate create without issuing it (zero wire calls). */
  async createRate(id: number, input: ActivityRateForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ActivityRateForm>>;
  async createRate(id: number, input: ActivityRateForm, opts?: MutationOptions): Promise<ActivityRate | DryRunResult<ActivityRateForm>>;
  /**
   * POST /api/activities/{id}/rates. `{ dryRun: true }` validates the target
   * and the rate payload without issuing the write. Classification: write,
   * not idempotent (each call appends a rate).
   */
  async createRate(id: number, input: ActivityRateForm, opts?: MutationOptions): Promise<ActivityRate | DryRunResult<ActivityRateForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ActivityRateForm>(
        'activities.createRate',
        'activities',
        'POST',
        `/api/activities/${pathId(id)}/rates`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: typeof input.rate === 'number' && Number.isFinite(input.rate) },
        ],
        [],
      );
    }
    return this.client.post<ActivityRate>(`/api/activities/${pathId(id)}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void>;
  /** Dry-run: describe the rate delete without issuing it (zero wire calls). */
  async deleteRate(id: number, rateId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/activities/{id}/rates/{rateId}. `{ dryRun: true }` validates
   * both ids without issuing the delete. Classification: destructive, not
   * reversible.
   */
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'activities.deleteRate',
        'activities',
        'DELETE',
        `/api/activities/${pathId(id)}/rates/${pathId(rateId, 'rateId')}`,
        [id, rateId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'rate-id', ok: validId(rateId) },
        ],
        [],
      );
    }
    return this.client.delete(`/api/activities/${pathId(id)}/rates/${pathId(rateId, 'rateId')}`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>;
  /** Dry-run: describe the team add without issuing it (zero wire calls). */
  async addToTeam(id: number, input: { teams?: number[] }, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<{ teams?: number[] }>>;
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>>;
  /**
   * POST /api/activities/{id}/team. `{ dryRun: true }` validates the target
   * and the team ids without issuing the write. Classification: write,
   * idempotent (the posted membership set is the resulting set).
   */
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<{ teams?: number[] }>(
        'activities.addToTeam',
        'activities',
        'POST',
        `/api/activities/${pathId(id)}/team`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          {
            name: 'team-ids',
            ok: Array.isArray(input.teams) && input.teams.length > 0 && input.teams.every((teamId) => validId(teamId)),
          },
        ],
        [],
      );
    }
    return this.client.post<Team>(`/api/activities/${pathId(id)}/team`, { body: input });
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve an activity from an id or an exact name (policy §6).
   *
   * `{ id }` (or a bare number) is a direct fetch: a miss throws `NOT_FOUND`,
   * never `null`. `{ name }` (or a bare string) is one bounded server-filtered
   * read (`name=<value>&size=500`, single page — the spec's max page size):
   * the vendor's `name` filter may match partially, so every row is compared
   * exactly. Zero exact hits after a complete page returns `null`; one hit
   * returns the record; several exact hits throw `RESOLUTION_AMBIGUOUS` with
   * the candidate ids; a page that filled its cap without a hit throws
   * `RESOLUTION_TRUNCATED` (never a silent `null`).
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: ActivityIdentifier): Promise<ActivitySummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: ActivityIdentifier, opts: HelperOptions & { expand: true }): Promise<Activity | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: ActivityIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<ActivitySummary>>;
  async resolve(
    identifier: ActivityIdentifier,
    opts?: HelperOptions,
  ): Promise<ActivitySummary | Activity | null | Resolution<ActivitySummary>>;
  async resolve(
    identifier: ActivityIdentifier,
    opts?: HelperOptions,
  ): Promise<ActivitySummary | Activity | null | Resolution<ActivitySummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toActivitySummary) as
      | ActivitySummary
      | Activity
      | null
      | Resolution<ActivitySummary>;
  }

  /**
   * Search activities server-side (policy §9): one bounded request carrying
   * every filter the spec declares on `GET /api/activities` (`name`,
   * `visible`, `customer`) — never a page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. Compact by default; `expand: true` returns the full records.
   */
  async search(params?: ActivitySearchParams): Promise<ActivitySummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: ActivitySearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Activity[]>;
  async search(params?: ActivitySearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ActivitySummary[] | Activity[]>;
  async search(params?: ActivitySearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ActivitySummary[] | Activity[]> {
    const size = helperLimit(opts?.limit);
    const query: Record<string, string | number | boolean | null | string[] | number[] | undefined> = {
      ...(params ?? {}),
      size,
    };
    const items = await this.client.get<Activity[]>('/api/activities', { query });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toActivitySummary);
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is a direct fetch or one
  // bounded server-filtered read.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: ActivityIdentifier): Promise<Resolution<Activity>> {
    if (typeof identifier === 'number') return this.resolveById(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(ACTIVITY_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveById(Number(text));
      return this.resolveByName(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(ACTIVITY_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveById(identifier.id);
    if ('name' in identifier && typeof identifier.name === 'string') return this.resolveByName(identifier.name);
    throw new KimaiConfigError(ACTIVITY_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveById(id: number): Promise<Resolution<Activity>> {
    const activity = await this.get(id);
    const candidate: ResolutionCandidate = { id: activity.id ?? id, label: activityLabel(activity) };
    return {
      value: activity,
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
      candidates: [candidate],
    };
  }

  /**
   * One bounded server-filtered read (policy §6): `name=<value>&size=500`,
   * single page of the spec's max page size, then an exact compare — a
   * partial-match filter must not resolve a wrong record. Zero exact hits on
   * a complete page -> `null`; one -> the record; more -> RESOLUTION_AMBIGUOUS
   * with the candidate ids; a full page with no hit -> RESOLUTION_TRUNCATED.
   */
  private async resolveByName(name: string): Promise<Resolution<Activity>> {
    const items = await this.client.get<Activity[]>('/api/activities', {
      query: { name, size: RESOLVE_SCAN_PAGE_SIZE },
    });
    const page = Array.isArray(items) ? items : [];
    const matches = page.filter((activity) => activity.name === name);
    if (matches.length > 1) {
      const candidateIds = matches
        .map((activity) => activity.id)
        .filter((v): v is number => typeof v === 'number');
      throw ResolutionError.ambiguous(
        `activities.resolve: the name "${name}" matched ${matches.length} activities exactly, so it is not unique.`,
        { operation: 'activities.resolve', resourceIds: candidateIds },
      );
    }
    const only = matches[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: page.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: activityLabel(only) }],
      };
    }
    if (page.length >= RESOLVE_SCAN_PAGE_SIZE) {
      throw ResolutionError.truncated(
        `activities.resolve: the name filter "${name}" filled the ${RESOLVE_SCAN_PAGE_SIZE}-record page without an exact match, so the scan stopped at its cap.`,
        { operation: 'activities.resolve' },
      );
    }
    return { value: null, resolutionCost: 'server-filter', scanned: page.length, scanTruncated: false };
  }
}
