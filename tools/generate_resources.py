#!/usr/bin/env python3
"""
node-kimai SDK Generator - Resource Clients
Generates resource client classes from OpenAPI spec.
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC_CANDIDATES = [
    ROOT / "api-docs.json",
    "/Users/maxs/gitrepos/n8n/n8n-nodes-kimai-pro/api-docs-v1.1.json",
]
SPEC_PATH = next(str(p) for p in SPEC_CANDIDATES if os.path.exists(p))
SRC = ROOT / "src"
RESOURCES_DIR = SRC / "resources"

with open(SPEC_PATH) as f:
    spec = json.load(f)

paths = spec.get("paths", {})


def generate_activity_client():
    content = """// ActivityClient - Activity resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  Activity,
  ActivityEntity,
  ActivityEditForm,
  ActivityRate,
  ActivityRateForm,
  ActivityListParams,
  Team,
} from '../types';

import type { ApiClient } from '../client';

export class ActivityClient {
  constructor(private client: ApiClient) {}

  async list(params?: ActivityListParams): Promise<Activity[]> {
    return this.client.get<Activity[]>('/api/activities', { query: params });
  }

  async getAll(params?: ActivityListParams): Promise<Activity[]> {
    return this.list(params);
  }

  async getById(id: number): Promise<Activity> {
    return this.client.get<Activity>(`/api/activities/${id}`);
  }

  async create(input: ActivityEditForm): Promise<ActivityEntity> {
    return this.client.post<ActivityEntity>('/api/activities', { body: input });
  }

  async update(id: number, input: ActivityEditForm): Promise<Activity> {
    return this.client.patch<Activity>(`/api/activities/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/activities/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Activity> {
    return this.client.patch<Activity>(`/api/activities/${id}/meta`, { body: meta });
  }

  async getRates(id: number): Promise<ActivityRate[]> {
    return this.client.get<ActivityRate[]>(`/api/activities/${id}/rates`);
  }

  async createRate(id: number, input: ActivityRateForm): Promise<ActivityRate> {
    return this.client.post<ActivityRate>(`/api/activities/${id}/rates`, { body: input });
  }

  async deleteRate(id: number, rateId: number): Promise<void> {
    return this.client.delete(`/api/activities/${id}/rates/${rateId}`);
  }

  async addToTeam(id: number, input: { teams?: number[] }): Promise<Team> {
    return this.client.post<Team>(`/api/activities/${id}/team`, { body: input });
  }
}
"""
    with open(RESOURCES_DIR / "ActivityClient.ts", "w") as f:
        f.write(content)
    print("  Generated ActivityClient.ts")


def generate_customer_client():
    content = """// CustomerClient - Customer resource operations
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
"""
    with open(RESOURCES_DIR / "CustomerClient.ts", "w") as f:
        f.write(content)
    print("  Generated CustomerClient.ts")


def generate_project_client():
    content = """// ProjectClient - Project resource operations
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
"""
    with open(RESOURCES_DIR / "ProjectClient.ts", "w") as f:
        f.write(content)
    print("  Generated ProjectClient.ts")


def generate_timesheet_client():
    content = """// TimesheetClient - Timesheet resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  TimesheetEntity as Timesheet,
  TimesheetEditForm,
  TimesheetListParams,
} from '../types';

import type { ApiClient } from '../client';

export class TimesheetClient {
  constructor(private client: ApiClient) {}

  async list(params?: TimesheetListParams): Promise<Timesheet[]> {
    const query = { ...params };
    // User-filter override: if no user filter given, fetch ALL users
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    return this.client.get<Timesheet[]>('/api/timesheets', { query });
  }

  async getAll(params?: TimesheetListParams): Promise<Timesheet[]> {
    const query = { ...params };
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    const pages: Timesheet[] = [];
    let page = query.page || 1;
    const size = query.size || 100;

    while (true) {
      const results = await this.client.get<Timesheet[]>('/api/timesheets', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      pages.push(...results);
      if (results.length < size) break;
      page++;
    }
    return pages;
  }

  /**
   * Page stream for `for await (const page of client.timesheets.listPages())`.
   * Declared non-async so the public type is `AsyncIterable<Timesheet[]>`, not
   * `AsyncGenerator` (line convention shared with node-hudu/node-autotask).
   */
  listPages(params?: TimesheetListParams): AsyncIterable<Timesheet[]> {
    return this.collectPages(params);
  }

  private async *collectPages(params?: TimesheetListParams): AsyncGenerator<Timesheet[]> {
    const query = { ...params };
    if (!query.user && !query.users) {
      query.user = 'all';
    }
    const size = query.size || 100;
    let page = query.page || 1;

    while (true) {
      const results = await this.client.get<Timesheet[]>('/api/timesheets', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      yield results;
      if (results.length < size) break;
      page++;
    }
  }

  async getById(id: number): Promise<Timesheet> {
    return this.client.get<Timesheet>(`/api/timesheets/${id}`);
  }

  async create(input: TimesheetEditForm): Promise<Timesheet> {
    return this.client.post<Timesheet>('/api/timesheets', { body: input });
  }

  async update(id: number, input: TimesheetEditForm): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}`, { body: input });
  }

  async delete(id: number): Promise<void> {
    return this.client.delete(`/api/timesheets/${id}`);
  }

  async updateMeta(id: number, meta: Record<string, unknown>): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/meta`, { body: meta });
  }

  async getActive(): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/active');
  }

  async getRecent(): Promise<Timesheet[]> {
    return this.client.get<Timesheet[]>('/api/timesheets/recent');
  }

  async stop(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/stop`);
  }

  async restart(id: number, input?: { begin?: string }): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/restart`, { body: input });
  }

  async duplicate(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/duplicate`);
  }

  async toggleExport(id: number): Promise<Timesheet> {
    return this.client.patch<Timesheet>(`/api/timesheets/${id}/export`);
  }
}
"""
    with open(RESOURCES_DIR / "TimesheetClient.ts", "w") as f:
        f.write(content)
    print("  Generated TimesheetClient.ts")


def generate_user_client():
    content = """// UserClient - User resource operations
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

  async getMe(): Promise<UserEntity> {
    return this.client.get<UserEntity>('/api/users/me');
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
"""
    with open(RESOURCES_DIR / "UserClient.ts", "w") as f:
        f.write(content)
    print("  Generated UserClient.ts")


def generate_tag_client():
    content = """// TagClient - Tag resource operations
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
"""
    with open(RESOURCES_DIR / "TagClient.ts", "w") as f:
        f.write(content)
    print("  Generated TagClient.ts")


def generate_team_client():
    content = """// TeamClient - Team resource operations
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

  async removeMember(teamId: number, userId: number): Promise<Team> {
    return this.client.delete(`/api/teams/${teamId}/members/${userId}`);
  }

  async grantCustomerAccess(teamId: number, customerId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/customers/${customerId}`);
  }

  async revokeCustomerAccess(teamId: number, customerId: number): Promise<Team> {
    return this.client.delete(`/api/teams/${teamId}/customers/${customerId}`);
  }

  async grantProjectAccess(teamId: number, projectId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/projects/${projectId}`);
  }

  async revokeProjectAccess(teamId: number, projectId: number): Promise<Team> {
    return this.client.delete(`/api/teams/${teamId}/projects/${projectId}`);
  }

  async grantActivityAccess(teamId: number, activityId: number): Promise<Team> {
    return this.client.post<Team>(`/api/teams/${teamId}/activities/${activityId}`);
  }

  async revokeActivityAccess(teamId: number, activityId: number): Promise<Team> {
    return this.client.delete(`/api/teams/${teamId}/activities/${activityId}`);
  }
}
"""
    with open(RESOURCES_DIR / "TeamClient.ts", "w") as f:
        f.write(content)
    print("  Generated TeamClient.ts")


def generate_invoice_client():
    content = """// InvoiceClient - Invoice resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { Invoice, InvoiceMeta, InvoiceListParams } from '../types';

import type { ApiClient } from '../client';

export class InvoiceClient {
  constructor(private client: ApiClient) {}

  async list(params?: InvoiceListParams): Promise<Invoice[]> {
    return this.client.get<Invoice[]>('/api/invoices', { query: params });
  }

  async getAll(params?: InvoiceListParams): Promise<Invoice[]> {
    const query = { ...params };
    const pages: Invoice[] = [];
    let page = query.page || 1;
    const size = query.size || 100;

    while (true) {
      const results = await this.client.get<Invoice[]>('/api/invoices', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      pages.push(...results);
      if (results.length < size) break;
      page++;
    }
    return pages;
  }

  /**
   * Page stream for `for await (const page of client.invoices.listPages())`.
   * Declared non-async so the public type is `AsyncIterable<Invoice[]>`, not
   * `AsyncGenerator` (line convention shared with node-hudu/node-autotask).
   */
  listPages(params?: InvoiceListParams): AsyncIterable<Invoice[]> {
    return this.collectPages(params);
  }

  private async *collectPages(params?: InvoiceListParams): AsyncGenerator<Invoice[]> {
    const query = { ...params };
    const size = query.size || 100;
    let page = query.page || 1;

    while (true) {
      const results = await this.client.get<Invoice[]>('/api/invoices', {
        query: { ...query, page, size },
      });
      if (!results || results.length === 0) break;
      yield results;
      if (results.length < size) break;
      page++;
    }
  }

  async getById(id: number): Promise<Invoice> {
    return this.client.get<Invoice>(`/api/invoices/${id}`);
  }

  async updateCustomFields(id: number, fields: InvoiceMeta[]): Promise<Invoice> {
    return this.client.patch<Invoice>(`/api/invoices/${id}/custom-fields`, { body: fields });
  }
}
"""
    with open(RESOURCES_DIR / "InvoiceClient.ts", "w") as f:
        f.write(content)
    print("  Generated InvoiceClient.ts")


def generate_approval_bundle_client():
    content = """// ApprovalBundleClient - Approval bundle operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type {
  ApprovalWeekStatus,
  ApprovalOvertimeYear,
  ApprovalWeeklyOvertime,
} from '../types';

import type { ApiClient } from '../client';

export class ApprovalBundleClient {
  constructor(private client: ApiClient) {}

  async addToApprove(params: { user?: number; date: string }): Promise<string> {
    return this.client.post<string>('/api/approval-bundle/add_to_approve', { query: params });
  }

  async nextWeek(params?: { user?: number }): Promise<ApprovalWeekStatus> {
    return this.client.get<ApprovalWeekStatus>('/api/approval-bundle/next-week', { query: params });
  }

  async weekStatus(params: { user?: number; date: string }): Promise<ApprovalWeekStatus> {
    return this.client.get<ApprovalWeekStatus>('/api/approval-bundle/week-status', { query: params });
  }

  async overtimeYear(params: { user?: number; date: string }): Promise<ApprovalOvertimeYear> {
    return this.client.get<ApprovalOvertimeYear>('/api/approval-bundle/overtime_year', { query: params });
  }

  async weeklyOvertime(params: { user?: number; date: string }): Promise<ApprovalWeeklyOvertime[]> {
    return this.client.get<ApprovalWeeklyOvertime[]>('/api/approval-bundle/weekly_overtime', { query: params });
  }
}
"""
    with open(RESOURCES_DIR / "ApprovalBundleClient.ts", "w") as f:
        f.write(content)
    print("  Generated ApprovalBundleClient.ts")


def generate_config_client():
    content = """// ConfigClient - Config resource operations
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
"""
    with open(RESOURCES_DIR / "ConfigClient.ts", "w") as f:
        f.write(content)
    print("  Generated ConfigClient.ts")


def generate_system_client():
    content = """// SystemClient - System/info operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { Version, Plugin } from '../types';

import type { ApiClient } from '../client';

export class SystemClient {
  constructor(private client: ApiClient) {}

  async ping(): Promise<boolean> {
    const result = await this.client.get<unknown[]>('/api/ping');
    return result !== null && result !== undefined;
  }

  async getVersion(): Promise<Version> {
    return this.client.get<Version>('/api/version');
  }

  async getPlugins(): Promise<Plugin[]> {
    return this.client.get<Plugin[]>('/api/plugins');
  }
}
"""
    with open(RESOURCES_DIR / "SystemClient.ts", "w") as f:
        f.write(content)
    print("  Generated SystemClient.ts")


def generate_export_client():
    content = """// ExportClient - Export resource operations
// DO NOT EDIT MANUALLY - Generated from OpenAPI spec

import type { ApiClient } from '../client';

export class ExportClient {
  constructor(private client: ApiClient) {}

  async deleteTemplate(templateId: number): Promise<void> {
    return this.client.delete(`/api/export/${templateId}`);
  }
}
"""
    with open(RESOURCES_DIR / "ExportClient.ts", "w") as f:
        f.write(content)
    print("  Generated ExportClient.ts")


def generate_actions_client():
    content = """// ActionsClient - Actions resource operations
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
"""
    with open(RESOURCES_DIR / "ActionsClient.ts", "w") as f:
        f.write(content)
    print("  Generated ActionsClient.ts")


def generate_resources_barrel():
    barrel = """// Barrel export for all resource clients
// DO NOT EDIT MANUALLY

export { ActivityClient } from './ActivityClient';
export { CustomerClient } from './CustomerClient';
export { ProjectClient } from './ProjectClient';
export { TimesheetClient } from './TimesheetClient';
export { UserClient } from './UserClient';
export { TagClient } from './TagClient';
export { TeamClient } from './TeamClient';
export { InvoiceClient } from './InvoiceClient';
export { ApprovalBundleClient } from './ApprovalBundleClient';
export { ConfigClient } from './ConfigClient';
export { SystemClient } from './SystemClient';
export { ExportClient } from './ExportClient';
export { ActionsClient } from './ActionsClient';
"""
    with open(RESOURCES_DIR / "index.ts", "w") as f:
        f.write(barrel)
    print("  Generated resources/index.ts")


# Run all generators
print("Generating resource clients...")
generate_activity_client()
generate_customer_client()
generate_project_client()
generate_timesheet_client()
generate_user_client()
generate_tag_client()
generate_team_client()
generate_invoice_client()
generate_approval_bundle_client()
generate_config_client()
generate_system_client()
generate_export_client()
generate_actions_client()
generate_resources_barrel()
print("\nResource clients generation complete!")
