// SystemClient - System/info operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { Version, Plugin } from '../types';

import type { ApiClient } from '../client';

export class SystemClient {
  constructor(private client: ApiClient) {}

  async ping(): Promise<boolean> {
    const result = await this.client.get<unknown[]>('/api/ping');
    return result !== null && result !== undefined;
  }

  async pingRaw(): Promise<unknown[]> {
    return this.client.get<unknown[]>('/api/ping');
  }

  async getVersion(): Promise<Version> {
    return this.client.get<Version>('/api/version');
  }

  async getPlugins(): Promise<Plugin[]> {
    return this.client.get<Plugin[]>('/api/plugins');
  }
}
