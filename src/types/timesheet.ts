import type { Activity, ActivityExpanded } from './activity';
import type { Project, ProjectExpanded } from './project';
import type { User } from './user';
import type { Customer } from './customer';

// Generated types for timesheet resource
// DO NOT EDIT MANUALLY

export interface TimesheetEntity {
  activity?: number;
  project?: number;
  user?: number;
  tags?: string[];
  id?: number;
  begin: string;
  end?: string;
  duration?: number;
  break?: number;
  description?: string;
  rate?: number;
  internalRate?: number;
  fixedRate?: number;
  hourlyRate?: number;
  exported?: boolean;
  billable?: boolean;
  metaFields?: TimesheetMeta[];
}


export interface TimesheetExpanded {
  tags?: string[];
  id?: number;
  begin: string;
  end?: string;
  duration?: number;
  break?: number;
  user: User;
  activity: ActivityExpanded;
  project: ProjectExpanded;
  description?: string;
  rate?: number;
  internalRate?: number;
  fixedRate?: number;
  hourlyRate?: number;
  exported?: boolean;
  billable?: boolean;
  metaFields?: TimesheetMeta[];
}


export interface TimesheetEditForm {
  begin?: string;
  end?: string;
  project: number;
  activity: number;
  description?: string;
  fixedRate?: number;
  hourlyRate?: number;
  user?: number;
  tags?: string;
  exported?: boolean;
  billable?: boolean;
}


export interface TimesheetMeta {
  name: string;
  value?: string;
}


export interface TimesheetConfig {
  trackingMode?: string;
  defaultBeginTime?: string;
  activeEntriesHardLimit?: number;
  isAllowFutureTimes?: boolean;
  isAllowOverlapping?: boolean;
}

// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — timesheets helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a timesheet record (policy §9). Kept: the fields an
 * agent needs to decide (identity, timing, attribution, description, pricing,
 * state, tags). Dropped: `internalRate`, `fixedRate`, `hourlyRate`,
 * `metaFields` — the `expand: true` escape hatch returns the full record.
 */
export interface TimesheetSummary {
  id?: number;
  begin: string;
  end?: string;
  duration?: number;
  break?: number;
  user?: number;
  project?: number;
  activity?: number;
  description?: string;
  rate?: number;
  exported?: boolean;
  billable?: boolean;
  tags?: string[];
}

/**
 * The identifier kinds `timesheets.resolve` documents (policy §6):
 * `{ id }` (or a bare number) is a direct fetch; `{ begin }` (or a bare
 * non-numeric string) is a server-side `begin` filter; timesheets have no
 * name field, so a string that is not a timestamp resolves to nothing.
 */
export type TimesheetIdentifier =
  | { id: number }
  | { begin: string }
  | number
  | string;

/**
 * The server-driven filters of `timesheets.search` — every filter the spec
 * declares on `GET /api/timesheets` except the paging pair (`page`/`size`,
 * replaced by the helper's `limit`; the wire key keeps the vendor's
 * bracket-free spelling the SDK types use: `users[]` -> `users`). The spec
 * has `tags[]`, not a singular `tag`, and declares no `minDuration`/
 * `maxDuration` filter — requesting one is a type error, never a silent
 * ignore.
 */
export interface TimesheetSearchParams {
  user?: string | number;
  users?: number[];
  customer?: number;
  customers?: number[];
  project?: number;
  projects?: number[];
  activity?: number;
  activities?: number[];
  tags?: string[];
  /** Sort field (the spec's `orderBy`). */
  orderBy?: string;
  /** Sort direction: `asc` | `desc` (the spec's `order`). */
  order?: string;
  begin?: string;
  end?: string;
  exported?: boolean;
  active?: boolean;
  billable?: boolean;
  /** Include the full expanded records (the spec's `full`). */
  full?: boolean;
  /** Only timesheets modified after this timestamp. */
  modified_after?: string;
  /** Free search term (the spec's `term` filter). */
  term?: string;
}

/**
 * `timesheets.getContext` — the timesheet plus its referenced records,
 * fetched with a small bounded pool (at most three in flight). The
 * `timesheet` is the compact summary; `user`/`activity` are `null` when the
 * record carries no reference; `project` is `null` when absent; `customer`
 * is `null` unless the project carries one.
 */
export interface TimesheetContext {
  timesheet: TimesheetSummary;
  user: User | null;
  activity: Activity | null;
  project: Project | null;
  customer: Customer | null;
}

/** `getContext` with `expand: true`: the full timesheet record. */
export interface TimesheetContextExpanded {
  timesheet: TimesheetEntity;
  user: User | null;
  activity: Activity | null;
  project: Project | null;
  customer: Customer | null;
}
