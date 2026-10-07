import type { ActivityExpanded } from './activity';
import type { ProjectExpanded } from './project';
import type { User } from './user';

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

