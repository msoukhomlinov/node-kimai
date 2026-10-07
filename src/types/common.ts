// Shared types used across resources
// DO NOT EDIT MANUALLY

export type ListParams = {
  page?: number;
  size?: number;
};

/**
 * One page of a PAGINATED Kimai list (node-hudu line). The vendor returns a
 * bare array with no totals, so `hasMore` is derived honestly from the
 * requested size: `hasMore = items.length === size`. No `total`/`totalPages`
 * is invented — Kimai does not provide one.
 */
export interface Page<T> {
  items: T[];
  /** 1-based page number this batch was requested as. */
  page: number;
  /** Page size requested for this batch. */
  size: number;
  /** True when the page was full (the only continuation signal the vendor gives). */
  hasMore: boolean;
}

export type ActivityListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
};

export type CustomerListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
};

export type ProjectListParams = {
  name?: string;
  visible?: boolean;
  customer?: number;
  activity?: number;
};

export type TimesheetListParams = {
  page?: number;
  size?: number;
  user?: string | number;
  users?: number[];
  begin?: string;
  end?: string;
  activity?: number;
  project?: number;
  customer?: number;
  tag?: string;
  exported?: boolean;
};

export type UserListParams = {
  role?: string;
  team?: number;
};

export type InvoiceListParams = {
  page?: number;
  size?: number;
  customer?: number;
  /** Only invoices created at or after this date-time (HTML5 datetime-local). */
  begin?: string;
  /** Only invoices created before or at this date-time (HTML5 datetime-local). */
  end?: string;
  /** Vendor filter `customers[]`: only invoices of these customer ids. */
  customers?: number[];
  /** Vendor filter `status[]`: pending, paid, canceled or new. */
  status?: string[];
};

export type TeamListParams = {
  name?: string;
};

// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — the shared agent-layer shapes.
// Declared once here so no resource re-invents a shape (policy §4.1/§6/§7).
// ---------------------------------------------------------------------------

/** A before/after field difference (update dry-run `diff`). */
export interface FieldDiff {
  field: string;
  from: unknown;
  to: unknown;
}

/** Dry-run result for a mutation (policy §7.2). `simulated: true` is mandatory: the server's computed result cannot be promised. */
export interface DryRunResult<T> {
  operation: string;
  wouldApply: boolean;
  target: { resource: string; ids: number[] };
  request: { method: string; path: string };
  /** Present only for updates that carry a before-state; best-effort. */
  diff?: FieldDiff[];
  checks: Array<{ name: string; ok: boolean }>;
  /** Best-effort impact statement (not a server guarantee). */
  impact: { affected: number; scope: string; reversible: boolean };
  simulated: true;
  warnings: string[];
  /** The typed input that WOULD be applied (present for writes). */
  data?: T;
}

/** One candidate of an ambiguous resolution. */
export interface ResolutionCandidate {
  id: number;
  label: string;
}

/** A bounded resolution outcome (policy §6 — the `resolutionDetails: true` wrapper). */
export interface Resolution<T> {
  value: T | null;
  resolutionCost: 'direct' | 'server-filter' | 'client-scan';
  scanned: number;
  /** True when the scan cap stopped the scan before the data ran out. */
  scanTruncated: boolean;
  /** Populated on ambiguity (RESOLUTION_AMBIGUOUS). */
  candidates?: ResolutionCandidate[];
}

/** Options of the read helpers (`resolve`, `search`, `getContext`). */
export interface HelperOptions {
  /** Return the full records instead of the compact summaries. */
  expand?: boolean;
  /** Return the `Resolution<T>` wrapper (cost, scanned, scanTruncated, candidates). */
  resolutionDetails?: boolean;
}

/** Options of the mutations: `{ dryRun: true }` describes the call without issuing it (policy §7.2). */
export interface MutationOptions {
  dryRun?: boolean;
}

/** Registry mirror of one operation's metadata (the plan's columns, machine-readable form). */
export interface OperationMetadata {
  /** Registry operation name (e.g. `timesheets.stop`). */
  name: string;
  resource: string;
  endpoint: { method: string; path: string } | null;
  kind: 'primitive' | 'helper';
  effect: 'read' | 'write' | 'destructive';
  flags: { sensitive?: boolean; idempotent?: boolean; requiresApproval?: boolean };
  /** Whether the op accepts `{ dryRun: true }`. */
  dryRun: boolean;
}


/**
 * Phase F (agent execution layer) — the shared compact shapes of the
 * workflow helpers (policy §9). Declared once here so no resource
 * re-invents them.
 */

/**
 * Compact projection of a rate record (policy §9). Kept: the price fields an
 * agent needs (`rate`, `internalRate`, `isFixed`); dropped: the embedded
 * `user` object (the numeric id stays as `userId`) — the `expand: true`
 * escape hatch returns the full rate records.
 */
export interface RateSummary {
  id?: number;
  userId?: number;
  rate?: number;
  internalRate?: number;
  isFixed?: boolean;
}

/**
 * Compact projection of a comment record (policy §9). Kept: the content and
 * state (`message`, `pinned`, `createdAt`); dropped: the embedded `createdBy`
 * user object — the `expand: true` escape hatch returns the full records.
 */
export interface CommentSummary {
  id?: number;
  message: string;
  pinned?: boolean;
  createdAt: string;
}
