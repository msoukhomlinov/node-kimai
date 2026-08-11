// ExportClient - Export resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { ApiClient } from '../client';

export class ExportClient {
  constructor(private client: ApiClient) {}

  async deleteTemplate(templateId: number): Promise<void> {
    return this.client.delete(`/api/export/${templateId}`);
  }
}
