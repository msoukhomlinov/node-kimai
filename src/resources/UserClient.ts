// UserClient - User resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - helpers co-located on the client (policy §5): `resolve`, `search`;
//  - `{ dryRun: true }` on every mutation (policy §7.2): the dry-run path
//    validates and echoes, issues NO wire call, and returns a DryRunResult
//    with `simulated: true`;
//  - structured resolution errors (policy §6): RESOLUTION_AMBIGUOUS carries
//    the candidate ids, a scan stopped by the record cap throws
//    RESOLUTION_TRUNCATED (never `null`), and an id miss keeps NOT_FOUND.
// The pre-existing primitives are untouched (additive only).

import type {
  User,
  UserEntity,
  UserEditForm,
  UserCreateForm,
  UserPreference,
  UserListParams,
  UserIdentifier,
  UserSearchParams,
  UserSummary,
} from '../types';
import type { DryRunResult, HelperOptions, MutationOptions, Resolution, ResolutionCandidate } from '../types/common';
import { KimaiConfigError, ResolutionError } from '../errors';

import type { ApiClient } from '../client';
import { pathId } from '../guards';
import { streamOnce } from './paging';

/** Helper `limit` bounds (policy §9): default 25, hard maximum 100. */
const DEFAULT_HELPER_LIMIT = 25;
const MAX_HELPER_LIMIT = 100;
/**
 * The record cap of `users.resolve`'s bounded client scan (policy §6). The
 * vendor's user collection takes no `page`/`size`, so the record cap — not a
 * page count — is the bound that can stop the scan early.
 */
const RESOLVE_MAX_SCAN_RECORDS = 500;

/** The identifier kinds `users.resolve` documents (policy §6). */
const USER_IDENTIFIER_KINDS =
  'users.resolve accepts { id }, { username } or a bare numeric id / exact username';

/** Validate a helper `limit`: default 25, hard maximum 100 — never silently clamped. */
function helperLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_HELPER_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HELPER_LIMIT) {
    throw new KimaiConfigError(`limit must be an integer from 1 to ${MAX_HELPER_LIMIT}, got "${String(limit)}"`);
  }
  return limit;
}

/**
 * Compact projection of a full user record (policy §9). Built field by field,
 * so anything the runtime record carries beyond the declared fields (and the
 * dropped credential-shaped `apiToken`) never reaches the caller.
 */
export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    username: user.username,
    alias: user.alias,
    title: user.title,
    email: user.email,
    avatar: user.avatar,
    initials: user.initials,
    language: user.language,
    locale: user.locale,
    timezone: user.timezone,
    accountNumber: user.accountNumber,
    enabled: user.enabled,
    systemAccount: user.systemAccount,
    color: user.color,
  };
}

/** One-line label for a user (ambiguity candidates, Resolution wrapper). */
function userLabel(user: User): string {
  const id = user.id === undefined ? '?' : String(user.id);
  return `user ${id} (${user.username})`;
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
    target: { resource: 'users', ids },
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

export class UserClient {
  constructor(private client: ApiClient) {}

  /** Stream every User record from the single non-paginated batch. */
  list(params?: UserListParams): AsyncIterable<User> {
    return streamOnce(() => this.listAll(params));
  }

  /** Collect the single non-paginated batch of User records (MCP-preferred read). */
  async listAll(params?: UserListParams): Promise<User[]> {
    return this.client.get<User[]>('/api/users', { query: params });
  }

  /** Get one User record by id; a 404 normalises to NOT_FOUND. */
  async get(id: number): Promise<User> {
    return this.client.get<User>(`/api/users/${pathId(id)}`);
  }

  async getMe(): Promise<UserEntity> {
    return this.client.get<UserEntity>('/api/users/me');
  }

  async create(input: UserCreateForm): Promise<UserEntity>;
  /** Dry-run: describe the create without issuing it (zero wire calls). */
  async create(input: UserCreateForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<UserCreateForm>>;
  async create(input: UserCreateForm, opts?: MutationOptions): Promise<UserEntity | DryRunResult<UserCreateForm>>;
  /**
   * POST /api/users. `{ dryRun: true }` validates and echoes without issuing
   * the write (policy §7.2). Classification: write, not idempotent.
   */
  async create(input: UserCreateForm, opts?: MutationOptions): Promise<UserEntity | DryRunResult<UserCreateForm>> {
    if (opts?.dryRun === true) {
      const missing: string[] = [];
      if (!input.username) missing.push('username');
      if (!input.email) missing.push('email');
      if (!input.language) missing.push('language');
      if (!input.locale) missing.push('locale');
      if (!input.timezone) missing.push('timezone');
      const warnings: string[] = [];
      if (missing.length > 0) {
        warnings.push(`required field(s) missing: ${missing.join(', ')}; the live create would fail validation`);
      }
      return mutationDryRun<UserCreateForm>(
        'users.create',
        'POST',
        '/api/users',
        [],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [{ name: 'required-fields', ok: missing.length === 0 }],
        warnings,
      );
    }
    return this.client.post<UserEntity>('/api/users', { body: input });
  }

  async update(id: number, input: UserEditForm): Promise<User>;
  /** Dry-run: describe the update without issuing it (zero wire calls). */
  async update(id: number, input: UserEditForm, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<UserEditForm>>;
  async update(id: number, input: UserEditForm, opts?: MutationOptions): Promise<User | DryRunResult<UserEditForm>>;
  /**
   * PATCH /api/users/{id}. `{ dryRun: true }` validates and echoes without
   * issuing the write. Classification: write, idempotent. The vendor exposes
   * no version field for users, so there is no stale-object guard (the plan
   * records `staleCheck` for this resource accordingly).
   */
  async update(id: number, input: UserEditForm, opts?: MutationOptions): Promise<User | DryRunResult<UserEditForm>> {
    if (opts?.dryRun === true) {
      const missing: string[] = [];
      if (!input.email) missing.push('email');
      if (!input.language) missing.push('language');
      if (!input.locale) missing.push('locale');
      if (!input.timezone) missing.push('timezone');
      const warnings: string[] = [];
      if (missing.length > 0) {
        warnings.push(`required field(s) missing: ${missing.join(', ')}; the live update would fail validation`);
      }
      return mutationDryRun<UserEditForm>(
        'users.update',
        'PATCH',
        `/api/users/${pathId(id)}`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        input,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'required-fields', ok: missing.length === 0 },
        ],
        [DRY_RUN_WARNING_NO_DIFF, ...warnings],
      );
    }
    return this.client.patch<User>(`/api/users/${pathId(id)}`, { body: input });
  }

  async updatePreferences(id: number, prefs: UserPreference[]): Promise<User>;
  /** Dry-run: describe the preference update without issuing it (zero wire calls). */
  async updatePreferences(id: number, prefs: UserPreference[], opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<UserPreference[]>>;
  async updatePreferences(id: number, prefs: UserPreference[], opts?: MutationOptions): Promise<User | DryRunResult<UserPreference[]>>;
  /**
   * PATCH /api/users/{id}/preferences. `{ dryRun: true }` validates the target
   * and the preference payload without issuing the write. Classification:
   * write, idempotent (the preference map is replaced, not appended).
   */
  async updatePreferences(id: number, prefs: UserPreference[], opts?: MutationOptions): Promise<User | DryRunResult<UserPreference[]>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<UserPreference[]>(
        'users.updatePreferences',
        'PATCH',
        `/api/users/${pathId(id)}/preferences`,
        [id],
        { affected: 1, scope: 'single', reversible: true },
        prefs,
        [
          { name: 'target-id', ok: validId(id) },
          { name: 'preferences-payload', ok: Array.isArray(prefs) && prefs.length > 0 },
        ],
        [DRY_RUN_WARNING_NO_DIFF],
      );
    }
    return this.client.patch<User>(`/api/users/${pathId(id)}/preferences`, { body: prefs });
  }

  async deleteApiToken(tokenId: number): Promise<void>;
  /** Dry-run: describe the token delete without issuing it (zero wire calls). */
  async deleteApiToken(tokenId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteApiToken(tokenId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/users/api-token/{id}. `{ dryRun: true }` validates the target
   * without issuing the delete. Classification: destructive, not reversible.
   */
  async deleteApiToken(tokenId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'users.deleteApiToken',
        'DELETE',
        `/api/users/api-token/${pathId(tokenId, 'tokenId')}`,
        [tokenId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(tokenId) }],
        ['the delete is irreversible: no dry-run warning restores a deleted API token'],
      );
    }
    return this.client.delete(`/api/users/api-token/${pathId(tokenId, 'tokenId')}`);
  }

  // ---------------------------------------------------------------------------
  // Agent-execution-layer helpers (policy §5-§9).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a user from an id or a username (policy §6).
   *
   * `{ id }` (or a bare number) is a direct fetch: a miss throws `NOT_FOUND`,
   * never `null`. `{ username }` (or a bare non-numeric string) is an exact
   * match over a bounded client scan of the user list: the vendor declares no
   * `username` filter, and its user collection takes no `page`/`size`, so the
   * scan reads the collection once and examines at most 500 records. A
   * complete scan with no hit returns `null`; a scan stopped by the record cap
   * throws `RESOLUTION_TRUNCATED` (never `null`); several exact matches throw
   * `RESOLUTION_AMBIGUOUS` with the candidate ids. (The plan records
   * `maxScanPages: 5` as the generic scan bound; on this vendor the collection
   * is returned whole, so one request is the whole scan and only the record cap
   * can truncate it.)
   *
   * Compact by default; `expand: true` returns the full record;
   * `resolutionDetails: true` returns the `Resolution<T>` wrapper.
   */
  async resolve(identifier: UserIdentifier): Promise<UserSummary | null>;
  /** `expand: true` returns the full record. */
  async resolve(identifier: UserIdentifier, opts: HelperOptions & { expand: true }): Promise<User | null>;
  /** `resolutionDetails: true` returns the `Resolution<T>` wrapper. */
  async resolve(identifier: UserIdentifier, opts: HelperOptions & { resolutionDetails: true }): Promise<Resolution<UserSummary>>;
  async resolve(
    identifier: UserIdentifier,
    opts?: HelperOptions,
  ): Promise<UserSummary | User | null | Resolution<UserSummary>>;
  async resolve(
    identifier: UserIdentifier,
    opts?: HelperOptions,
  ): Promise<UserSummary | User | null | Resolution<UserSummary>> {
    const resolution = await this.resolveRecord(identifier);
    return projectResolution(resolution, opts, toUserSummary) as UserSummary | User | null | Resolution<UserSummary>;
  }

  /**
   * Search users server-side (policy §9): one bounded read with every filter
   * the SDK types declare (`role`, `team`) and the ones the spec declares on
   * `GET /api/users` (`visible`, `orderBy`, `order`, `term`, `full`) — never a
   * page walk.
   *
   * `limit` defaults to 25 and is capped at 100 — a non-integer or
   * out-of-range value throws `KimaiConfigError`, it is never silently
   * clamped. The vendor's user collection takes no `page`/`size`, so the limit
   * bounds the returned rows (the request itself is one read). Compact
   * `UserSummary` rows by default — the credential-shaped `apiToken` marker is
   * dropped; `expand: true` returns the full records.
   */
  async search(params?: UserSearchParams): Promise<UserSummary[]>;
  /** `expand: true` returns the full records. */
  async search(params: UserSearchParams | undefined, opts: { limit?: number; expand: true }): Promise<User[]>;
  async search(params?: UserSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<UserSummary[] | User[]>;
  async search(params?: UserSearchParams, opts?: { limit?: number; expand?: boolean }): Promise<UserSummary[] | User[]> {
    const size = helperLimit(opts?.limit);
    const items = await this.client.get<User[]>('/api/users', {
      query: params === undefined ? undefined : { ...params },
    });
    const rows = Array.isArray(items) ? items.slice(0, size) : [];
    return opts?.expand === true ? rows : rows.map(toUserSummary);
  }

  // ---------------------------------------------------------------------------
  // `resolve` internals (policy §6): every branch is a direct fetch or one
  // bounded client scan of the user list.
  // ---------------------------------------------------------------------------

  private async resolveRecord(identifier: UserIdentifier): Promise<Resolution<User>> {
    if (typeof identifier === 'number') return this.resolveByIdentifier(identifier);
    if (typeof identifier === 'string') {
      const text = identifier.trim();
      if (text.length === 0) throw new KimaiConfigError(USER_IDENTIFIER_KINDS);
      if (/^\d+$/.test(text)) return this.resolveByIdentifier(Number(text));
      return this.resolveByUsername(text);
    }
    if (identifier === null || typeof identifier !== 'object') throw new KimaiConfigError(USER_IDENTIFIER_KINDS);
    if ('id' in identifier && typeof identifier.id === 'number') return this.resolveByIdentifier(identifier.id);
    if ('username' in identifier && typeof identifier.username === 'string') return this.resolveByUsername(identifier.username);
    throw new KimaiConfigError(USER_IDENTIFIER_KINDS);
  }

  /** Direct fetch by id: a miss throws NOT_FOUND (never `null`). */
  private async resolveByIdentifier(id: number): Promise<Resolution<User>> {
    const user = await this.get(id);
    const candidate: ResolutionCandidate = { id: user.id ?? id, label: userLabel(user) };
    return {
      value: user,
      resolutionCost: 'direct',
      scanned: 1,
      scanTruncated: false,
      candidates: [candidate],
    };
  }

  /**
   * One bounded client scan of the user list with an exact username compare
   * (policy §6). The vendor declares no username filter, so the whole
   * collection is read once and at most `RESOLVE_MAX_SCAN_RECORDS` records are
   * examined: more than one exact match throws RESOLUTION_AMBIGUOUS, a cap that
   * stopped the scan throws RESOLUTION_TRUNCATED, and a complete scan with no
   * hit returns `null`.
   */
  private async resolveByUsername(username: string): Promise<Resolution<User>> {
    const target = username.trim();
    if (target.length === 0) throw new KimaiConfigError(USER_IDENTIFIER_KINDS);
    const items = await this.client.get<User[]>('/api/users');
    const all = Array.isArray(items) ? items : [];
    const scanned = all.slice(0, RESOLVE_MAX_SCAN_RECORDS);
    const exact = scanned.filter((user) => typeof user.username === 'string' && user.username.trim() === target);
    if (exact.length > 1) {
      const candidateIds = exact.map((user) => user.id).filter((v): v is number => typeof v === 'number');
      throw ResolutionError.ambiguous(
        `users.resolve: ${exact.length} users have the username "${target}", so it is not unique.`,
        { operation: 'users.resolve', resourceIds: candidateIds },
      );
    }
    const scanTruncated = all.length > RESOLVE_MAX_SCAN_RECORDS;
    if (scanTruncated) {
      throw ResolutionError.truncated(
        `users.resolve: the user list holds ${all.length} records and the client scan stopped at the cap of ${RESOLVE_MAX_SCAN_RECORDS}, so it cannot decide "${target}".`,
        { operation: 'users.resolve', resourceIds: exact.map((user) => user.id).filter((v): v is number => typeof v === 'number') },
      );
    }
    const only = exact[0];
    if (only !== undefined) {
      return {
        value: only,
        resolutionCost: 'client-scan',
        scanned: scanned.length,
        scanTruncated: false,
        candidates: [{ id: only.id ?? 0, label: userLabel(only) }],
      };
    }
    return { value: null, resolutionCost: 'client-scan', scanned: scanned.length, scanTruncated: false };
  }
}
