// ExportClient tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

describe('ExportClient', () => {
  let client: ApiClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
  });

  describe('deleteTemplate', () => {
    it('should call DELETE /api/export/{id}', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      await client.export.deleteTemplate(5);

      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/export/5',
      });
    });
  });

  describe('no list endpoint', () => {
    it('should NOT have a list method (binary GET not implemented)', () => {
      expect((client.export as any).list).toBeUndefined();
    });
  });
});


// ---------------------------------------------------------------------------
// Phase F (agent execution layer) — export.
// Pinned test rows — the titles below are asserted verbatim by
// scripts/check-capabilities.mjs against capabilities.plan.json; do not
// rename them without updating the plan rows (group: export).
// ---------------------------------------------------------------------------

describe('ExportClient — Phase F agent execution layer', () => {
  let client: ApiClient;
  let transport: { request: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transport = { request: vi.fn().mockResolvedValue({}) };
    client = new ApiClient({
      baseUrl: BASE_URL,
      token: TOKEN,
      transport: transport as any,
    });
  });

  describe('export.deleteTemplate (pinned rows)', () => {
    it('calls the export.deleteTemplate endpoint and normalises the result', async () => {
      transport.request.mockResolvedValueOnce(undefined);

      const res = await client.export.deleteTemplate(5);

      expect(res).toBeUndefined();
      expect(transport.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/api/export/5',
      });
    });

    it('dry-run issues no mutating request and returns simulated: true', async () => {
      const res = await client.export.deleteTemplate(5, { dryRun: true });

      expect(res.simulated).toBe(true);
      expect(res.wouldApply).toBe(true);
      expect(res.operation).toBe('export.deleteTemplate');
      expect(res.target).toEqual({ resource: 'export', ids: [5] });
      expect(res.request).toEqual({ method: 'DELETE', path: '/api/export/5' });
      expect(res.checks).toEqual([{ name: 'target-id', ok: true }]);
      expect(res.impact).toEqual({ affected: 1, scope: 'single', reversible: false });
      expect(transport.request).not.toHaveBeenCalled();
    });
  });
});
