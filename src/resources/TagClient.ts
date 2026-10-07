// TagClient - Tag resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - helpers co-located on the client (policy §5): `resolve`, `search`;
//  - `{ dryRun: true }` on every mutation (policy §7.2): the dry-run path
//    validates and echoes, issues NO wire call, and returns a DryRunResult
//    with `simulated: true`;
//  - structured resolution errors (policy §6): RESOLUTION_AMBIGUOUS carries
//    the candidate ids. The vendor exposes no `GET /api/tags/{id}`, so the id
//    path matches over the complete tag list and a miss is a complete scan
//    with no hit (`null`), never a fabricated NOT_FOUND.
// The pre-existing primitives are untouched (additive only).

import type { TagEntity as Tag, TagEditForm, TagIdentifier, TagSearchParams, TagSummary } from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError, ResolutionError } from '../errors';

import type { ApiClient } from '../client';
import { pathId } from '../guards';
import { streamOnce } from './paging';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
const MAX_HELPER_LIMIT = 100;

/** The identifier kinds `tags.resolve` documents (policy §6). */
const TAG_IDENTIFIER_KINDS =
  'tags.resolve accepts { id }, { name } or a bare numeric id / exact name';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/**
 * Compact projection of a full tag record (policy §9). Kept: identity, name,
 * visibility and colour. Dropped: the vendor-derived `color-safe` fallback.
 */
export function toTagSummary(tag: Tag): TagSummary {
  return {
    id: tag.id,
    name: tag.name,
    visible: tag.visible,
    color: tag.color,
  };
}

/** One-line label for a tag (ambiguity candidates, Resolution wrapper). */
function tagLabel(tag: Tag): string {
  const id = tag.id === undefined ? '?' : String(tag.id);
  return `tag ${id} (${tag.name})`;
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
    target: { resource: 'tags', ids },
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

export class TagClient {
  constructor(private client: ApiClient) {}

  /** Stream every Tag record from the single non-paginated batch. */
  list(): AsyncIterable<Tag> {
    return streamOnce(() => this.listAll());
  }

  /** Collect the single non-paginated batch of Tag records (MCP-preferred read). */
  async listAll(): Promise<Tag[]> {
    return this.client.get<Tag[]>('/api/tags/find');
  }

  async create(input: TagEditForm): Promise<Tag>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: TagEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<TagEditForm>>;
  async create(input: TagEditForm, opts?: MutationOptions): Promise<Tag | DryRunResult<TagEditForm>>;
  /**
   * POST /api/tags. `{ dryRun: true }` validates and echoes without issuing
   * the write (policy §7.2). Classification: write, not idempotent (the vendor
   * does not deduplicate tag names).
   */
  async create(input: TagEditForm, opts?: MutationOptions): Promise<Tag | DryRunResult<TagEditForm>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<TagEditForm>(
        'tags.create',
        'POST',
        '/api/tags',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: typeof input.name === 'string' && input.name.trim().length > 0 }],
        [],
      );
    }
    return this.client.post<Tag>('/api/tags', { body: input });
  }

  async delete(id: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async delete(id: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/tags/{id}. `{ dryRun: true }` validates the target without
   * issuing the delete. Classification: destructive, not reversible.
   */
  async delete(id: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'tags.delete',
        'DELETE',
        `/api/tags/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(id) }],
        ['the delete is irreversible: no dry-run warning restores a deleted tag'],
      );
    }
    return this.client.delete(`/api/tags/${pathId(id)}`);
  }

  async find(name: string): Promise<Tag[]> {
    return this.client.get<Tag[]>('/api/tags/find', { query: { name } });
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a tag from an id or a name (policy §6). Both paths read the
   * vendor's tag list (`GET /api/tags/find`); the vendor exposes no
   * `GET /api/tags/{id}`, so there is no direct fetch.
   *
   * `{ id }` (or a bare number) matches the id exactly over the complete tag
   * list in ONE read — the list is not paginated, so a miss is a complete scan
   * with no hit and returns `null`. `{ name }` (or a bare non-numeric string)
   * goes to the vendor's `name` filter and is compared exactly afterwards:
   * several exact matches throw `RESOLUTION_AMBIGUOUS` with the candidate ids,
   * a filtered set that matches none exactly is ambiguous too (an inexact
   * filter cannot prove absence), and an empty filtered set returns `null`.
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: TagIdentifier): Promise<TagSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: TagIdentifier, opts: HelperOptions & { expand: true }): Promise<Tag | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: TagIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<TagSummary>>;
  async resolve(
    identifier: TagIdentifier,
    opts?: HelperOptions,
  ): Promise<TagSummary | Tag | null | Resolution<TagSummary>>;
  async resolve(
    identifier: TagIdentifier,
    opts?: HelperOptions,
  ): Promise<TagSummary | Tag | null | Resolution<TagSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toTagSummary) as TagSummary | Tag | null | Resolution<TagSummary>;
  }

  /**
   * Search tags server-side (policy §9): one bounded read of the vendor's tag
   * list with its `name` filter — never a page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. The vendor's tag list takes no page/size, so the limit bounds the
   * returned rows. Compact `TagSummary` rows by default; `expand: true`
   * returns the full records.
   */
  async search(params?: TagSearchParams): Promise<TagSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: TagSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<Tag[]>;
  async search(params?: TagSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TagSummary[] | Tag[]>;
  async search(params?: TagSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<TagSummary[] | Tag[]> {
    const size = helperLimit(opts?.limit);
    const items = await this.client.get<Tag[]>('/api/tags/find', {
      query: params === undefined ? undefined : { ...params },
    });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toTagSummary);
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is one bounded read of the
  // vendor's tag list.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: TagIdentifier): Promise<Resolution<Tag>> {
    if (typeof identifier === 'number') return this.resolveByIdentifier(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(TAG_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveByIdentifier(Number(text));
      return this.resolveByName(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(TAG_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveByIdentifier(identifier.id);
    if ('name' in identifier && typeof identifier.name === 'string') return this.resolveByName(identifier.name);
    throw new KimaiConfigError(TAG_IDENTIFIER_KINDS);
  }

  /**
   * The id path: one complete read of the tag list (`GET /api/tags/find`, no
   * filter — the vendor collection is not paginated), matched by exact id. The
   * scan is complete, so a miss returns `null`; several records sharing the id
   * throw RESOLUTION_AMBIGUOUS.
   */
  private async resolveByIdentifier(id: number): Promise<Resolution<Tag>> {
    if (!validId(id)) throw new KimaiConfigError(TAG_IDENTIFIER_KINDS);
    const items = await this.client.get<Tag[]>('/api/tags/find');
    const rows = Array.isArray(items) ? items : [];
    const exact = rows.filter((tag) => tag.id === id);
    if (exact.length > 1) {
      throw ResolutionError.ambiguous(
        `tags.resolve: ${exact.length} tags share the id ${id}, so it is not unique.`,
        { operation: 'tags.resolve', resourceIds: exact.map(() => id) },
      );
    }
    const only = exact[0];
    if (only !== undefined) {
      const candidate: ResolutionCandidate = { id: only.id ?? id, label: tagLabel(only) };
      return {
        value: only,
        resolutionCost: 'client-scan',
        scanned: rows.length,
        scanTruncated: false,
        candidates: [candidate],
      };
    }
    return { value: null, resolutionCost: 'client-scan', scanned: rows.length, scanTruncated: false };
  }

  /**
   * The name path: one bounded server-filtered read (`name=<value>`), compared
   * exactly afterwards. Several exact matches throw RESOLUTION_AMBIGUOUS; a
   * filtered set matching none exactly is ambiguous too; an empty filtered set
   * returns `null`.
   */
  private async resolveByName(name: string): Promise<Resolution<Tag>> {
    const target = name.trim();
    if (target.length === 0) throw new KimaiConfigError(TAG_IDENTIFIER_KINDS);
    const items = await this.client.get<Tag[]>('/api/tags/find', { query: { name: target } });
    const rows = Array.isArray(items) ? items : [];
    const exact = rows.filter((tag) => typeof tag.name === 'string' && tag.name.trim() === target);
    const candidateIds = (list: Tag[]): number[] =>
      list.map((tag) => tag.id).filter((v): v is number => typeof v === 'number');
    if (exact.length > 1) {
      throw ResolutionError.ambiguous(
        `tags.resolve: ${exact.length} tags are named "${target}", so it is not unique.`,
        { operation: 'tags.resolve', resourceIds: candidateIds(exact) },
      );
    }
    const only = exact[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'server-filter',
        scanned: rows.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: tagLabel(only) }],
      };
    }
    if (rows.length > 0) {
      throw ResolutionError.ambiguous(
        `tags.resolve: the name filter "${target}" matched ${rows.length} tags, none of them exactly.`,
        { operation: 'tags.resolve', resourceIds: candidateIds(rows) },
      );
    }
    return { value: null, resolutionCost: 'server-filter', scanned: 0, scanTruncated: false };
  }
}
