// ExportClient - Export resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

// Phase F (agent execution layer, additive):
//  - `{ dryRun: true }` on `export.deleteTemplate` (policy §7.2): the dry-run
//    path validates the target and issues NO wire call (the endpoint is a
//    DELETE), returning a DryRunResult with `simulated: true`.
// The pre-existing primitive is untouched (additive only).

import type { DryRunResult, MutationOptions } from '../types/common';

import type { ApiClient } from '../client';

/** True for a valid target id (positive integer). */
function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
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
    target: { resource: 'export', ids },
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

export class ExportClient {
  constructor(private client: ApiClient) {}

  async deleteTemplate(templateId: number): Promise<void>;
  /** Dry-run: describe the delete without issuing it (zero wire calls). */
  async deleteTemplate(templateId: number, opts: MutationOptions & { dryRun: true }): Promise<DryRunResult<void>>;
  async deleteTemplate(templateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>>;
  /**
   * DELETE /api/export/{id}. `{ dryRun: true }` validates the target without
   * issuing the delete. Classification: destructive, not reversible.
   */
  async deleteTemplate(templateId: number, opts?: MutationOptions): Promise<void | DryRunResult<void>> {
    if (opts?.dryRun === true) {
      return mutationDryRun<void>(
        'export.deleteTemplate',
        'DELETE',
        `/api/export/${templateId}`,
        [templateId],
        { affected: 1, scope: 'single', reversible: false },
        undefined,
        [{ name: 'target-id', ok: validId(templateId) }],
        ['the delete is irreversible: no dry-run warning restores a deleted template'],
      );
    }
    return this.client.delete(`/api/export/${templateId}`);
  }
}
