// TimesheetClient - Timesheet resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  TimesheetEntity as Timesheet,
  TimesheetEditForm,
  TimesheetListParams,
} from '../types';

import type { ApiClient } from '../client';

export class TimesheetClient {
  constructor(private client: ApiClient) {}

  async list(params?: TimesheetListParams): Promise<Timesheet[]> {
    const query = { ...params };
    // User-filter override: if no user filter given, fetch ALL users
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    return this.client.get<Timesheet[]>('/api/timesheets', { query });
  }

  async getAll(params?: TimesheetListParams): Promise<Timesheet[]> {
    const query = { ...params };
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    const pages: Timesheet[] = [];
    let page = query.page || 1;
    const size = query.size || 100;

    while (true) {
      const results = await this.client.get<Timesheet[]>('/api/timesheets', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      pages.push(...results);
      if (results.length < size) break;
      page++;
    }
    return pages;
  }

  async *listPages(params?: TimesheetListParams): AsyncIterable<Timesheet[]> {
    const query = { ...params };
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    const size = query.size || 100;
    let page = query.page || 1;

    while (true) {
      const results = await this.client.get<Timesheet[]>('/api/timesheets', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      yield results;
      if (results.length < size) break;
      page++;
    }
  }

  async getById(id: number): Promise<Timesheet> {
    return this.client.get<Timesheet>(`/api/timesheets/${id}`);
  }

  async create(input: TimesheetEditForm): Promise<Timesheet> {
    return this.client.post<Timesheet>('/api/timesheets', { body: input });
  }

  async update(id: number, input: TimesheetEditForm): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/timesheets/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/meta`, { body: meta });
  }

  async getActive(): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/active');
  }

  async getRecent(params?: { begin?: string, size?: number }): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/recent', { query: params });
  }

  async stop(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/stop`);
  }

  async restart(id: number, input?: { copy?: string, begin?: string }): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/restart`, { body: input });
  }

  async duplicate(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/duplicate`);
  }

  async toggleExport(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/export`);
  }
}
