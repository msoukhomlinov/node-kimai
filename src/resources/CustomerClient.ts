// CustomerClient - Customer resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  Customer,
  CustomerEntity,
  CustomerEditForm,
  CustomerRate,
  CustomerRateForm,
  CustomerListParams,
  Comment,
  CommentForm,
  Team,
} from '../types';

import type { ApiClient } from '../client';

export class CustomerClient {
  constructor(private client: ApiClient) {}

  async list(params?: CustomerListParams): Promise<Customer[]> {
    return this.client.get<Customer[]>('/api/customers', { query: params });
  }

  async getAll(params?: CustomerListParams): Promise<Customer[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<Customer> {
    return this.client.get<Customer>(`/api/customers/${id}`);
  }

  async create(input: CustomerEditForm): Promise<CustomerEntity> {
    return this.client.post<CustomerEntity>('/api/customers', { body: input });
  }

  async update(id: number, input: CustomerEditForm): Promise<Customer> {
    return this.client.patch<Customer>(`/api/customers/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/customers/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Customer> {
    return this.client.patch<Customer>(`/api/customers/${id}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<CustomerRate[]> {
    return this.client.get<CustomerRate[]>(`/api/customers/${id}/rates`);
  }

  async createRate(id: number, input: CustomerRateForm): Promise<CustomerRate> {
    return this.client.post<CustomerRate>(`/api/customers/${id}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void> {
    return this.client.delete(`/api/customers/${id}/rates/${rateId}`);
  }

  async listComments(id: number): Promise<Comment[]> {
    return this.client.get<Comment[]>(`/api/customers/${id}/comments`);
  }

  async createComment(id: number, input: CommentForm): Promise<Comment> {
    return this.client.post<Comment>(`/api/customers/${id}/comments`, { body: input });
  }

  async deleteComment(id: number, commentId: number): Promise<void> {
    return this.client.delete(`/api/customers/${id}/comments/${commentId}`);
  }

  async pinComment(id: number, commentId: number): Promise<Comment> {
    return this.client.patch<Comment>(`/api/customers/${id}/comments/${commentId}/pin`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team> {
    return this.client.post<Team>(`/api/customers/${id}/team`, { body: input });
  }
}
