---
type: error-contract
title: Error Hierarchy and Structured Contract
description: Defines the typed error classes, error categories, structured error contract fields, and the status=0 convention for local refusals
tags: [errors, api-error, http, validation, resolution, structured-contract]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-198604e930e645fde95804c1
    resource: repo://src/errors.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Error Hierarchy and Structured Contract

The SDK provides a typed error hierarchy rooted in ApiError, with specialized subclasses for each HTTP status code. All errors carry a structured contract with closed category vocabulary, retryability flags, suggested actions, and correlation IDs. Local argument refusals (KimaiConfigError) and resolution failures (ResolutionError) use `status: 0` to distinguish them from HTTP errors.

## Error Class Hierarchy

The [error hierarchy](repo://src/errors.ts#L50-L203) extends from ApiError:

- **ApiError** (base class): Generic API error with full structured contract
  - **BadRequestError** (400): Invalid request parameters
  - **UnauthorizedError** (401): Invalid or missing token
  - **ForbiddenError** (403): Insufficient permissions
  - **NotFoundError** (404): Resource not found
  - **UnprocessableEntityError** (422): Validation failed
  - **RateLimitError** (429): Rate limit exceeded
  - **ServerError** (5xx): Server-side error
- **KimaiConfigError** (status 0): Local argument refusal before any network call
- **ResolutionError** (status 0): Resolution failures (ambiguous or truncated)

The [createApiError factory](repo://src/errors.ts#L264-L297) instantiates the appropriate subclass based on HTTP status, populating default codes and suggested actions.

## Structured Error Contract

Every ApiError exposes [these fields](repo://src/errors.ts#L50-L64):

- **`status`**: HTTP status code (or 0 for local refusals)
- **`message`**: Human-readable error description
- **`data`**: Raw error body from the API
- **`request`**: Full request URL (including query string)
- **`code`**: Machine-readable error code (SCREAMING_SNAKE format)
- **`category`**: Closed ErrorCategory vocabulary (see below)
- **`operation`**: Registry operation name that failed (e.g., `timesheets.stop`)
- **`httpStatus`**: Canonical HTTP status (same as `status` for HTTP errors, absent for status=0)
- **`retryable`**: Boolean indicating whether retrying the same request may succeed
- **`vendorError`**: The raw vendor payload (defaults to `data`)
- **`resourceIds`**: Array of involved identifiers (target, candidates, parent)
- **`suggestedAction`**: Deterministic next step (never invented advice)
- **`correlationId`**: UUID generated per request for server-side tracing
- **`retryAfter`**: Seconds to wait before retrying (parsed from `Retry-After` header on 429)

## Error Categories

The [ErrorCategory type](repo://src/errors.ts#L11-L21) defines a closed vocabulary of error categories:

- **`auth`** (401, 403): Authentication or authorization failure
- **`not_found`** (404): Resource not found
- **`validation`** (400, 422, KimaiConfigError): Invalid request or configuration
- **`conflict`** (409, 412): State conflict (re-read and retry with current values)
- **`rate_limit`** (429): Rate limit exceeded
- **`server`** (5xx, default): Server-side error
- **`network`** (status 0): Network failure without response
- **`timeout`** (status 0): Deadline or caller abort
- **`resolution`** (status 0): Resolution contract failure
- **`policy`**: Reserved for policy-layer refusals

The [categoryForStatus function](repo://src/errors.ts#L86-L104) maps HTTP statuses to categories, defaulting to `server` for undocumented codes.

## Retryability

The [retryableForStatus function](repo://src/errors.ts#L107-L109) classifies errors as retryable:

- **Retryable** (`true`): 429 (rate limit), 5xx (server errors), status 0 network/timeout errors
- **Non-retryable** (`false`): 400, 401, 403, 404, 409, 412, 422, KimaiConfigError, ResolutionError

Retrying a non-retryable error with identical inputs cannot succeed; the caller must fix the request or change the identifier.

## Default Error Codes

Each specialized error class has a [default machine code](repo://src/errors.ts#L112-L132):

- **400**: `BAD_REQUEST`
- **401**: `UNAUTHORIZED`
- **403**: `FORBIDDEN`
- **404**: `NOT_FOUND`
- **409/412**: `CONFLICT`
- **422**: `VALIDATION_FAILED`
- **429**: `RATE_LIMITED`
- **5xx**: `SERVER_ERROR`
- **Other**: `HTTP_{status}`

Additional specialized codes include:

- **`TIMEOUT`**: Deadline or caller abort
- **`NETWORK`**: Network failure without response
- **`CONFIG_ERROR`**: Local argument refusal (KimaiConfigError)
- **`RESOLUTION_AMBIGUOUS`**: Multiple exact matches in resolution
- **`RESOLUTION_TRUNCATED`**: Bounded scan stopped at cap

## Suggested Actions

The [suggestedActionForStatus function](repo://src/errors.ts#L135-L154) provides deterministic next steps per status:

- **400/422**: "Fix the request payload; see vendorError for the offending field."
- **401**: "Check the API token and its scope."
- **403**: "Verify the account permissions for this operation."
- **404**: "Verify the id, or resolve the record from another identifier first."
- **409/412**: "Re-read the record and retry with current values."
- **429**: "Back off and retry; honour retryAfter (Retry-After) when present."
- **5xx**: "Retry with backoff; the server error is transient."
- **RESOLUTION_AMBIGUOUS**: "Retry with one of the candidate ids in resourceIds."
- **RESOLUTION_TRUNCATED**: "Narrow the identifier (a more precise begin timestamp) or raise the resolution cap."

These actions never name the caller's own helper; they describe only the next protocol-level step.

## KimaiConfigError: Local Refusal Before Wire Activity

[KimaiConfigError](repo://src/errors.ts#L211-L223) is thrown when the SDK refuses a caller-supplied configuration or argument **before any network call**:

- Non-positive or non-finite `timeoutMs`
- Invalid `limit` for helpers (outside 1…100)
- Non-integer or non-positive `page`/`size` for pagination
- Unknown operation key in `invokeOperation`
- Missing confirmation for destructive operations
- Invalid input field in registry-validated invoke

KimaiConfigError uses `status: 0` (not an HTTP status), `category: "validation"`, `code: "CONFIG_ERROR"`, and `retryable: false`. The error message describes the refusal reason, and the structured contract may include `operation` and `suggestedAction`.

Retrying the identical call cannot succeed; the caller must fix the argument.

## ResolutionError: Bounded Resolution Failures

[ResolutionError](repo://src/errors.ts#L232-L262) is thrown when the bounded `resolve` helper contract cannot answer:

- **`RESOLUTION_AMBIGUOUS`**: Several records matched exactly; `resourceIds` carries the candidate IDs
- **`RESOLUTION_TRUNCATED`**: The bounded scan stopped at its 500-record cap before exhausting the data

ResolutionError uses `status: 0`, `category: "resolution"`, and `retryable: false`. It is never returned as `null`; resolution failures are always explicit errors.

The [ResolutionError.ambiguous](repo://src/errors.ts#L246-L252) and [ResolutionError.truncated](repo://src/errors.ts#L254-L261) factory methods populate suggested actions:

- Ambiguous: "Retry with one of the candidate ids in resourceIds."
- Truncated: "Narrow the identifier (a more precise begin timestamp) or raise the resolution cap."

## Status=0 Convention

Both KimaiConfigError and ResolutionError use `status: 0` to signal they are **not HTTP errors**. This convention distinguishes local SDK refusals from vendor responses:

- **HTTP errors**: `status >= 400`, `httpStatus` present, `request` carries the full URL
- **Local refusals**: `status: 0`, `httpStatus` absent, zero wire activity

Network failures and timeouts also use `status: 0` with categories `network` and `timeout`, but they are retryable and have distinct codes (`NETWORK`, `TIMEOUT`).

## Error Construction Flow

The [createApiError factory](repo://src/errors.ts#L264-L297):

1. Applies default code from `defaultCodeForStatus` if no code is provided
2. Sets `httpStatus` to the status value for HTTP errors
3. Defaults `vendorError` to `data`
4. Defaults `retryable` from `retryableForStatus`
5. Defaults `suggestedAction` from `suggestedActionForStatus`
6. Instantiates the appropriate subclass based on status

The factory ensures consistent field population across all error paths. Specialized constructors (BadRequestError, etc.) delegate to the base ApiError constructor with the appropriate status and code.
