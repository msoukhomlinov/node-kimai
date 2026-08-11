// UserClient - User resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  User,
  UserEntity,
  UserEditForm,
  UserCreateForm,
  UserPreference,
  UserListParams,
} from '../types';

import type { ApiClient } from '../client';

export class UserClient {
  constructor(private client: ApiClient) {}

  async list(params?: UserListParams): Promise<User[]> {
    return this.client.get<User[]>('/api/users', { query: params });
  }

  async getAll(params?: UserListParams): Promise<User[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<User> {
    return this.client.get<User>(`/api/users/${id}`);
  }

  async getMe(): Promise<User> {
    return this.client.get<User>('/api/users/me');
  }

  async create(input: UserCreateForm): Promise<UserEntity> {
    return this.client.post<UserEntity>('/api/users', { body: input });
  }

  async update(id: number, input: UserEditForm): Promise<User> {
    return this.client.patch<User>(`/api/users/${id}`, { body: input });
  }

  async updatePreferences(id: number, prefs: UserPreference[]): Promise<User> {
    return this.client.patch<User>(`/api/users/${id}/preferences`, { body: prefs });
  }

  async deleteApiToken(tokenId: number): Promise<void> {
    return this.client.delete(`/api/users/api-token/${tokenId}`);
  }
}
