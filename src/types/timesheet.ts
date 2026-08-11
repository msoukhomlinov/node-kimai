// Generated types for timesheet resource
// DO NOT EDIT MANUALLY

import type { User } from './user';
import type { ActivityExpanded } from './activity';
import type { ProjectExpanded } from './project';

export interface TimesheetEntity {
  id?: number;
  user?: User;
  activity?: ActivityExpanded;
  project?: ProjectExpanded;
  begin?: string;
  end?: string;
  duration?: number;
  description?: string;
  exportable?: boolean;
  metaFields?: TimesheetMeta[];
}

export interface TimesheetExpanded {
  id?: number;
  user?: User;
  activity?: ActivityExpanded;
  project?: ProjectExpanded;
  begin?: string;
  end?: string;
  duration?: number;
  description?: string;
  exportable?: boolean;
  metaFields?: TimesheetMeta[];
}

export interface TimesheetEditForm {
  user?: number;
  activity?: number;
  project?: number;
  begin?: string;
  end?: string;
  description?: string;
}

export interface TimesheetMeta {
  name: string;
  value?: string;
}

export interface TimesheetConfig {
  timesheet: string;
  timesheetPage: string;
  timesheetDefaultProject: string;
  timesheetDefaultActivity: string;
}
