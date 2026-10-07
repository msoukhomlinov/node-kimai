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

// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — approval-bundle helper shapes.
// ---------------------------------------------------------------------------

/**
 * The parameters of `approvalBundle.addToApprove` — exactly the vendor filters
 * the spec declares on `POST /api/approval-bundle/add_to_approve` (`user`,
 * `date`). `date` is required; `user` defaults to the authenticated user.
 */
export type ApprovalApproveParams = {
  user?: number;
  date: string;
};
