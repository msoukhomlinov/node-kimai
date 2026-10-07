// Base ApiClient with injectable transport
// DO NOT EDIT MANUALLY

import { createApiError } from './errors';
import { ActivityClient } from './resources/ActivityClient';
import { CustomerClient } from './resources/CustomerClient';
import { ProjectClient } from './resources/ProjectClient';
import { TimesheetClient } from './resources/TimesheetClient';
import { UserClient } from './resources/UserClient';
import { TagClient } from './resources/TagClient';
import { TeamClient } from './resources/TeamClient';
import { InvoiceClient } from './resources/InvoiceClient';
import { ApprovalBundleClient } from './resources/ApprovalBundleClient';
import { ConfigClient } from './resources/ConfigClient';
import { SystemClient } from './resources/SystemClient';
import { ExportClient } from './resources/ExportClient';
import { ActionsClient } from './resources/ActionsClient';

export interface TransportRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'text';
}

export interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

export class FetchTransport implements HttpTransport {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async request<T>(options: TransportRequest): Promise<T> {
    const url = new URL(options.path, this.baseUrl);
    // Phase F: one correlation id per request (policy §7.3), surfaced on errors.
    const correlationId = crypto.randomUUID();

    // Build query string
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, String(v));
          }
        } else if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...(options.headers || {}),
    };

    let body: string | null | undefined;
    if (options.body !== undefined && options.body !== null) {
      if (options.method === 'GET' || options.method === 'DELETE') {
        for (const [key, value] of Object.entries(options.body as Record<string, unknown>)) {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        }
      } else {
        body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      let message = `HTTP ${response.status}: ${response.statusText}`;
      if (typeof errorData === 'object' && errorData !== null) {
        const data = errorData as Record<string, unknown>;
        if (typeof data.message === 'string') {
          message = data.message;
        } else if (typeof data.title === 'string') {
          message = data.title;
        }
      }

      throw createApiError({
        status: response.status,
        message,
        data: errorData,
        request: url.toString(),
        // Phase F (additive): the structured contract on transport errors.
        vendorError: errorData,
        correlationId,
        retryAfter: parseRetryAfter(response.headers.get('retry-after')),
      });
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    if (options.responseType === 'arraybuffer') {
      return response.arrayBuffer() as Promise<T>;
    }

    if (options.responseType === 'text') {
      return response.text() as Promise<T>;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}

/**
 * Parse a `Retry-After` header value (policy §8: surfaced as `retryAfter` on
 * 429). Accepts the two RFC 9110 forms: delta-seconds, or an HTTP-date
 * (converted to the whole seconds still to wait, clamped at 0).
 */
export function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim().length === 0) return undefined;
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds)) {
    return Math.max(0, Math.floor(asSeconds));
  }
  const asDate = Date.parse(value);
  if (Number.isNaN(asDate)) return undefined;
  return Math.max(0, Math.floor((asDate - Date.now()) / 1000));
}

export interface ApiClientOptions {
  baseUrl: string;
  token: string;
  transport?: HttpTransport;
}

export class ApiClient {
  readonly baseUrl: string;
  readonly token: string;
  private transport: HttpTransport;

  readonly activities: ActivityClient;
  readonly customers: CustomerClient;
  readonly projects: ProjectClient;
  readonly timesheets: TimesheetClient;
  readonly users: UserClient;
  readonly tags: TagClient;
  readonly teams: TeamClient;
  readonly invoices: InvoiceClient;
  readonly approvalBundle: ApprovalBundleClient;
  readonly config: ConfigClient;
  readonly system: SystemClient;
  readonly export: ExportClient;
  readonly actions: ActionsClient;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.transport = options.transport || new FetchTransport(this.baseUrl, this.token);

    this.activities = new ActivityClient(this);
    this.customers = new CustomerClient(this);
    this.projects = new ProjectClient(this);
    this.timesheets = new TimesheetClient(this);
    this.users = new UserClient(this);
    this.tags = new TagClient(this);
    this.teams = new TeamClient(this);
    this.invoices = new InvoiceClient(this);
    this.approvalBundle = new ApprovalBundleClient(this);
    this.config = new ConfigClient(this);
    this.system = new SystemClient(this);
    this.export = new ExportClient(this);
    this.actions = new ActionsClient(this);
  }

  async get<T>(path: string, options?: { query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>; responseType?: 'json' | 'arraybuffer' | 'text' }): Promise<T> {
    return this.transport.request<T>({ method: 'GET', path, query: options?.query, responseType: options?.responseType });
  }

  async post<T>(path: string, options?: { query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>; body?: unknown }): Promise<T> {
    return this.transport.request<T>({ method: 'POST', path, query: options?.query, body: options?.body });
  }

  async patch<T>(path: string, options?: { query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>; body?: unknown }): Promise<T> {
    return this.transport.request<T>({ method: 'PATCH', path, query: options?.query, body: options?.body });
  }

  async delete(path: string, options?: { query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>; body?: unknown }): Promise<void> {
    await this.transport.request<void>({ method: 'DELETE', path, query: options?.query, body: options?.body });
  }
}
