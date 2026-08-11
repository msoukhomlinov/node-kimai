// TeamClient - Team resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { Team, TeamEditForm, TeamListParams } from '../types';

import type { ApiClient } from '../client';

export class TeamClient {
  constructor(private client: ApiClient) {}

  async list(params?: TeamListParams): Promise<Team[]> {
    return this.client.get<Team[]>('/api/teams', { query: params });
  }

  async getAll(params?: TeamListParams): Promise<Team[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<Team> {
    return this.client.get<Team>(`/api/teams/${id}`);
  }

  async create(input: TeamEditForm): Promise<Team> {
    return this.client.post<Team>('/api/teams', { body: input });
  }

  async update(id: number, input: TeamEditForm): Promise<Team> {
    return this.client.patch<Team>(`/api/teams/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/teams/${id}`);
  }

  async addMember(teamId: number, userId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/members/${userId}`);
  }

  async removeMember(teamId: number, userId: number): Promise<void> {
    return this.client.delete(`/api/teams/${teamId}/members/${userId}`);
  }

  async grantCustomerAccess(teamId: number, customerId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/customers/${customerId}`);
  }

  async revokeCustomerAccess(teamId: number, customerId: number): Promise<void> {
    return this.client.delete(`/api/teams/${teamId}/customers/${customerId}`);
  }

  async grantProjectAccess(teamId: number, projectId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/projects/${projectId}`);
  }

  async revokeProjectAccess(teamId: number, projectId: number): Promise<void> {
    return this.client.delete(`/api/teams/${teamId}/projects/${projectId}`);
  }

  async grantActivityAccess(teamId: number, activityId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/activities/${activityId}`);
  }

  async revokeActivityAccess(teamId: number, activityId: number): Promise<void> {
    return this.client.delete(`/api/teams/${teamId}/activities/${activityId}`);
  }
}
