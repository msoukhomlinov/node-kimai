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

