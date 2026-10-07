// ApprovalBundleClient tests - non-CRUD workflow
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client';

const BASE_URL = 'https://api.kimai.test';
const TOKEN = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

describe('ApprovalBundleClient', () => {
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

  describe('addToApprove', () => {
    it('should call POST /api/approval-bundle/add_to_approve with date', async () => {
      transport.request.mockResolvedValueOnce('/approval/week/2024-01-15');

      const result = await client.approvalBundle.addToApprove({ date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/approval-bundle/add_to_approve',
        query: { date: '2024-01-15' },
      });
      expect(result).toBe('/approval/week/2024-01-15');
    });

    it('should include user param when provided', async () => {
      transport.request.mockResolvedValueOnce('/approval/week/2024-01-15');

      await client.approvalBundle.addToApprove({ user: 5, date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/approval-bundle/add_to_approve',
        query: { user: 5, date: '2024-01-15' },
      });
    });
  });

  describe('nextWeek', () => {
    it('should call GET /api/approval-bundle/next-week', async () => {
      const fixture = loadFixture('approval_week_status');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.nextWeek();

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/next-week',
        query: undefined,
      });
    });

    it('should include user param when provided', async () => {
      const fixture = loadFixture('approval_week_status');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.nextWeek({ user: 5 });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/next-week',
        query: { user: 5 },
      });
    });
  });

  describe('weekStatus', () => {
    it('should call GET /api/approval-bundle/week-status', async () => {
      const fixture = loadFixture('approval_week_status');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.weekStatus({ date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/week-status',
        query: { date: '2024-01-15' },
      });
    });

    it('should include user param when provided', async () => {
      const fixture = loadFixture('approval_week_status');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.weekStatus({ user: 5, date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/week-status',
        query: { user: 5, date: '2024-01-15' },
      });
    });
  });

  describe('overtimeYear', () => {
    it('should call GET /api/approval-bundle/overtime_year', async () => {
      const fixture = loadFixture('approval_overtime_year');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.overtimeYear({ date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/overtime_year',
        query: { date: '2024-01-15' },
      });
    });
  });

  describe('weeklyOvertime', () => {
    it('should call GET /api/approval-bundle/weekly_overtime', async () => {
      const fixture = loadFixture('approval_weekly_overtime');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.weeklyOvertime({ date: '2024-01-15' });

      expect(transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/approval-bundle/weekly_overtime',
        query: { date: '2024-01-15' },
      });
    });
  });

  describe('no user-filter override', () => {
    it('should NOT add user=all to approval-bundle endpoints', async () => {
      const fixture = loadFixture('approval_week_status');
      transport.request.mockResolvedValueOnce(fixture);

      await client.approvalBundle.weekStatus({ date: '2024-01-15' });

      const call = transport.request.mock.calls[0]![0];
      expect(call.query.user).toBeUndefined();
    });
  });
});
