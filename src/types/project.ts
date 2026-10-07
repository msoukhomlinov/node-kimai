import type { Customer, CustomerSummary } from './customer';
import type { ProjectListParams, RateSummary } from './common';
import type { Team } from './team';
import type { User } from './user';

// Generated types for project resource
// DO NOT EDIT MANUALLY

export interface Project {
  customer?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  orderNumber?: string;
  orderDate?: string;
  start?: string;
  end?: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  globalActivities?: boolean;
  number?: string;
  color?: string;
}


export interface ProjectEntity {
  parentTitle?: string;
  customer?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  orderNumber?: string;
  orderDate?: string;
  start?: string;
  end?: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  teams?: Team[];
  globalActivities?: boolean;
  number?: string;
  budget?: number;
  timeBudget?: number;
  budgetType?: string;
  color?: string;
}


export interface ProjectExpanded {
  "color-safe"?: string;
  id?: number;
  customer: Customer;
  name: string;
  orderNumber?: string;
  orderDate?: string;
  start?: string;
  end?: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  globalActivities?: boolean;
  number?: string;
  color?: string;
}


export interface ProjectEditForm {
  name: string;
  number?: string;
  comment?: string;
  invoiceText?: string;
  orderNumber?: string;
  orderDate?: string;
  start?: string;
  end?: string;
  customer: number;
  teams?: number[];
  color?: string;
  budget?: unknown;
  timeBudget?: string;
  budgetType?: "month";
  globalActivities?: boolean;
  visible?: boolean;
  billable?: boolean;
}


export interface ProjectMeta {
  name: string;
  value?: string;
}


export interface ProjectRate {
  id?: number;
  user?: User;
  rate?: number;
  internalRate?: number;
  isFixed?: boolean;
}


export interface ProjectRateForm {
  user?: number;
  rate: number;
  internalRate?: number;
  isFixed?: boolean;
}


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — project helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of a project record (policy §9). Kept: identity,
 * ownership and state (`id`, `name`, `customer`, `number`, `orderNumber`,
 * `orderDate`, `start`, `end`, `visible`, `billable`, `globalActivities`,
 * `color`). Dropped: `"color-safe"`, `comment`, the budget fields
 * (`budget`, `timeBudget`, `budgetType`) and the child collections
 * (`metaFields`, `teams`) — the `expand: true` escape hatch returns the full
 * record.
 */
export interface ProjectSummary {
  id?: number;
  name: string;
  customer?: number;
  number?: string;
  orderNumber?: string;
  orderDate?: string;
  start?: string;
  end?: string;
  visible?: boolean;
  billable?: boolean;
  globalActivities?: boolean;
  color?: string;
}

/**
 * The identifier kinds `projects.resolve` documents (policy §6): `{ id }` (or
 * a bare number) is a direct fetch; `{ name }` (or a bare string) is a
 * server-side `name` filter compared exactly. Projects have no other business
 * key.
 */
export type ProjectIdentifier = { id: number } | { name: string } | number | string;

/**
 * The server-driven filters of `projects.search` — exactly the filters the
 * spec declares on `GET /api/projects` (`name`/`visible`/`customer`/
 * `activity`); paging is the helper's `limit` option, never a param.
 */
export type ProjectSearchParams = ProjectListParams;

/**
 * `projects.getContext` — the project plus the records an agent must reason
 * about, fetched with a small bounded pool. Compact by default (the project
 * is a `ProjectSummary`, the customer a `CustomerSummary`, the rates
 * `RateSummary` rows); `expand: true` returns the full child records. `meta`
 * is the record's own `metaFields` (no extra wire call); `customer` is `null`
 * when the project carries no customer reference.
 */
export interface ProjectContext {
  project: ProjectSummary;
  customer: CustomerSummary | null;
  rates: RateSummary[];
  meta: ProjectMeta[];
}

/** `getContext` with `expand: true`: the full project, customer and rate records. */
export interface ProjectContextExpanded {
  project: Project;
  customer: Customer | null;
  rates: ProjectRate[];
  meta: ProjectMeta[];
}
