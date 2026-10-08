// ProjectClient - Project resource operations
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
  Comment,
  CommentForm,
  Customer,
  CustomerSummary,
  Project,
  ProjectContext,
  ProjectContextExpanded,
  ProjectEditForm,
  ProjectEntity,
  ProjectIdentifier,
  ProjectRate,
  ProjectRateForm,
  ProjectSearchParams,
  ProjectSummary,
  Team,
} from '../types';
import type {
  CommentSummary,
  DryRunResult,
  HelperOptions,
  MutationOptions,
  RateSummary,
  Resolution,
  ResolutionCandidate,
} from '../types/common';
import { KimaiConfigError, ResolutionError } from 'node-kimai/errors';

import type { ApiClient } from '../client';
import { pathId } from '../guards';
import { streamOnce } from './paging';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
export const MAX_HELPER_LIMIT = 100;
/** The single-page scan cap of `projects.resolve` (the spec's max page size). */
const RESOLVE_SCAN_PAGE_SIZE = 500;
/** Bounded parallelism of the `getContext` fan-out (policy §10: default 4). */
const CONTEXT_POOL_SIZE = 4;

/** The identifier kinds `projects.resolve` documents (policy §6). */
const PROJECT_IDENTIFIER_KINDS =
  'projects.resolve accepts { id }, { name } or a bare numeric id / exact name';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/**
 * Run `tasks` with at most `limit` in flight, preserving result order
 * (policy §10: a bounded-parallelism helper, never an unbounded
 * `Promise.all` across ids). The fan-out here is a FIXED, small task list.
 */
async function pooledAll<T>(tasks: Array<() => Promise<T>>, limit: number = CONTEXT_POOL_SIZE): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]!();
    }
  });
  await Promise.all(workers);
  return results;
}

/** Compact projection of a full project record (policy §9). */
export function toProjectSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    customer: project.customer,
    number: project.number,
    orderNumber: project.orderNumber,
    orderDate: project.orderDate,
    start: project.start,
    end: project.end,
    visible: project.visible,
    billable: project.billable,
    globalActivities: project.globalActivities,
    color: project.color,
  };
}

/** Compact projection of a project rate record (policy §9). */
export function toProjectRateSummary(rate: ProjectRate): RateSummary {
  return {
    id: rate.id,
    userId: rate.user === undefined || rate.user === null ? undefined : rate.user.id,
    rate: rate.rate,
    internalRate: rate.internalRate,
    isFixed: rate.isFixed,
  };
}

/** Compact projection of the customer a project belongs to (policy §9). */
export function toProjectCustomerSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    number: customer.number,
    company: customer.company,
    country: customer.country,
    currency: customer.currency,
    timezone: customer.timezone,
    visible: customer.visible,
    billable: customer.billable,
    color: customer.color,
  };
}

/** Compact projection of a comment record (policy §9). */
export function toProjectCommentSummary(comment: Comment): CommentSummary {
  return {
    id: comment.id,
    message: comment.message,
    pinned: comment.pinned,
    createdAt: comment.createdAt,
  };
}

/** One-line label for a project (ambiguity candidates, Resolution wrapper). */
function projectLabel(project: Project): string {
  const id = project.id === undefined ? '?' : String(project.id);
  return `project ${id} (${project.name})`;
}

/**
 * Apply the caller's requested shape to a resolution: compact by default,
 * `expand: true` for the full record, `resolutionDetails: true` for the
 * `Resolution<T>` wrapper (cost, scanned, scanTruncated, candidates).
 */
function projectResolutionShape<U, S>(
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

/** True for a non-blank string (the vendor's required text fields). */
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

export class ProjectClient {
  constructor(private client: ApiClient) {}

  /** Stream every Project record from the single non-paginated batch. */
  list(params?: ProjectSearchParams): AsyncIterable<Project> {
    return streamOnce(() => this.listAll(params));
  }

  /** Collect the single non-paginated batch of Project records (MCP-preferred read). */
  async listAll(params?: ProjectSearchParams): Promise<Project[]> {
    return this.client.get<Project[]>('/api/projects', { query: params });
  }

  /** Get one Project record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Project> {
    return this.client.get<Project>(`/api/projects/${pathId(id)}`);
  }

  async create(input: ProjectEditForm): Promise<ProjectEntity>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: ProjectEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ProjectEditForm>>;
  async create(input: ProjectEditForm, opts?: MutationOptions): Promise<ProjectEntity | DryRunResult<ProjectEditForm>>;
  /**
   * POST /api/projects. `{ dryRun: true }` validates and echoes without
   * issuing the write (policy §7.2). Classification: write, not idempotent
   * (each call creates a new record).
   */
  async create(input: ProjectEditForm, opts?: MutationOptions): Promise<ProjectEntity | DryRunResult<ProjectEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ProjectEditForm>(
        'projects.create',
        'projects',
        'POST',
        '/api/projects',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: nonBlank(input.name) && validId(input.customer) }],
        [],
      );
    }
    return this.client.post<ProjectEntity>('/api/projects', { body: input });
  }

  async update(id: number, input: ProjectEditForm): Promise<Project>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: ProjectEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ProjectEditForm>>;
  async update(id: number, input: ProjectEditForm, opts?: MutationOptions): Promise<Project | DryRunResult<ProjectEditForm>>;
  /**
   * PATCH /api/projects/{id}. `{ dryRun: true }` validates and echoes without
   * issuing the write. Classification: write, idempotent. The vendor offers no
   * `updated_at`/`If-Match`, so there is no stale-object guard (plan
   * `staleCheck: "unavailable"`).
   */
  async update(id: number, input: ProjectEditForm, opts?: MutationOptions): Promise<Project | DryRunResult<ProjectEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ProjectEditForm>(
        'projects.update',
        'projects',
        'PATCH',
        `/api/projects/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: nonBlank(input.name) && validId(input.customer) },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Project>(`/api/projects/${pathId(id)}`, { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/projects/{id}. `{ dryRun: true }` validates the target
   * without issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'projects.delete',
        'projects',
        'DELETE',
        `/api/projects/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted record'],
      );
    }
    return this.client.delete(`/api/projects/${pathId(id)}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Project>;
  /** Dry-run: describe the meta update without issuing it (zero wire calls). */
  async updateMeta(id: number, meta: Record<string, unknown>, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<Record<string, unknown>>>;
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Project | DryRunResult<Record<string, unknown>>>;
  /**
   * PATCH /api/projects/{id}/meta. `{ dryRun: true }` validates the target and
   * the meta map without issuing the write. Classification: write,
   * idempotent.
   */
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Project | DryRunResult<Record<string, unknown>>> {
    if (opts?.dryRun === true) {
      const metaOk =
        meta !== null && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0;
      return mutationDryRun<Record<string, unknown>>(
        'projects.updateMeta',
        'projects',
        'PATCH',
        `/api/projects/${pathId(id)}/meta`,
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
    return this.client.patch<Project>(`/api/projects/${pathId(id)}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<ProjectRate[]> {
    return this.client.get<ProjectRate[]>(`/api/projects/${pathId(id)}/rates`);
  }

  async createRate(id: number, input: ProjectRateForm): Promise<ProjectRate>;
  /** Dry-run: describe the rate create without issuing it (zero wire calls). */
  async createRate(id: number, input: ProjectRateForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ProjectRateForm>>;
  async createRate(id: number, input: ProjectRateForm, opts?: MutationOptions): Promise<ProjectRate | DryRunResult<ProjectRateForm>>;
  /**
   * POST /api/projects/{id}/rates. `{ dryRun: true }` validates the target and
   * the rate payload without issuing the write. Classification: write, not
   * idempotent (each call appends a rate).
   */
  async createRate(id: number, input: ProjectRateForm, opts?: MutationOptions): Promise<ProjectRate | DryRunResult<ProjectRateForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<ProjectRateForm>(
        'projects.createRate',
        'projects',
        'POST',
        `/api/projects/${pathId(id)}/rates`,
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
    return this.client.post<ProjectRate>(`/api/projects/${pathId(id)}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void>;
  /** Dry-run: describe the rate delete without issuing it (zero wire calls). */
  async deleteRate(id: number, rateId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/projects/{id}/rates/{rateId}. `{ dryRun: true }` validates
   * both ids without issuing the delete. Classification: destructive, not
   * reversible.
   */
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'projects.deleteRate',
        'projects',
        'DELETE',
        `/api/projects/${pathId(id)}/rates/${pathId(rateId, 'rateId')}`,
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
    return this.client.delete(`/api/projects/${pathId(id)}/rates/${pathId(rateId, 'rateId')}`);
  }

  async listComments(id: number): Promise<Comment[]> {
    return this.client.get<Comment[]>(`/api/projects/${pathId(id)}/comments`);
  }

  async createComment(id: number, input: CommentForm): Promise<Comment>;
  /** Dry-run: describe the comment create without issuing it (zero wire calls). */
  async createComment(id: number, input: CommentForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<CommentForm>>;
  async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment | DryRunResult<CommentForm>>;
  /**
   * POST /api/projects/{id}/comments. `{ dryRun: true }` validates the target
   * and the message without issuing the write. Classification: write, not
   * idempotent (each call appends a comment).
   */
  async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment | DryRunResult<CommentForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<CommentForm>(
        'projects.createComment',
        'projects',
        'POST',
        `/api/projects/${pathId(id)}/comments`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: nonBlank(input.message) },
        ],
        [],
      );
    }
    return this.client.post<Comment>(`/api/projects/${pathId(id)}/comments`, { body: input });
  }

  async deleteComment(id: number, commentId: number): Promise<void>;
  /** Dry-run: describe the comment delete without issuing it (zero wire calls). */
  async deleteComment(id: number, commentId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/projects/{id}/comments/{commentId}. `{ dryRun: true }`
   * validates both ids without issuing the delete. Classification:
   * destructive, not reversible.
   */
  async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'projects.deleteComment',
        'projects',
        'DELETE',
        `/api/projects/${pathId(id)}/comments/${pathId(commentId, 'commentId')}`,
        [id, commentId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'comment-id', ok: validId(commentId) },
        ],
        [],
      );
    }
    return this.client.delete(`/api/projects/${pathId(id)}/comments/${pathId(commentId, 'commentId')}`);
  }

  async pinComment(id: number, commentId: number): Promise<Comment>;
  /** Dry-run: describe the pin without issuing it (zero wire calls). */
  async pinComment(id: number, commentId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment | DryRunResult<void>>;
  /**
   * PATCH /api/projects/{id}/comments/{commentId}/pin. `{ dryRun: true }`
   * validates both ids without issuing the write. Classification: write,
   * idempotent (the pin state is its own inverse when called twice).
   */
  async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'projects.pinComment',
        'projects',
        'PATCH',
        `/api/projects/${pathId(id)}/comments/${pathId(commentId, 'commentId')}/pin`,
        [id, commentId],
        { affected: 1, scope: 'single', reversible: true },
        undefined,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'comment-id', ok: validId(commentId) },
        ],
        [],
      );
    }
    return this.client.patch<Comment>(`/api/projects/${pathId(id)}/comments/${pathId(commentId, 'commentId')}/pin`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>;
  /** Dry-run: describe the team add without issuing it (zero wire calls). */
  async addToTeam(id: number, input: { teams?: number[] }, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<{ teams?: number[] }>>;
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>>;
  /**
   * POST /api/projects/{id}/team. `{ dryRun: true }` validates the target and
   * the team ids without issuing the write. Classification: write, idempotent
   * (the posted membership set is the resulting set).
   */
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<{ teams?: number[] }>(
        'projects.addToTeam',
        'projects',
        'POST',
        `/api/projects/${pathId(id)}/team`,
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
    return this.client.post<Team>(`/api/projects/${pathId(id)}/team`, { body: input });
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a project from an id or an exact name (policy §6).
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
  async resolve(identifier: ProjectIdentifier): Promise<ProjectSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: ProjectIdentifier, opts: HelperOptions & { expand: true }): Promise<Project | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: ProjectIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<ProjectSummary>>;
  async resolve(
    identifier: ProjectIdentifier,
    opts?: HelperOptions,
  ): Promise<ProjectSummary | Project | null | Resolution<ProjectSummary>>;
  async resolve(
    identifier: ProjectIdentifier,
    opts?: HelperOptions,
  ): Promise<ProjectSummary | Project | null | Resolution<ProjectSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolutionShape(resolution, opts, toProjectSummary) as
      | ProjectSummary
      | Project
      | null
      | Resolution<ProjectSummary>;
  }

  /**
   * Search projects server-side (policy §9): one bounded request carrying
   * every filter the spec declares on `GET /api/projects` (`name`, `visible`,
   * `customer`, `activity`) — never a page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. Compact by default; `expand: true` returns the full records.
   */
  async search(params?: ProjectSearchParams): Promise<ProjectSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: ProjectSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Project[]>;
  async search(params?: ProjectSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ProjectSummary[] | Project[]>;
  async search(params?: ProjectSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<ProjectSummary[] | Project[]> {
    const size = helperLimit(opts?.limit);
    const query: Record<string, string | number | boolean | null | string[] | number[] | undefined> = {
      ...(params ?? {}),
      size,
    };
    const items = await this.client.get<Project[]>('/api/projects', { query });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toProjectSummary);
  }

  /**
   * The project plus the records an agent must reason about (policy §9
   * workflow helper): the project record, its customer (when the record
   * carries a customer reference), its rates, and the record's own
   * `metaFields` (no extra wire call for meta). The customer and rates reads
   * run concurrently through a small bounded pool (policy §10) — never an
   * unbounded `Promise.all` across ids.
   *
   * Compact by default (a `ProjectSummary`, a `CustomerSummary` and
   * `RateSummary` rows); `expand: true` returns the full child records.
   */
  async getContext(id: number): Promise<ProjectContext>;
  /** `expand: true` returns the full child records. */
  async getContext(id: number, opts: { expand: true }): Promise<ProjectContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<ProjectContext | ProjectContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<ProjectContext | ProjectContextExpanded> {
    const project = await this.get(id);
    const customerId = typeof project.customer === 'number' ? project.customer : null;
    const [customer, rates] = (await pooledAll<Customer | ProjectRate[] | null>([
      () => (customerId === null ? Promise.resolve(null) : this.client.customers.get(customerId)),
      () => this.getRates(id),
    ])) as [Customer | null, ProjectRate[]];
    const meta = project.metaFields ?? [];
    if (opts?.expand === true) {
      return { project, customer, rates, meta };
    }
    return {
      project: toProjectSummary(project),
      customer: customer === null ? null : toProjectCustomerSummary(customer),
      rates: rates.map(toProjectRateSummary),
      meta,
    };
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is a direct fetch or one
  // bounded server-filtered read.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: ProjectIdentifier): Promise<Resolution<Project>> {
    if (typeof identifier === 'number') return this.resolveById(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(PROJECT_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveById(Number(text));
      return this.resolveByName(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(PROJECT_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveById(identifier.id);
    if ('name' in identifier && typeof identifier.name === 'string') return this.resolveByName(identifier.name);
    throw new KimaiConfigError(PROJECT_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveById(id: number): Promise<Resolution<Project>> {
    const project = await this.get(id);
    const candidate: ResolutionCandidate = { id: project.id ?? id, label: projectLabel(project) };
    return {
      value: project,
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
  private async resolveByName(name: string): Promise<Resolution<Project>> {
    const items = await this.client.get<Project[]>('/api/projects', {
      query: { name, size: RESOLVE_SCAN_PAGE_SIZE },
    });
    const page = Array.isArray(items) ? items : [];
    const matches = page.filter((project) => project.name === name);
    if (matches.length > 1) {
      const candidateIds = matches
        .map((project) => project.id)
        .filter((v): v is number => typeof v === 'number');
      throw ResolutionError.ambiguous(
        `projects.resolve: the name "${name}" matched ${matches.length} projects exactly, so it is not unique.`,
        { operation: 'projects.resolve', resourceIds: candidateIds },
      );
    }
    const only = matches[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: page.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: projectLabel(only) }],
      };
    }
    if (page.length >= RESOLVE_SCAN_PAGE_SIZE) {
      throw ResolutionError.truncated(
        `projects.resolve: the name filter "${name}" filled the ${RESOLVE_SCAN_PAGE_SIZE}-record page without an exact match, so the scan stopped at its cap.`,
        { operation: 'projects.resolve' },
      );
    }
    return { value: null, resolutionCost: 'server-filter', scanned: page.length, scanTruncated: false };
  }
}
