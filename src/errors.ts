// Typed error hierarchy for Kimai API
// DO NOT EDIT MANUALLY

export interface ApiErrorOptions {
  status: number;
  message: string;
  data?: unknown;
  request?: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly request: string;
  readonly code?: string;

  constructor({ status, message, data, request, code }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.request = request ?? '';
    this.code = code;
  }
}

export class BadRequestError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 400 });
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 401 });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 403 });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 404 });
    this.name = 'NotFoundError';
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 422 });
    this.name = 'UnprocessableEntityError';
  }
}

export class RateLimitError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'>) {
    super({ ...options, status: 429 });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiError {
  constructor(options: Omit<ApiErrorOptions, 'status'> & { status: number }) {
    super(options);
    this.name = 'ServerError';
  }
}

export function createApiError({ status, message, data, request, code }: ApiErrorOptions): ApiError {
  const base = { status, message, data, request, code };

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
