// node-kimai - Kimai API Client SDK
// Main entry point

export { ApiClient, type ApiClientOptions, type HttpTransport, type TransportRequest, FetchTransport, parseRetryAfter } from './client';

// Errors
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  RateLimitError,
  ServerError,
  // Phase F (agent execution layer): the structured error contract additions.
  KimaiConfigError,
  ResolutionError,
  type ErrorCategory,
} from './errors';

// Resource clients
export {
  ActivityClient,
  CustomerClient,
  ProjectClient,
  TimesheetClient,
  UserClient,
  TagClient,
  TeamClient,
  InvoiceClient,
  ApprovalBundleClient,
  ConfigClient,
  SystemClient,
  ExportClient,
  ActionsClient,
  type ActionResource,
} from './resources';

// Types
export type * from './types';
