import type { ActivityListParams } from './common';
import type { ProjectExpanded } from './project';
import type { Team } from './team';
import type { User } from './user';

// Generated types for activity resource
// DO NOT EDIT MANUALLY

export interface Activity {
  project?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ActivityMeta[];
  number?: string;
  color?: string;
}


export interface ActivityEntity {
  parentTitle?: string;
  project?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ActivityMeta[];
  teams?: Team[];
  number?: string;
  budget?: number;
  timeBudget?: number;
  budgetType?: string;
  color?: string;
}


export interface ActivityExpanded {
  "color-safe"?: string;
  id?: number;
  project?: ProjectExpanded;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ActivityMeta[];
  number?: string;
  color?: string;
}


export interface ActivityEditForm {
  name: string;
  number?: string;
  comment?: string;
  invoiceText?: string;
  project?: number;
  teams?: number[];
  color?: string;
  budget?: unknown;
  timeBudget?: string;
  budgetType?: "month";
  visible?: boolean;
  billable?: boolean;
}


export interface ActivityMeta {
  name: string;
  value?: string;
}


export interface ActivityRate {
  id?: number;
  user?: User;
  rate?: number;
  internalRate?: number;
  isFixed?: boolean;
}


export interface ActivityRateForm {
  user?: number;
  rate: number;
  internalRate?: number;
  isFixed?: boolean;
}


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — activity helper shapes.
// ---------------------------------------------------------------------------

/**
 * The compact projection of an activity record (policy §9). Kept: identity,
 * scope and state (`id`, `name`, `project`, `number`, `visible`, `billable`,
 * `color`). Dropped: `"color-safe"` (the vendor's duplicate of `color`),
 * `comment` (long-form free text) and `metaFields` (the child collection) —
 * the `expand: true` escape hatch returns the full record.
 */
export interface ActivitySummary {
  id?: number;
  name: string;
  project?: number;
  number?: string;
  visible?: boolean;
  billable?: boolean;
  color?: string;
}

/**
 * The identifier kinds `activities.resolve` documents (policy §6):
 * `{ id }` (or a bare number) is a direct fetch; `{ name }` (or a bare
 * string) is a server-side `name` filter compared exactly. Activities have
 * no other business key.
 */
export type ActivityIdentifier = { id: number } | { name: string } | number | string;

/**
 * The server-driven filters of `activities.search` — exactly the filters the
 * spec declares on `GET /api/activities` (`name`/`visible`/`customer`);
 * paging is the helper's `limit` option, never a param.
 */
export type ActivitySearchParams = ActivityListParams;
