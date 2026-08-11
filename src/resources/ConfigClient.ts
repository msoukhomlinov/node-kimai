// ConfigClient - Config resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { TimesheetConfig } from '../types';

import type { ApiClient } from '../client';

export class ConfigClient {
  constructor(private client: ApiClient) {}

  async getTimesheetConfig(): Promise<TimesheetConfig> {
    return this.client.get<TimesheetConfig>('/api/config/timesheet');
  }

  async getColors(): Promise<Record<string, string>> {
    return this.client.get<Record<string, string>>('/api/config/colors');
  }
}
