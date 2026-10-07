// InvoiceClient - Invoice resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - helpers co-located on the client (policy §5): `resolve`, `search`;
//  - `{ dryRun: true }` on `invoices.updateCustomFields` (policy §7.2): the
//    dry-run path validates and echoes, issues NO wire call, and returns a
//    DryRunResult with `simulated: true`;
//  - structured resolution errors (policy §6): a miss keeps throwing
//    NOT_FOUND (never `null`). Invoices have no business-key vendor filter,
//    so `resolve` accepts the numeric id only — no list walk, no client scan.
// The pre-existing primitives are untouched (additive only).

import type {
  Invoice,
  InvoiceIdentifier,
  InvoiceMeta,
  InvoiceListParams,
  InvoiceSearchParams,
  InvoiceSummary,
} from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError } from '../errors';

import type { ApiClient } from '../client';
import { collectPages, pageParams, streamItems, streamPages, type PageFetcher } from './paging';
import type { Page } from '../types/common';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
export const MAX_HELPER_LIMIT = 100;

/** The identifier kinds `invoices.resolve` documents (policy §6). */
const INVOICE_IDENTIFIER_KINDS =
  'invoices.resolve accepts { id } or a bare numeric id; invoices have no vendor filter for a business key (invoice number), so no name/number resolution is offered';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/** The numeric id of a referenced record (embedded objects are dropped by the summary). */
function entityId(ref: { id?: number } | number | null | undefined): number | undefined {
  if (ref === undefined || ref === null) return undefined;
  if (typeof ref === 'number') return ref;
  return ref.id;
}

/** Compact projection of a full invoice record (policy §9). */
export function toInvoiceSummary(invoice: Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    status: invoice.status,
    customerId: entityId(invoice.customer),
    userId: entityId(invoice.user),
    currency: invoice.currency,
    total: invoice.total,
    tax: invoice.tax,
    vat: invoice.vat,
    dueDays: invoice.dueDays,
    paymentDate: invoice.paymentDate,
    overdue: invoice.overdue,
    invoiceFilename: invoice.invoiceFilename,
    comment: invoice.comment,
  };
}

/** One-line label for an invoice (ambiguity candidates, Resolution wrapper). */
function invoiceLabel(invoice: Invoice): string {
  const id = invoice.id === undefined ? '?' : String(invoice.id);
  return `invoice ${id} (${invoice.invoiceNumber ?? '?'}, ${invoice.currency})`;
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
    target: { resource: 'invoices', ids },
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

export class InvoiceClient {
  constructor(private client: ApiClient) {}

  /** Stream every Invoice record across pages until a short/empty page. */
  list(params?: InvoiceListParams): AsyncIterable<Invoice> {
    const plan = this.pagePlan(params);
    return streamItems(plan.fetch, plan.page, plan.size);
  }

  /** Collect every page of Invoice records (MCP-preferred read). */
  async listAll(params?: InvoiceListParams): Promise<Invoice[]> {
    const plan = this.pagePlan(params);
    return collectPages(plan.fetch, plan.page, plan.size);
  }

  /**
   * Page stream for `for await (const page of client.invoices.listPages())`.
   * Public and non-async: the return type is `AsyncIterable<Page<Invoice>>`. Kimai
   * returns bare arrays with no totals, so `hasMore` is derived honestly:
   * `hasMore = items.length === size`.
   */
  listPages(params?: InvoiceListParams): AsyncIterable<Page<Invoice>> {
    const plan = this.pagePlan(params);
    return streamPages(plan.fetch, plan.page, plan.size);
  }

  /** Resolve the paging params (default page 1 / size 100) and the per-page fetcher. */
  private pagePlan(params?: InvoiceListParams): { fetch: PageFetcher<Invoice>; page: number; size: number } {
    const { page, size } = pageParams(params);
    return {
      page,
      size,
      fetch: (p, s) => this.client.get<Invoice[]>('/api/invoices', { query: { ...params, page: p, size: s } }),
    };
  }

  /** Get one Invoice record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<Invoice> {
    return this.client.get<Invoice>(`/api/invoices/${id}`);
  }

  async updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice>;
  /** Dry-run: describe the custom-fields update without issuing it (zero wire calls). */
  async updateCustomFields(id: number, fields: InvoiceMeta[], opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<InvoiceMeta[]>>;
  async updateCustomFields(id: number, fields: InvoiceMeta[], opts?: MutationOptions): Promise<Invoice | DryRunResult<InvoiceMeta[]>>;
  /**
   * PATCH /api/invoices/{id}/custom-fields. `{ dryRun: true }` validates the
   * target and the field map without issuing the write. Classification:
   * write, idempotent (the posted field set is the resulting set).
   */
  async updateCustomFields(id: number, fields: InvoiceMeta[], opts?: MutationOptions): Promise<Invoice | DryRunResult<InvoiceMeta[]>> {
    if (opts?.dryRun === true) {
      const fieldsOk =
        Array.isArray(fields) &&
        fields.length > 0 &&
        fields.every((field) => field !== null && typeof field === 'object' && nonBlank(field.name));
      return mutationDryRun<InvoiceMeta[]>(
        'invoices.updateCustomFields',
        'PATCH',
        `/api/invoices/${id}/custom-fields`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        fields,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'custom-fields', ok: fieldsOk },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<Invoice>(`/api/invoices/${id}/custom-fields`, { body: fields });
  }

  async download(id: number): Promise<ArrayBuffer> {
    return this.client.get<ArrayBuffer>(`/api/invoices/${id}/download`, { responseType: 'arraybuffer' });
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve an invoice from an id (policy §6).
   *
   * Invoices have no vendor filter for a business key (invoice number), so
   * `resolve` accepts `{ id }` or a bare numeric id / numeric string only and
   * fetches it directly: a miss throws `NOT_FOUND`, never `null`. Text that is
   * not an id throws `KimaiConfigError` (the documented kinds).
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: InvoiceIdentifier): Promise<InvoiceSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: InvoiceIdentifier, opts: HelperOptions & { expand: true }): Promise<Invoice | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: InvoiceIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<InvoiceSummary>>;
  async resolve(
    identifier: InvoiceIdentifier,
    opts?: HelperOptions,
  ): Promise<InvoiceSummary | Invoice | null | Resolution<InvoiceSummary>>;
  async resolve(
    identifier: InvoiceIdentifier,
    opts?: HelperOptions,
  ): Promise<InvoiceSummary | Invoice | null | Resolution<InvoiceSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toInvoiceSummary) as
      | InvoiceSummary
      | Invoice
      | null
      | Resolution<InvoiceSummary>;
  }

  /**
   * Search invoices server-side (policy §9): one bounded request carrying
   * every filter the spec declares on `GET /api/invoices` (`begin`, `end`,
   * `customers[]`, `status[]`) — never a page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. Compact by default; `expand: true` returns the full records.
   */
  async search(params?: InvoiceSearchParams): Promise<InvoiceSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: InvoiceSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Invoice[]>;
  async search(params?: InvoiceSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<InvoiceSummary[] | Invoice[]>;
  async search(params?: InvoiceSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<InvoiceSummary[] | Invoice[]> {
    const size = helperLimit(opts?.limit);
    const query: Record<string, string | number | boolean | null | string[] | number[] | undefined> = {
      ...(params ?? {}),
      size,
    };
    const items = await this.client.get<Invoice[]>('/api/invoices', { query });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toInvoiceSummary);
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): the only branch is a direct fetch.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: InvoiceIdentifier): Promise<Resolution<Invoice>> {
    if (typeof identifier === 'number') return this.resolveById(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (!/^\d+$/.test(text)) throw new KimaiConfigError(INVOICE_IDENTIFIER_KINDS);
      return this.resolveById(Number(text));
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(INVOICE_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveById(identifier.id);
    throw new KimaiConfigError(INVOICE_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveById(id: number): Promise<Resolution<Invoice>> {
    const invoice = await this.get(id);
    const candidate: ResolutionCandidate = { id: invoice.id ?? id, label: invoiceLabel(invoice) };
    return {
      value: invoice,
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
      candidates: [candidate],
    };
  }
}
