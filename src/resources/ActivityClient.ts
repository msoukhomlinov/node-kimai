// ActivityClient - Activity resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  Activity,
  ActivityEntity,
  ActivityEditForm,
  ActivityRate,
  ActivityRateForm,
  ActivityListParams,
  Team,
} from '../types';

import type { ApiClient } from '../client';

export class ActivityClient {
  constructor(private client: ApiClient) {}

  async list(params?: ActivityListParams): Promise<Activity[]> {
    return this.client.get<Activity[]>('/api/activities', { query: params });
  }

  async getAll(params?: ActivityListParams): Promise<Activity[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<Activity> {
    return this.client.get<Activity>(`/api/activities/${id}`);
  }

  async create(input: ActivityEditForm): Promise<ActivityEntity> {
    return this.client.post<ActivityEntity>('/api/activities', { body: input });
  }

  async update(id: number, input: ActivityEditForm): Promise<Activity> {
    return this.client.patch<Activity>(`/api/activities/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/activities/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Activity> {
    return this.client.patch<Activity>(`/api/activities/${id}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<ActivityRate[]> {
    return this.client.get<ActivityRate[]>(`/api/activities/${id}/rates`);
  }

  async createRate(id: number, input: ActivityRateForm): Promise<ActivityRate> {
    return this.client.post<ActivityRate>(`/api/activities/${id}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void> {
    return this.client.delete(`/api/activities/${id}/rates/${rateId}`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team> {
    return this.client.post<Team>(`/api/activities/${id}/team`, { body: input });
  }
}
