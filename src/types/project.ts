import type { Customer } from './customer';
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

