// TimesheetClient - Timesheet resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - helpers co-located on the client (policy §5): `resolve`, `search`,
//    `getContext`;
//  - `{ dryRun: true }` on every mutation (policy §7.2): the dry-run path
//    validates and echoes, issues NO wire call, and returns a DryRunResult
//    with `simulated: true`;
//  - structured resolution errors (policy §6): RESOLUTION_AMBIGUOUS carries
//    the candidate ids; an id miss keeps throwing NOT_FOUND (never `null`).
// The pre-existing primitives are untouched (additive only).

import type {
  Activity,
  Project,
  TimesheetEntity as Timesheet,
  TimesheetContext,
  TimesheetContextExpanded,
  TimesheetEditForm,
  TimesheetIdentifier,
  TimesheetListParams,
  TimesheetSearchParams,
  TimesheetSummary,
  User,
} from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError, ResolutionError } from '../errors';

import type { ApiClient } from '../client';
import { collectPages, pageParams, streamItems, streamPages, type PageFetcher } from './paging';
import type { Page } from '../types/common';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
export const MAX_HELPER_LIMIT = 100;
/** The single-page scan cap of `timesheets.resolve` (the spec's max page size). */
const RESOLVE_SCAN_PAGE_SIZE = 500;

/** The identifier kinds `timesheets.resolve` documents (policy §6). */
const TIMESHEET_IDENTIFIER_KINDS =
  'timesheets.resolve accepts { id }, { begin } or a bare numeric id / begin timestamp; timesheets have no name field, so text that is not a timestamp resolves to nothing';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/** Compact projection of a full timesheet record (policy §9). */
export function toTimesheetSummary(ts: Timesheet): TimesheetSummary {
  return {
    id: ts.id,
    begin: ts.begin,
    end: ts.end,
    duration: ts.duration,
    break: ts.break,
    user: ts.user,
    project: ts.project,
    activity: ts.activity,
    description: ts.description,
    rate: ts.rate,
    exported: ts.exported,
    billable: ts.billable,
    tags: ts.tags,
  };
}

/** One-line label for a timesheet (ambiguity candidates, Resolution wrapper). */
function timesheetLabel(ts: Timesheet): string {
  const id = ts.id === undefined ? '?' : String(ts.id);
  const end = ts.end ?? 'active';
  return `timesheet ${id} (${ts.begin} - ${end}, activity ${ts.activity ?? '?'})`;
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
 * call: `impact` and any `diff` are best-effort and say so in `warnings`.
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
    target: { resource: 'timesheets', ids },
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

export class TimesheetClient {
  constructor(private client: ApiClient) {}

  /** Stream every Timesheet record across pages until a short/empty page. */
  list(params?: TimesheetListParams): AsyncIterable<Timesheet> {
    const plan = this.pagePlan(params);
    return streamItems(plan.fetch, plan.page, plan.size);
  }

  /** Collect every page of Timesheet records (MCP-preferred read). */
  async listAll(params?: TimesheetListParams): Promise<Timesheet[]> {
    const plan = this.pagePlan(params);
    return collectPages(plan.fetch, plan.page, plan.size);
  }

  /**
   * Page stream for `for await (const page of client.timesheets.listPages())`.
   * Public and non-async: the return type is `AsyncIterable<Page<Timesheet>>`. Kimai
   * returns bare arrays with no totals, so `hasMore` is derived honestly:
   * `hasMore = items.length === size`.
   */
  listPages(params?: TimesheetListParams): AsyncIterable<Page<Timesheet>> {
    const plan = this.pagePlan(params);
    return streamPages(plan.fetch, plan.page, plan.size);
  }

  /** Resolve the paging params (default page 1 / size 100) and the per-page fetcher. */
  private pagePlan(params?: TimesheetListParams): { fetch: PageFetcher<Timesheet>; page: number; size: number } {
    const query = { ...params };
    if (!query.user && !query.users) query.user = 'all';
    const { page, size } = pageParams(params);
    return {
      page,
      size,
      fetch: (p, s) => this.client.get<Timesheet[]>('/api/timesheets', { query: { ...query, page: p, size: s } }),
    };
  }

  /** Get one Timesheet record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Timesheet> {
    return this.client.get<Timesheet>(`/api/timesheets/${id}`);
  }

  async create(input: TimesheetEditForm): Promise<Timesheet>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: TimesheetEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<TimesheetEditForm>>;
  async create(input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet | DryRunResult<TimesheetEditForm>>;
  /**
   * POST /api/timesheets. `{ dryRun: true }` validates and echoes without
   * issuing the write (policy §7.2). Classification: write, not idempotent.
   */
  async create(input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet | DryRunResult<TimesheetEditForm>> {
    if (opts?.dryRun === true) {
      const checks = [
        { name: 'required-fields', ok: validId(input.project) && validId(input.activity) },
      ];
      const warnings: string[] = [];
      if (input.begin === undefined) {
        warnings.push('begin is missing: the vendor model requires it, so the live create would fail');
      }
      return mutationDryRun<TimesheetEditForm>(
        'timesheets.create',
        'POST',
        '/api/timesheets',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        checks,
        warnings,
      );
    }
    return this.client.post<Timesheet>('/api/timesheets', { body: input });
  }

  async update(id: number, input: TimesheetEditForm): Promise<Timesheet>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: TimesheetEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<TimesheetEditForm>>;
  async update(id: number, input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet | DryRunResult<TimesheetEditForm>>;
  /**
   * PATCH /api/timesheets/{id}. `{ dryRun: true }` validates and echoes
   * without issuing the write. Classification: write, idempotent. The vendor
   * offers no `updated_at`/`If-Match`, so there is no stale-object guard
   * (plan `staleCheck: "unavailable"`).
   */
  async update(id: number, input: TimesheetEditForm, opts?: MutationOptions): Promise<Timesheet | DryRunResult<TimesheetEditForm>> {
    if (opts?.dryRun === true) {
      const checks = [
        { name: 'target-id', ok: validId(id) },
        { name: 'required-fields', ok: validId(input.project) && validId(input.activity) },
      ];
      return mutationDryRun<TimesheetEditForm>(
        'timesheets.update',
        'PATCH',
        `/api/timesheets/${id}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        checks,
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Timesheet>(`/api/timesheets/${id}`, { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/timesheets/{id}. `{ dryRun: true }` validates the target
   * without issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'timesheets.delete',
        'DELETE',
        `/api/timesheets/${id}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted record'],
      );
    }
    return this.client.delete(`/api/timesheets/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Timesheet>;
  /** Dry-run: describe the meta update without issuing it (zero wire calls). */
  async updateMeta(id: number, meta: Record<string, unknown>, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<Record<string, unknown>>>;
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Timesheet | DryRunResult<Record<string, unknown>>>;
  /**
   * PATCH /api/timesheets/{id}/meta. `{ dryRun: true }` validates the target
   * and the meta map without issuing the write. Classification: write,
   * idempotent.
   */
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Timesheet | DryRunResult<Record<string, unknown>>> {
    if (opts?.dryRun === true) {
      const metaOk =
        meta !== null && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0;
      return mutationDryRun<Record<string, unknown>>(
        'timesheets.updateMeta',
        'PATCH',
        `/api/timesheets/${id}/meta`,
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
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/meta`, { body: meta });
  }

  async getActive(): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/active');
  }

  async getRecent(params?: { begin?: string, size?: number }): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/recent', { query: params });
  }

  async stop(id: number): Promise<Timesheet>;
  /** Dry-run: describe the stop without issuing it (zero wire calls). */
  async stop(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async stop(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>>;
  /**
   * PATCH /api/timesheets/{id}/stop — stops an active timesheet.
   * `{ dryRun: true }` validates the target without issuing the write.
   * Classification: write, idempotent.
   */
  async stop(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'timesheets.stop',
        'PATCH',
        `/api/timesheets/${id}/stop`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        [],
      );
    }
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/stop`);
  }

  async restart(id: number, input?: { copy?: string, begin?: string }): Promise<Timesheet>;
  /** Dry-run: describe the restart without issuing it (zero wire calls). */
  async restart(id: number, input: { copy?: string, begin?: string } | undefined, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<{ copy?: string, begin?: string }>>;
  async restart(id: number, input?: { copy?: string, begin?: string }, opts?: MutationOptions): Promise<Timesheet | DryRunResult<{ copy?: string, begin?: string }>>;
  /**
   * PATCH /api/timesheets/{id}/restart — restart a timesheet for the same
   * customer, project, activity. `{ dryRun: true }` validates the target
   * without issuing the write. Classification: write, not idempotent (the
   * vendor starts a new running record on every call).
   */
  async restart(id: number, input?: { copy?: string, begin?: string }, opts?: MutationOptions): Promise<Timesheet | DryRunResult<{ copy?: string, begin?: string }>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<{ copy?: string, begin?: string }>(
        'timesheets.restart',
        'PATCH',
        `/api/timesheets/${id}/restart`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        input,
        [{ name: 'target-id', ok: validId(id) }],
        [],
      );
    }
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/restart`, { body: input });
  }

  async duplicate(id: number): Promise<Timesheet>;
  /** Dry-run: describe the duplicate without issuing it (zero wire calls). */
  async duplicate(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async duplicate(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>>;
  /**
   * PATCH /api/timesheets/{id}/duplicate — duplicates a timesheet, resetting
   * the export state only. `{ dryRun: true }` validates the target without
   * issuing the write. Classification: write, not idempotent (each call
   * creates a new record).
   */
  async duplicate(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'timesheets.duplicate',
        'PATCH',
        `/api/timesheets/${id}/duplicate`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        [],
      );
    }
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/duplicate`);
  }

  async toggleExport(id: number): Promise<Timesheet>;
  /** Dry-run: describe the export toggle without issuing it (zero wire calls). */
  async toggleExport(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async toggleExport(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>>;
  /**
   * PATCH /api/timesheets/{id}/export — toggles the exported state and locks
   * the record while exported. `{ dryRun: true }` validates the target
   * without issuing the write. Classification: write, idempotent (the state
   * toggle is its own inverse when called twice on an unlocked record).
   */
  async toggleExport(id: number, opts?: MutationOptions): Promise<Timesheet | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'timesheets.toggleExport',
        'PATCH',
        `/api/timesheets/${id}/export`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        [],
      );
    }
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/export`);
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a timesheet from an id or a begin timestamp (policy §6).
   *
   * `{ id }` (or a bare number) is a direct fetch: a miss throws `NOT_FOUND`,
   * never `null`. `{ begin }` (or a bare non-numeric string) is one bounded
   * server-filtered read (`begin=<value>&user=all`, single page of 500 — the
   * spec's max page size): zero hits returns `null`, one hit returns the
   * record, more than one throws `RESOLUTION_AMBIGUOUS` with the candidate
   * ids. The `begin` filter is "at or after", so a stale timestamp matches
   * many records and fails with ambiguity — that is the documented
   * behaviour, not a silent best match.
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: TimesheetIdentifier): Promise<TimesheetSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: TimesheetIdentifier, opts: HelperOptions & { expand: true }): Promise<Timesheet | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: TimesheetIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<TimesheetSummary>>;
  async resolve(
    identifier: TimesheetIdentifier,
    opts?: HelperOptions,
  ): Promise<TimesheetSummary | Timesheet | null | Resolution<TimesheetSummary>>;
  async resolve(
    identifier: TimesheetIdentifier,
    opts?: HelperOptions,
  ): Promise<TimesheetSummary | Timesheet | null | Resolution<TimesheetSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toTimesheetSummary) as TimesheetSummary | Timesheet | null | Resolution<TimesheetSummary>;
  }

  /**
   * Search timesheets server-side (policy §9): one bounded request with
   * every filter the spec declares on `GET /api/timesheets` (`user`/
   * `users`/`customer`/`customers`/`project`/`projects`/`activity`/
   * `activities`/`tags[]`/`orderBy`/`order`/`begin`/`end`/`exported`/
   * `active`/`billable`/`full`/`modified_after`/`term`) — never a page
   * walk. Without a user filter the SDK passes `user=all` (the vendor's
   * `view_other_timesheet` permission is required for that).
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. Compact by default; `expand: true` returns the full records.
   */
  async search(params?: TimesheetSearchParams): Promise<TimesheetSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: TimesheetSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Timesheet[]>;
  async search(params?: TimesheetSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TimesheetSummary[] | Timesheet[]>;
  async search(params?: TimesheetSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TimesheetSummary[] | Timesheet[]> {
    const size = helperLimit(opts?.limit);
    const query: Record<string, string | number | boolean | null | string[] | number[] | undefined> = {
      ...(params ?? {}),
      size,
    };
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    const items = await this.client.get<Timesheet[]>('/api/timesheets', { query });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toTimesheetSummary);
  }

  /**
   * The timesheet plus its referenced records (policy §9 workflow helper):
   * user and activity always (when the record carries the reference),
   * project when present, customer when the project carries one. Fetched
   * with a small bounded pool — at most three requests in flight, then the
   * dependent customer read: no unbounded `Promise.all` across ids.
   *
   * Compact by default (the timesheet is a `TimesheetSummary`); `expand:
   * true` returns the full timesheet record.
   */
  async getContext(id: number): Promise<TimesheetContext>;
  /** `expand: true` returns the full timesheet record. */
  async getContext(id: number, opts: { expand: true }): Promise<TimesheetContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<TimesheetContext | TimesheetContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<TimesheetContext | TimesheetContextExpanded> {
    const ts = await this.get(id);
    const user = typeof ts.user === 'number' ? this.client.users.get(ts.user) : Promise.resolve(null);
    const activity = typeof ts.activity === 'number' ? this.client.activities.get(ts.activity) : Promise.resolve(null);
    const project = typeof ts.project === 'number' ? this.client.projects.get(ts.project) : Promise.resolve(null);
    const [userRec, activityRec, projectRec] = (await Promise.all([user, activity, project])) as [
      User | null,
      Activity | null,
      Project | null,
    ];
    const customer =
      projectRec !== null && typeof projectRec.customer === 'number'
        ? await this.client.customers.get(projectRec.customer)
        : null;
    const related = { user: userRec, activity: activityRec, project: projectRec, customer };
    return opts?.expand === true ? { timesheet: ts, ...related } : { timesheet: toTimesheetSummary(ts), ...related };
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is a direct fetch or one
  // bounded server-filtered read.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: TimesheetIdentifier): Promise<Resolution<Timesheet>> {
    if (typeof identifier === 'number') return this.resolveByIdentifier(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(TIMESHEET_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveByIdentifier(Number(text));
      return this.resolveByBegin(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(TIMESHEET_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveByIdentifier(identifier.id);
    if ('begin' in identifier && typeof identifier.begin === 'string') return this.resolveByBegin(identifier.begin);
    throw new KimaiConfigError(TIMESHEET_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveByIdentifier(id: number): Promise<Resolution<Timesheet>> {
    const ts = await this.get(id);
    const candidate: ResolutionCandidate = { id: ts.id ?? id, label: timesheetLabel(ts) };
    return {
      value: ts,
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
      candidates: [candidate],
    };
  }

  /**
   * One bounded server-filtered read (policy §6): `begin=<value>&user=all`,
   * single page of the spec's max page size. Zero hits -> `null`; one hit ->
   * the record; more than one -> RESOLUTION_AMBIGUOUS with the candidate ids.
   */
  private async resolveByBegin(begin: string): Promise<Resolution<Timesheet>> {
    const items = await this.client.get<Timesheet[]>('/api/timesheets', {
      query: { begin, user: 'all', size: RESOLVE_SCAN_PAGE_SIZE },
    });
    const matches = Array.isArray(items) ? items : [];
    if (matches.length > 1) {
      const candidateIds = matches
        .map((ts) => ts.id)
        .filter((v): v is number => typeof v === 'number');
      throw ResolutionError.ambiguous(
        `timesheets.resolve: the begin filter "${begin}" matched ${matches.length} timesheets, so it is not unique.`,
        { operation: 'timesheets.resolve', resourceIds: candidateIds },
      );
    }
    const only = matches[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: matches.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: timesheetLabel(only) }],
      };
    }
    return { value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false };
  }
}
