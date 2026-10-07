// ApprovalBundleClient - Approval bundle operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - `{ dryRun: true }` on `approvalBundle.addToApprove` (policy §7.2): the
//    dry-run path validates and echoes, issues NO wire call (the endpoint is a
//    POST), and returns a DryRunResult with `simulated: true`.
// The pre-existing primitives are untouched (additive only).

import type {
  ApprovalApproveParams,
  ApprovalWeekStatus,
  ApprovalOvertimeYear,
  ApprovalWeeklyOvertime,
} from '../types';
import type { DryRunResult, MutationOptions } from '../types/common';

import type { ApiClient } from '../client';

/** True for a valid target id (positive integer). */
function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** True for a non-blank string (the vendor's required text fields). */
function nonBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Build a dry-run envelope (policy §7.2). The dry-run path issues NO wire
 * call: `impact` and any `diff` are best-effort and say so in `warnings`.
 */
function mutationDryRun<T>(
  operation: string,
  method: string,
  path: string,
  ids: number[],
  impact: { affected: number; scope: string; reversible: boolean },
  data: T | undefined,
  checks: Array<{ name: string; ok: boolean }>,
  warnings: string[],
): DryRunResult<T> {
  const result: DryRunResult<T> = {
    operation,
    wouldApply: true,
    target: { resource: 'approvalBundle', ids },
    request: { method, path },
    checks,
    impact,
    simulated: true,
    warnings: [
      'dry-run issues no wire call: referenced resources are not verified',
      'impact is a best-effort estimate, not a server guarantee',
      ...warnings,
    ],
  };
  if (data !== undefined) {
    result.data = data;
  }
  return result;
}

export class ApprovalBundleClient {
  constructor(private client: ApiClient) {}

  async addToApprove(params: ApprovalApproveParams): Promise<string>;
  /** Dry-run: describe the approval without issuing it (zero wire calls). */
  async addToApprove(params: ApprovalApproveParams, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<ApprovalApproveParams>>;
  async addToApprove(params: ApprovalApproveParams, opts?: MutationOptions): Promise<string | DryRunResult<ApprovalApproveParams>>;
  /**
   * POST /api/approval-bundle/add_to_approve. `{ dryRun: true }` validates the
   * target user and the week date without issuing the write. Classification:
   * write, not idempotent (the vendor appends the week to the approval set;
   * this SDK exposes no remove-from-approve counterpart).
   */
  async addToApprove(params: ApprovalApproveParams, opts?: MutationOptions): Promise<string | DryRunResult<ApprovalApproveParams>> {
    if (opts?.dryRun === true) {
      const ids = typeof params.user === 'number' && validId(params.user) ? [params.user] : [];
      return mutationDryRun<ApprovalApproveParams>(
        'approvalBundle.addToApprove',
        'POST',
        '/api/approval-bundle/add_to_approve',
        ids,
        { affected: 1, scope: 'single', reversible: false },
        params,
        [
          { name: 'required-fields', ok: nonBlank(params.date) },
          { name: 'user-target', ok: params.user === undefined || validId(params.user) },
        ],
        [
          'the vendor receives user/date as query parameters, which the dry-run request envelope does not carry',
          'reversal is not exposed by this SDK: the approval set is append-only here',
        ],
      );
    }
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
