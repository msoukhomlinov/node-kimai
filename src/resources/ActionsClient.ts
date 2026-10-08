// ActionsClient - Actions resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { PageAction } from '../types';

import type { ApiClient } from '../client';
import { KimaiConfigError } from 'node-kimai/errors';
import { pathId, pathToken } from '../guards';

export type ActionResource = 'activity' | 'customer' | 'project' | 'timesheet';

const ACTION_RESOURCES: readonly string[] = ['activity', 'customer', 'project', 'timesheet'];

export class ActionsClient {
  constructor(private client: ApiClient) {}

  async getActions(
    resource: ActionResource,
    id: number,
    view: string,
    locale: string,
  ): Promise<PageAction[]> {
    if (!ACTION_RESOURCES.includes(resource)) {
      throw new KimaiConfigError(`resource must be one of ${ACTION_RESOURCES.join(', ')}. No request was issued.`);
    }
    return this.client.get<PageAction[]>(
      `/api/actions/${resource}/${pathId(id)}/${pathToken(view, 'view')}/${pathToken(locale, 'locale')}`,
    );
  }
}
