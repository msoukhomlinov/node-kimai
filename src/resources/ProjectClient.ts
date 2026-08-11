// ProjectClient - Project resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  Project,
  ProjectEntity,
  ProjectEditForm,
  ProjectRate,
  ProjectRateForm,
  ProjectListParams,
  Comment,
  CommentForm,
  Team,
} from '../types';

import type { ApiClient } from '../client';

export class ProjectClient {
  constructor(private client: ApiClient) {}

  async list(params?: ProjectListParams): Promise<Project[]> {
    return this.client.get<Project[]>('/api/projects', { query: params });
  }

  async getAll(params?: ProjectListParams): Promise<Project[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<Project> {
    return this.client.get<Project>(`/api/projects/${id}`);
  }

  async create(input: ProjectEditForm): Promise<ProjectEntity> {
    return this.client.post<ProjectEntity>('/api/projects', { body: input });
  }

  async update(id: number, input: ProjectEditForm): Promise<Project> {
    return this.client.patch<Project>(`/api/projects/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/projects/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Project> {
    return this.client.patch<Project>(`/api/projects/${id}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<ProjectRate[]> {
    return this.client.get<ProjectRate[]>(`/api/projects/${id}/rates`);
  }

  async createRate(id: number, input: ProjectRateForm): Promise<ProjectRate> {
    return this.client.post<ProjectRate>(`/api/projects/${id}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void> {
    return this.client.delete(`/api/projects/${id}/rates/${rateId}`);
  }

  async listComments(id: number): Promise<Comment[]> {
    return this.client.get<Comment[]>(`/api/projects/${id}/comments`);
  }

  async createComment(id: number, input: CommentForm): Promise<Comment> {
    return this.client.post<Comment>(`/api/projects/${id}/comments`, { body: input });
  }

  async deleteComment(id: number, commentId: number): Promise<void> {
    return this.client.delete(`/api/projects/${id}/comments/${commentId}`);
  }

  async pinComment(id: number, commentId: number): Promise<Comment> {
    return this.client.patch<Comment>(`/api/projects/${id}/comments/${commentId}/pin`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team> {
    return this.client.post<Team>(`/api/projects/${id}/team`, { body: input });
  }
}
