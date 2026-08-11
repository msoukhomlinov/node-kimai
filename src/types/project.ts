// Generated types for project resource
// DO NOT EDIT MANUALLY

import type { Team } from './team';
import type { Customer } from './customer';
import type { User } from './user';

export interface Project {
  customer?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  number?: string;
  color?: string;
}

export interface ProjectEntity {
  customer?: number;
  "color-safe"?: string;
  id?: number;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  teams?: Team[];
  number?: string;
  budget?: number;
  timeBudget?: number;
  budgetType?: string;
  color?: string;
}

export interface ProjectExpanded {
  customer?: Customer;
  "color-safe"?: string;
  id?: number;
  name: string;
  comment?: string;
  visible?: boolean;
  billable?: boolean;
  metaFields?: ProjectMeta[];
  number?: string;
  color?: string;
}

export interface ProjectEditForm {
  name: string;
  number?: string;
  comment?: string;
  invoiceText?: string;
  customer?: number;
  teams?: number[];
  color?: string;
  budget?: unknown;
  timeBudget?: string;
  budgetType?: "month";
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
