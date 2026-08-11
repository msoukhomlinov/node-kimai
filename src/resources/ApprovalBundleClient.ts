// ApprovalBundleClient - Approval bundle operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  ApprovalWeekStatus,
  ApprovalOvertimeYear,
  ApprovalWeeklyOvertime,
} from '../types';

import type { ApiClient } from '../client';

export class ApprovalBundleClient {
  constructor(private client: ApiClient) {}

  async addToApprove(params: { user?: number; date: string }): Promise<string> {
    return this.client.post<string>('/api/approval-bundle/add_to_approve', { query: params });
  }

  async nextWeek(params?: { user?: number }): Promise<ApprovalWeekStatus> {
    return this.client.get<ApprovalWeekStatus>('/api/approval-bundle/next-week', { query: params });
  }

  async weekStatus(params: { user?: number; date: string }): Promise<ApprovalWeekStatus> {
    return this.client.get<ApprovalWeekStatus>('/api/approval-bundle/week-status', { query: params });
  }

  async overtimeYear(params: { user?: number; date: string }): Promise<ApprovalOvertimeYear> {
    return this.client.get<ApprovalOvertimeYear>('/api/approval-bundle/overtime_year', { query: params });
  }

  async weeklyOvertime(params: { user?: number; date: string }): Promise<ApprovalWeeklyOvertime[]> {
    return this.client.get<ApprovalWeeklyOvertime[]>('/api/approval-bundle/weekly_overtime', { query: params });
  }
}
