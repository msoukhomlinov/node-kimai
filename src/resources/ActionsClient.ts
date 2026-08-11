// ActionsClient - Actions resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { PageAction } from '../types';

import type { ApiClient } from '../client';

export type ActionResource = 'activity' | 'customer' | 'project' | 'timesheet';

export class ActionsClient {
  constructor(private client: ApiClient) {}

  async getActions(
    resource: ActionResource,
    id: number,
    view: string,
    locale: string,
  ): Promise<PageAction[]> {
    return this.client.get<PageAction[]>(`/api/actions/${resource}/${id}/${view}/${locale}`);
  }
}
