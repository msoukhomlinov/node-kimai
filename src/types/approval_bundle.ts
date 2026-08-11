// Generated types for approval-bundle resource
// DO NOT EDIT MANUALLY

export interface ApprovalWeekStatus {
  user: number;
  date: string;
  approved: boolean;
  timesheets: number;
  duration: number;
}

export interface ApprovalOvertimeYear {
  user: number;
  year: number;
  totalOvertime: number;
  weeks: ApprovalWeekOvertime[];
}

export interface ApprovalWeekOvertime {
  date: string;
  overtime: number;
}

export interface ApprovalWeeklyOvertime {
  user: number;
  date: string;
  overtime: number;
}
