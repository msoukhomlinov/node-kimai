// CustomerClient - Customer resource operations
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
  CustomerContext,
  CustomerContextExpanded,
  CustomerEditForm,
  CustomerEntity,
  CustomerIdentifier,
  CustomerRate,
  CustomerRateForm,
  CustomerSearchParams,
  CustomerSummary,
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
import { KimaiConfigError, ResolutionError } from '../errors';

import type { ApiClient } from '../client';
import { streamOnce } from './paging';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
export const MAX_HELPER_LIMIT = 100;
/** The single-page scan cap of `customers.resolve` (the spec's max page size). */
const RESOLVE_SCAN_PAGE_SIZE = 500;
/** Bounded parallelism of the `getContext` fan-out (policy §10: default 4). */
const CONTEXT_POOL_SIZE = 4;

/** The identifier kinds `customers.resolve` documents (policy §6). */
const CUSTOMER_IDENTIFIER_KINDS =
  'customers.resolve accepts { id }, { name } or a bare numeric id / exact name';

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

/** Compact projection of a full customer record (policy §9). */
export function toCustomerSummary(customer: Customer): CustomerSummary {
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

/** Compact projection of a customer rate record (policy §9). */
export function toCustomerRateSummary(rate: CustomerRate): RateSummary {
  return {
    id: rate.id,
    userId: rate.user === undefined || rate.user === null ? undefined : rate.user.id,
    rate: rate.rate,
    internalRate: rate.internalRate,
    isFixed: rate.isFixed,
  };
}

/** Compact projection of a comment record (policy §9). */
export function toCommentSummary(comment: Comment): CommentSummary {
  return {
    id: comment.id,
    message: comment.message,
    pinned: comment.pinned,
    createdAt: comment.createdAt,
  };
}

/** One-line label for a customer (ambiguity candidates, Resolution wrapper). */
function customerLabel(customer: Customer): string {
  const id = customer.id === undefined ? '?' : String(customer.id);
  return `customer ${id} (${customer.name})`;
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

export class CustomerClient {
  constructor(private client: ApiClient) {}

  /** Stream every Customer record from the single non-paginated batch. */
  list(params?: CustomerSearchParams): AsyncIterable<Customer> {
    return streamOnce(() => this.listAll(params));
  }

  /** Collect the single non-paginated batch of Customer records (MCP-preferred read). */
  async listAll(params?: CustomerSearchParams): Promise<Customer[]> {
    return this.client.get<Customer[]>('/api/customers', { query: params });
  }

  /** Get one Customer record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Customer> {
    return this.client.get<Customer>(`/api/customers/${id}`);
  }

  async create(input: CustomerEditForm): Promise<CustomerEntity>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: CustomerEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<CustomerEditForm>>;
  async create(input: CustomerEditForm, opts?: MutationOptions): Promise<CustomerEntity | DryRunResult<CustomerEditForm>>;
  /**
   * POST /api/customers. `{ dryRun: true }` validates and echoes without
   * issuing the write (policy §7.2). Classification: write, not idempotent
   * (each call creates a new record).
   */
  async create(input: CustomerEditForm, opts?: MutationOptions): Promise<CustomerEntity | DryRunResult<CustomerEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<CustomerEditForm>(
        'customers.create',
        'customers',
        'POST',
        '/api/customers',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: nonBlank(input.name) && nonBlank(input.country) }],
        [],
      );
    }
    return this.client.post<CustomerEntity>('/api/customers', { body: input });
  }

  async update(id: number, input: CustomerEditForm): Promise<Customer>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: CustomerEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<CustomerEditForm>>;
  async update(id: number, input: CustomerEditForm, opts?: MutationOptions): Promise<Customer | DryRunResult<CustomerEditForm>>;
  /**
   * PATCH /api/customers/{id}. `{ dryRun: true }` validates and echoes without
   * issuing the write. Classification: write, idempotent. The vendor offers no
   * `updated_at`/`If-Match`, so there is no stale-object guard (plan
   * `staleCheck: "unavailable"`).
   */
  async update(id: number, input: CustomerEditForm, opts?: MutationOptions): Promise<Customer | DryRunResult<CustomerEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<CustomerEditForm>(
        'customers.update',
        'customers',
        'PATCH',
        `/api/customers/${id}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: nonBlank(input.name) && nonBlank(input.country) },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Customer>(`/api/customers/${id}`, { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/customers/{id}. `{ dryRun: true }` validates the target
   * without issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'customers.delete',
        'customers',
        'DELETE',
        `/api/customers/${id}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted record'],
      );
    }
    return this.client.delete(`/api/customers/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Customer>;
  /** Dry-run: describe the meta update without issuing it (zero wire calls). */
  async updateMeta(id: number, meta: Record<string, unknown>, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<Record<string, unknown>>>;
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Customer | DryRunResult<Record<string, unknown>>>;
  /**
   * PATCH /api/customers/{id}/meta. `{ dryRun: true }` validates the target
   * and the meta map without issuing the write. Classification: write,
   * idempotent.
   */
  async updateMeta(id: number, meta: Record<string, unknown>, opts?: MutationOptions): Promise<Customer | DryRunResult<Record<string, unknown>>> {
    if (opts?.dryRun === true) {
      const metaOk =
        meta !== null && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0;
      return mutationDryRun<Record<string, unknown>>(
        'customers.updateMeta',
        'customers',
        'PATCH',
        `/api/customers/${id}/meta`,
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
    return this.client.patch<Customer>(`/api/customers/${id}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<CustomerRate[]> {
    return this.client.get<CustomerRate[]>(`/api/customers/${id}/rates`);
  }

  async createRate(id: number, input: CustomerRateForm): Promise<CustomerRate>;
  /** Dry-run: describe the rate create without issuing it (zero wire calls). */
  async createRate(id: number, input: CustomerRateForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<CustomerRateForm>>;
  async createRate(id: number, input: CustomerRateForm, opts?: MutationOptions): Promise<CustomerRate | DryRunResult<CustomerRateForm>>;
  /**
   * POST /api/customers/{id}/rates. `{ dryRun: true }` validates the target
   * and the rate payload without issuing the write. Classification: write,
   * not idempotent (each call appends a rate).
   */
  async createRate(id: number, input: CustomerRateForm, opts?: MutationOptions): Promise<CustomerRate | DryRunResult<CustomerRateForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<CustomerRateForm>(
        'customers.createRate',
        'customers',
        'POST',
        `/api/customers/${id}/rates`,
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
    return this.client.post<CustomerRate>(`/api/customers/${id}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void>;
  /** Dry-run: describe the rate delete without issuing it (zero wire calls). */
  async deleteRate(id: number, rateId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/customers/{id}/rates/{rateId}. `{ dryRun: true }` validates
   * both ids without issuing the delete. Classification: destructive, not
   * reversible.
   */
  async deleteRate(id: number, rateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'customers.deleteRate',
        'customers',
        'DELETE',
        `/api/customers/${id}/rates/${rateId}`,
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
    return this.client.delete(`/api/customers/${id}/rates/${rateId}`);
  }

  async listComments(id: number): Promise<Comment[]> {
    return this.client.get<Comment[]>(`/api/customers/${id}/comments`);
  }

  async createComment(id: number, input: CommentForm): Promise<Comment>;
  /** Dry-run: describe the comment create without issuing it (zero wire calls). */
  async createComment(id: number, input: CommentForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<CommentForm>>;
  async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment | DryRunResult<CommentForm>>;
  /**
   * POST /api/customers/{id}/comments. `{ dryRun: true }` validates the target
   * and the message without issuing the write. Classification: write, not
   * idempotent (each call appends a comment).
   */
  async createComment(id: number, input: CommentForm, opts?: MutationOptions): Promise<Comment | DryRunResult<CommentForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<CommentForm>(
        'customers.createComment',
        'customers',
        'POST',
        `/api/customers/${id}/comments`,
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
    return this.client.post<Comment>(`/api/customers/${id}/comments`, { body: input });
  }

  async deleteComment(id: number, commentId: number): Promise<void>;
  /** Dry-run: describe the comment delete without issuing it (zero wire calls). */
  async deleteComment(id: number, commentId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/customers/{id}/comments/{commentId}. `{ dryRun: true }`
   * validates both ids without issuing the delete. Classification:
   * destructive, not reversible.
   */
  async deleteComment(id: number, commentId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'customers.deleteComment',
        'customers',
        'DELETE',
        `/api/customers/${id}/comments/${commentId}`,
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
    return this.client.delete(`/api/customers/${id}/comments/${commentId}`);
  }

  async pinComment(id: number, commentId: number): Promise<Comment>;
  /** Dry-run: describe the pin without issuing it (zero wire calls). */
  async pinComment(id: number, commentId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment | DryRunResult<void>>;
  /**
   * PATCH /api/customers/{id}/comments/{commentId}/pin. `{ dryRun: true }`
   * validates both ids without issuing the write. Classification: write,
   * idempotent (the pin state is its own inverse when called twice).
   */
  async pinComment(id: number, commentId: number, opts?: MutationOptions): Promise<Comment | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'customers.pinComment',
        'customers',
        'PATCH',
        `/api/customers/${id}/comments/${commentId}/pin`,
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
    return this.client.patch<Comment>(`/api/customers/${id}/comments/${commentId}/pin`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team>;
  /** Dry-run: describe the team add without issuing it (zero wire calls). */
  async addToTeam(id: number, input: { teams?: number[] }, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<{ teams?: number[] }>>;
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>>;
  /**
   * POST /api/customers/{id}/team. `{ dryRun: true }` validates the target and
   * the team ids without issuing the write. Classification: write, idempotent
   * (the posted membership set is the resulting set).
   */
  async addToTeam(id: number, input: { teams?: number[] }, opts?: MutationOptions): Promise<Team | DryRunResult<{ teams?: number[] }>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<{ teams?: number[] }>(
        'customers.addToTeam',
        'customers',
        'POST',
        `/api/customers/${id}/team`,
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
    return this.client.post<Team>(`/api/customers/${id}/team`, { body: input });
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a customer from an id or an exact name (policy §6).
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
  async resolve(identifier: CustomerIdentifier): Promise<CustomerSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: CustomerIdentifier, opts: HelperOptions & { expand: true }): Promise<Customer | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: CustomerIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<CustomerSummary>>;
  async resolve(
    identifier: CustomerIdentifier,
    opts?: HelperOptions,
  ): Promise<CustomerSummary | Customer | null | Resolution<CustomerSummary>>;
  async resolve(
    identifier: CustomerIdentifier,
    opts?: HelperOptions,
  ): Promise<CustomerSummary | Customer | null | Resolution<CustomerSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toCustomerSummary) as
      | CustomerSummary
      | Customer
      | null
      | Resolution<CustomerSummary>;
  }

  /**
   * Search customers server-side (policy §9): one bounded request carrying
   * every filter the spec declares on `GET /api/customers` (`name`, `visible`,
   * `customer`) — never a page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. Compact by default; `expand: true` returns the full records.
   */
  async search(params?: CustomerSearchParams): Promise<CustomerSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: CustomerSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Customer[]>;
  async search(params?: CustomerSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<CustomerSummary[] | Customer[]>;
  async search(params?: CustomerSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<CustomerSummary[] | Customer[]> {
    const size = helperLimit(opts?.limit);
    const query: Record<string, string | number | boolean | null | string[] | number[] | undefined> = {
      ...(params ?? {}),
      size,
    };
    const items = await this.client.get<Customer[]>('/api/customers', { query });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toCustomerSummary);
  }

  /**
   * The customer plus the records an agent must reason about (policy §9
   * workflow helper): the customer record, its rates and its comments, plus
   * the record's own `metaFields` (no extra wire call for meta). The three
   * reads run concurrently through a small bounded pool (policy §10) — never
   * an unbounded `Promise.all` across ids.
   *
   * Compact by default (a `CustomerSummary`, `RateSummary` and
   * `CommentSummary` rows); `expand: true` returns the full child records.
   */
  async getContext(id: number): Promise<CustomerContext>;
  /** `expand: true` returns the full child records. */
  async getContext(id: number, opts: { expand: true }): Promise<CustomerContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<CustomerContext | CustomerContextExpanded>;
  async getContext(id: number, opts?: { expand?: boolean }): Promise<CustomerContext | CustomerContextExpanded> {
    const [customer, rates, comments] = (await pooledAll<Customer | CustomerRate[] | Comment[]>([
      () => this.get(id),
      () => this.getRates(id),
      () => this.listComments(id),
    ])) as [Customer, CustomerRate[], Comment[]];
    const meta = customer.metaFields ?? [];
    if (opts?.expand === true) {
      return { customer, rates, comments, meta };
    }
    return {
      customer: toCustomerSummary(customer),
      rates: rates.map(toCustomerRateSummary),
      comments: comments.map(toCommentSummary),
      meta,
    };
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is a direct fetch or one
  // bounded server-filtered read.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: CustomerIdentifier): Promise<Resolution<Customer>> {
    if (typeof identifier === 'number') return this.resolveById(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(CUSTOMER_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveById(Number(text));
      return this.resolveByName(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(CUSTOMER_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveById(identifier.id);
    if ('name' in identifier && typeof identifier.name === 'string') return this.resolveByName(identifier.name);
    throw new KimaiConfigError(CUSTOMER_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveById(id: number): Promise<Resolution<Customer>> {
    const customer = await this.get(id);
    const candidate: ResolutionCandidate = { id: customer.id ?? id, label: customerLabel(customer) };
    return {
      value: customer,
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
  private async resolveByName(name: string): Promise<Resolution<Customer>> {
    const items = await this.client.get<Customer[]>('/api/customers', {
      query: { name, size: RESOLVE_SCAN_PAGE_SIZE },
    });
    const page = Array.isArray(items) ? items : [];
    const matches = page.filter((customer) => customer.name === name);
    if (matches.length > 1) {
      const candidateIds = matches
        .map((customer) => customer.id)
        .filter((v): v is number => typeof v === 'number');
      throw ResolutionError.ambiguous(
        `customers.resolve: the name "${name}" matched ${matches.length} customers exactly, so it is not unique.`,
        { operation: 'customers.resolve', resourceIds: candidateIds },
      );
    }
    const only = matches[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: page.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: customerLabel(only) }],
      };
    }
    if (page.length >= RESOLVE_SCAN_PAGE_SIZE) {
      throw ResolutionError.truncated(
        `customers.resolve: the name filter "${name}" filled the ${RESOLVE_SCAN_PAGE_SIZE}-record page without an exact match, so the scan stopped at its cap.`,
        { operation: 'customers.resolve' },
      );
    }
    return { value: null, resolutionCost: 'server-filter', scanned: page.length, scanTruncated: false };
  }
}
