// Typed error hierarchy for Kimai API
// DO NOT EDIT MANUALLY

// Phase F (agent execution layer): the structured error contract (policy §8).
// The additions below are additive — every pre-existing field (`status`, `data`,
// `request`, `code`) and class keeps working unchanged. `httpStatus` is the
// canonical field; `status` is kept as the legacy accessor. New stable machine
// codes are SCREAMING_SNAKE.

/** The closed category vocabulary of the structured error contract (policy §8). */
export type ErrorCategory =
  | 'auth'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limit'
  | 'server'
  | 'network'
  | 'timeout'
  | 'resolution'
  | 'policy';

export interface ApiErrorOptions {
  status: number;
  message: string;
  data?: unknown;
  request?: string;
  code?: string;
  /** Phase F (additive): the structured contract fields. */
  /** Closed category (policy §8); derived from the status when omitted. */
  category?: ErrorCategory;
  /** Registry operation name that failed (e.g. `timesheets.stop`). */
  operation?: string;
  /** Canonical HTTP status (same value as `status`; absent for non-HTTP errors). */
  httpStatus?: number;
  /** True when a caller may safely retry the same request. */
  retryable?: boolean;
  /** The raw vendor payload, preserved under a documented key. */
  vendorError?: unknown;
  /** Identifiers involved (target, candidates, parent). */
  resourceIds?: number[];
  /** Deterministic next step only — never invented advice. */
  suggestedAction?: string;
  /** One generated per request; surfaced on the error. */
  correlationId?: string;
  /** Seconds the server asked the client to wait (`Retry-After` on 429). */
  retryAfter?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly request: string;
  readonly code?: string;
  // Phase F (additive) — the structured contract (policy §8).
  readonly category: ErrorCategory;
  readonly operation?: string;
  readonly httpStatus?: number;
  readonly retryable: boolean;
  readonly vendorError?: unknown;
  readonly resourceIds?: number[];
  readonly suggestedAction?: string;
  readonly correlationId?: string;
  readonly retryAfter?: number;

  constructor({ status, message, data, request, code, category, operation, httpStatus, retryable, vendorError, resourceIds, suggestedAction, correlationId, retryAfter }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.request = request ?? '';
    this.code = code;
    this.category = category ?? categoryForStatus(status);
    this.operation = operation;
    this.httpStatus = httpStatus ?? status;
    this.retryable = retryable ?? retryableForStatus(status);
    this.vendorError = vendorError;
    this.resourceIds = resourceIds;
    this.suggestedAction = suggestedAction;
    this.correlationId = correlationId;
    this.retryAfter = retryAfter;
  }
}

/** The category a documented HTTP status maps to (policy §8 vocabulary). */
export function categoryForStatus(status: number): ErrorCategory {
  switch (status) {
    case 401:
    case 403:
      return 'auth';
    case 404:
      return 'not_found';
    case 409:
    case 412:
      return 'conflict';
    case 429:
      return 'rate_limit';
    case 400:
    case 422:
      return 'validation';
    default:
      return 'server';
  }
}

/** Whether a caller may safely retry a failed request of this status. */
export function retryableForStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** The SCREAMING_SNAKE machine code each documented class carries by default. */
export function defaultCodeForStatus(status: number): string | undefined {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
    case 412:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 && status < 600 ? 'SERVER_ERROR' : `HTTP_${status}`;
  }
}

/** The deterministic next step per documented status (never names the caller's own helper). */
export function suggestedActionForStatus(status: number): string | undefined {
  switch (status) {
    case 400:
    case 422:
      return 'Fix the request payload; see vendorError for the offending field.';
    case 401:
      return 'Check the API token and its scope.';
    case 403:
      return 'Verify the account permissions for this operation.';
    case 404:
      return 'Verify the id, or resolve the record from another identifier first.';
    case 409:
    case 412:
      return 'Re-read the record and retry with current values.';
    case 429:
      return 'Back off and retry; honour retryAfter (Retry-After) when present.';
    default:
      return status >= 500 ? 'Retry with backoff; the server error is transient.' : undefined;
  }
}

export class BadRequestError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 400, code: options.code ?? 'BAD_REQUEST' });
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 401, code: options.code ?? 'UNAUTHORIZED' });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 403, code: options.code ?? 'FORBIDDEN' });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 404, code: options.code ?? 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 422, code: options.code ?? 'VALIDATION_FAILED' });
    this.name = 'UnprocessableEntityError';
  }
}

export class RateLimitError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status?: number }) {
    super({ ...options, status: 429, code: options.code ?? 'RATE_LIMITED' });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status: number }) {
    super({ ...options, code: options.code ?? 'SERVER_ERROR' });
    this.name = 'ServerError';
  }
}

/**
 * Phase F: a caller-supplied configuration or argument the SDK refuses locally,
 * BEFORE any wire activity (zero fetch). `category: "validation"`, non-retryable —
 * retrying the identical call cannot succeed. (Sibling: HuduConfigError /
 * AutotaskConfigError.)
 */
export class KimaiConfigError extends ApiError {
  constructor(message: string, options: Omit<ApiErrorOptions, 'status' | 'message' | 'category' | 'retryable'> & { status?: number } = {}) {
    super({
      status: options.status ?? 0,
      message,
      category: 'validation',
      code: options.code ?? 'CONFIG_ERROR',
      retryable: false,
      ...options,
    });
    this.name = 'KimaiConfigError';
  }
}

/**
 * Phase F: a resolution the bounded `resolve` contract cannot answer (policy §6).
 * Two closed codes: `RESOLUTION_AMBIGUOUS` (several matches — the candidate ids
 * ride on `resourceIds`) and `RESOLUTION_TRUNCATED` (a scan stopped at its cap
 * before the data ran out — never returned as `null`). Non-retryable: retrying
 * the same identifier reproduces the same resolution cost.
 */
export class ResolutionError extends ApiError {
  constructor(message: string, options: Omit<ApiErrorOptions, 'status' | 'message' | 'retryable'> & { status?: number } = {}) {
    super({
      status: options.status ?? 0,
      message,
      category: 'resolution',
      retryable: false,
      code: options.code === undefined ? 'RESOLUTION_AMBIGUOUS' : options.code,
      ...options,
    });
    this.name = 'ResolutionError';
  }

  /** Several candidates matched exactly — the caller must pick one (ids in `resourceIds`). */
  static ambiguous(message: string, options: { operation?: string; resourceIds?: number[]; suggestedAction?: string } = {}): ResolutionError {
    return new ResolutionError(message, {
      code: 'RESOLUTION_AMBIGUOUS',
      ...options,
      suggestedAction: options.suggestedAction ?? 'Retry with one of the candidate ids in resourceIds.',
    });
  }

  /** A bounded scan stopped at its cap without deciding — narrow the identifier. */
  static truncated(message: string, options: { operation?: string; resourceIds?: number[]; suggestedAction?: string } = {}): ResolutionError {
    return new ResolutionError(message, {
      code: 'RESOLUTION_TRUNCATED',
      ...options,
      suggestedAction: options.suggestedAction ?? 'Narrow the identifier (a more precise begin timestamp) or raise the resolution cap.',
    });
  }
}

export function createApiError({ status, message, data, request, code, ...structured }: ApiErrorOptions): ApiError {
  const base = {
    status,
    message,
    data,
    request,
    code: code ?? defaultCodeForStatus(status),
    httpStatus: structured.httpStatus ?? status,
    vendorError: structured.vendorError ?? data,
    retryable: structured.retryable ?? retryableForStatus(status),
    suggestedAction: structured.suggestedAction ?? suggestedActionForStatus(status),
    ...structured,
  };

  switch (status) {
    case 400:
      return new BadRequestError(base);
    case 401:
      return new UnauthorizedError(base);
    case 403:
      return new ForbiddenError(base);
    case 404:
      return new NotFoundError(base);
    case 422:
      return new UnprocessableEntityError(base);
    case 429:
      return new RateLimitError(base);
    default:
      if (status >= 500) {
        return new ServerError(base);
      }
      return new ApiError(base);
  }
}
