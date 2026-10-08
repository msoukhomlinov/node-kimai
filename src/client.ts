// Base ApiClient with injectable transport
// DO NOT EDIT MANUALLY

import { createApiError, KimaiConfigError, type ApiError } from 'node-kimai/errors';
import { assertSafeRequestPath } from './guards';
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
  /**
   * Optional caller-composed abort signal (issue #7): the effective deadline and/or an
   * external abort, already combined. Transports that issue network calls SHOULD honour
   * it; `FetchTransport` does, and turns an aborted or unreachable request into a typed
   * `ApiError` (`timeout` / `network`).
   */
  signal?: AbortSignal;
}

/**
 * Per-request options accepted by every `ApiClient` verb (`get`, `post`, `patch`,
 * `delete`). All fields are optional; existing call sites are unchanged (issue #7).
 *
 * - `timeoutMs` — per-request deadline in ms. When set it REPLACES the constructor-level
 *   `timeoutMs` for this request (per-request wins). Must be a positive finite number;
 *   anything else throws `KimaiConfigError` before any wire activity.
 * - `signal` — an external `AbortSignal` for caller-side cancellation. It is combined
 *   with the effective deadline (when set) and the combined signal reaches the transport
 *   on `TransportRequest.signal`. Aborting — by the deadline or by this signal — rejects
 *   the request with a typed `ApiError` (category `timeout`, code `TIMEOUT`).
 */
export interface ClientRequestOptions {
  query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>;
  body?: unknown;
  responseType?: 'json' | 'arraybuffer' | 'text';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

/**
 * Classify a fetch rejection that produced no response (issue #7):
 * - the request signal aborted → typed `timeout` error (code `TIMEOUT`): a deadline
 *   abort (`AbortSignal.timeout` sets a `TimeoutError` reason) and an external caller
 *   abort share the shape; the message distinguishes the two;
 * - otherwise → a network failure: typed `network` error (code `NETWORK`) carrying the
 *   original error under `data`.
 *
 * Non-HTTP failures use the errors module's `status: 0` convention (see
 * `KimaiConfigError`); `request` carries the full URL, like the HTTP error path.
 */
function transportFailure(
  err: unknown,
  request: string,
  signal: AbortSignal | undefined,
  correlationId: string,
): ApiError {
  if (signal?.aborted) {
    const byDeadline = isTimeoutReason(signal.reason);
    return createApiError({
      status: 0,
      message: byDeadline
        ? 'The request to the Kimai instance timed out.'
        : 'The request was aborted before the Kimai instance responded.',
      code: 'TIMEOUT',
      category: 'timeout',
      retryable: true,
      request,
      correlationId,
      suggestedAction: 'Retry the call; if timeouts persist, check the Kimai instance and the network path.',
    });
  }

  const causeText = rootCauseMessage(err);
  return createApiError({
    status: 0,
    message: causeText
      ? `The Kimai API could not be reached (network failure: ${causeText}).`
      : 'The Kimai API could not be reached (network failure).',
    code: 'NETWORK',
    category: 'network',
    retryable: true,
    data: err,
    request,
    correlationId,
    suggestedAction: 'Check connectivity to the Kimai instance and retry.',
  });
}

/** True for a `timeoutMs` that is a positive finite number of milliseconds. */
function assertPositiveTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new KimaiConfigError('timeoutMs must be a positive finite number of milliseconds.');
  }
}

/**
 * True when a signal's abort reason is the one that marks a deadline expiry (a
 * `TimeoutError`). The composed deadline signal carries an explicit `TimeoutError`
 * reason set by `composeSignal`; a caller abort carries the caller's own reason (or
 * its signal), which never classifies as a deadline.
 */
function isTimeoutReason(reason: unknown): boolean {
  if (reason === null || typeof reason !== 'object') return false;
  return (reason as { name?: unknown }).name === 'TimeoutError';
}

/** The innermost message of a fetch/undici failure chain (for the network error text). */
function rootCauseMessage(err: unknown): string | undefined {
  let message: string | undefined;
  let current: unknown = err;
  const seen = new Set<unknown>();
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message.length > 0) message = current.message;
    current = (current as { cause?: unknown }).cause;
  }
  return message;
}

export class FetchTransport implements HttpTransport {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async request<T>(options: TransportRequest): Promise<T> {
    assertSafeRequestPath(options.path);
    // Append the path to the base (never resolve it), so a base sub-path such as `/kimai` is kept.
    const url = new URL(this.baseUrl.replace(/\/+$/, '') + '/' + options.path.replace(/^\//, ''));
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

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body,
        signal: options.signal,
      });
    } catch (err) {
      // issue #7: a rejection without a response is either an abort (deadline or external
      // signal) or a network failure — both surface as TYPED ApiErrors, never raw fetch
      // errors. `request` carries the full URL, consistent with the HTTP error path.
      throw transportFailure(err, url.toString(), options.signal, correlationId);
    }

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

    // issue #7: the body phase is guarded like the fetch call — a mid-body abort is a
    // typed timeout error. Non-abort consumption failures keep today's pass-through
    // (a malformed body is a contract problem, not a network one).
    const consume = async (): Promise<T> => {
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
    };

    try {
      return await consume();
    } catch (err) {
      if (options.signal?.aborted) {
        throw transportFailure(err, url.toString(), options.signal, correlationId);
      }
      throw err;
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
  /**
   * Default request deadline in ms (issue #7). When set, every request that does not
   * pass a per-request `timeoutMs` aborts after this deadline and rejects with a typed
   * `ApiError` (category `timeout`, code `TIMEOUT`). Default: no timeout — requests run
   * indefinitely, exactly as before. Must be a positive finite number; otherwise the
   * constructor throws `KimaiConfigError` (zero wire activity).
   */
  timeoutMs?: number;
}

export class ApiClient {
  readonly baseUrl: string;
  readonly token: string;
  /** Default request deadline in ms (`undefined` = no timeout). See `ApiClientOptions`. */
  readonly timeoutMs: number | undefined;
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
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
      throw new KimaiConfigError('ApiClient: timeoutMs must be a positive finite number of milliseconds.');
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs;
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

  async get<T>(path: string, options?: ClientRequestOptions): Promise<T> {
    assertSafeRequestPath(path);
    return this.transport.request<T>({
      method: 'GET',
      path,
      query: options?.query,
      responseType: options?.responseType,
      signal: this.composeSignal(options),
    });
  }

  async post<T>(path: string, options?: ClientRequestOptions): Promise<T> {
    assertSafeRequestPath(path);
    return this.transport.request<T>({
      method: 'POST',
      path,
      query: options?.query,
      body: options?.body,
      signal: this.composeSignal(options),
    });
  }

  async patch<T>(path: string, options?: ClientRequestOptions): Promise<T> {
    assertSafeRequestPath(path);
    return this.transport.request<T>({
      method: 'PATCH',
      path,
      query: options?.query,
      body: options?.body,
      signal: this.composeSignal(options),
    });
  }

  async delete(path: string, options?: ClientRequestOptions): Promise<void> {
    assertSafeRequestPath(path);
    await this.transport.request<void>({
      method: 'DELETE',
      path,
      query: options?.query,
      body: options?.body,
      signal: this.composeSignal(options),
    });
  }

  /**
   * Combine the effective deadline — the per-request `timeoutMs` wins over the
   * constructor value — with an external per-request signal into the single
   * `AbortSignal` passed on `TransportRequest.signal` (issue #7). Returns `undefined`
   * when neither is set: the request then runs with no deadline, exactly as before.
   *
   * A single active input is returned as-is (a bare `AbortSignal.timeout` or the
   * caller signal), so the fast paths behave exactly as before. With both a deadline
   * and a caller signal present, a composed `AbortController` is used instead: each
   * input forwards its abort into the controller, and the deadline is armed as an
   * owned `AbortSignal.timeout` whose abort carries an explicit `TimeoutError`
   * reason, so the deadline always classifies as a timeout even on runtimes where
   * `AbortSignal.timeout` leaves `reason` unset. The combined signal therefore
   * aborts on the EARLIEST of the inputs — a caller abort at t < deadline rejects
   * immediately, never later — and `isTimeoutReason` can tell the two apart.
   */
  private composeSignal(per: ClientRequestOptions | undefined): AbortSignal | undefined {
    const timeoutMs = per?.timeoutMs ?? this.timeoutMs;
    const callerSignal = per?.signal;
    if (timeoutMs === undefined && callerSignal === undefined) return undefined;
    if (timeoutMs === undefined) return callerSignal; // caller signal only: pass through untouched
    if (callerSignal === undefined) {
      // deadline only: bare AbortSignal.timeout, exactly as before
      assertPositiveTimeout(timeoutMs);
      return AbortSignal.timeout(timeoutMs);
    }

    // Combined flow: deadline + caller signal -> one composed controller.
    assertPositiveTimeout(timeoutMs);
    const controller = new AbortController();
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason ?? callerSignal);
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason ?? callerSignal), { once: true });
    }
    const deadline = AbortSignal.timeout(timeoutMs);
    const onDeadline = () =>
      controller.abort(new DOMException(`The Kimai request timed out after ${timeoutMs}ms`, 'TimeoutError'));
    if (deadline.aborted) {
      onDeadline();
    } else {
      deadline.addEventListener('abort', onDeadline, { once: true });
    }
    return controller.signal;
  }
}
