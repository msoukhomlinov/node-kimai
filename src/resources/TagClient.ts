// TagClient - Tag resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { TagEntity as Tag, TagEditForm } from '../types';

import type { ApiClient } from '../client';

export class TagClient {
  constructor(private client: ApiClient) {}

  async list(): Promise<Tag[]> {
    return this.client.get<Tag[]>('/api/tags');
  }

  async getAll(): Promise<Tag[]> {
    return this.list();
  }

  async create(input: TagEditForm): Promise<Tag> {
    return this.client.post<Tag>('/api/tags', { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/tags/${id}`);
  }

  async find(name: string): Promise<Tag[]> {
    return this.client.get<Tag[]>('/api/tags/find', { query: { name } });
  }
}
