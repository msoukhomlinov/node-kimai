---
type: architecture
title: Typed Error Contract
description: The ApiError hierarchy, the closed category vocabulary, how HTTP status maps to class, code, category, retryability and suggested action, and the local KimaiConfigError and ResolutionError types.
tags: [errors, api-error, categories, retry]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-198604e930e645fde95804c1
    resource: repo://src/errors.ts
  - id: openwiki-source-ae685eb13b181745a41c0cef
    resource: repo://test/errors-identity.test.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Typed Error Contract

Failures the SDK raises deliberately are an `ApiError` or a subclass (`src/errors.ts`); a success body that cannot be read passes through as the underlying error (see [client-and-transport.md](client-and-transport.md)). The package exports them from the root and from the `./errors` subpath. `isKimaiError(err)` in `src/guards.ts` is an `instanceof ApiError` check that narrows the type. Where errors are produced from the wire is described in [client-and-transport.md](client-and-transport.md).

## Fields

`ApiError` extends `Error` and carries:

- `status`, `httpStatus` (defaults to `status`), `data`, `request` (empty string if absent) and `code`.
- `category`, `retryable`, `operation`, `vendorError`, `resourceIds`, `suggestedAction`, `correlationId` and `retryAfter`.

When `category` or `retryable` is omitted they are derived from `status`.

## Categories

`ErrorCategory` is a closed set: `auth`, `not_found`, `validation`, `conflict`, `rate_limit`, `server`, `network`, `timeout`, `resolution`, `policy`.

## Status mapping

| Status | Category | Default code | Class |
| --- | --- | --- | --- |
| 400 | validation | `BAD_REQUEST` | `BadRequestError` |
| 401 | auth | `UNAUTHORIZED` | `UnauthorizedError` |
| 403 | auth | `FORBIDDEN` | `ForbiddenError` |
| 404 | not_found | `NOT_FOUND` | `NotFoundError` |
| 409, 412 | conflict | `CONFLICT` | base `ApiError` |
| 422 | validation | `VALIDATION_FAILED` | `UnprocessableEntityError` |
| 429 | rate_limit | `RATE_LIMITED` | `RateLimitError` |
| 5xx | server | `SERVER_ERROR` | `ServerError` |
| other | server | `HTTP_<status>` | base `ApiError` |

- A request that never got a response uses `status: 0`. Such a status maps to category `server` unless the category is set explicitly. The transport sets `timeout` or `network` explicitly.
- `retryable` is true only for 429 and for status 500 and above. `TIMEOUT` and `NETWORK` errors set it true explicitly, and the local error types below set it false.
- `createApiError` fills `code`, `vendorError` (falling back to `data`), `retryable` and `suggestedAction` before choosing the class by status. Explicit structured options win.
- `suggestedAction` is a fixed sentence per status: fix the payload for 400 and 422, check the token for 401, verify permissions for 403, verify the id for 404, re-read and retry for 409 and 412, back off and honour `retryAfter` for 429, and retry with backoff for 5xx. Other statuses have none.

## Transport-origin errors

A request abort becomes category `timeout`, code `TIMEOUT`. A fetch failure with no response becomes category `network`, code `NETWORK`, with the original error under `data`. Both are retryable. The mechanics, including the deadline versus caller-abort message, are in [client-and-transport.md](client-and-transport.md).

## Local errors (no wire activity)

- `KimaiConfigError` is raised for an argument or configuration the SDK refuses locally. It has status 0, category `validation`, default code `CONFIG_ERROR` and `retryable: false`. Its constructor accepts `operation`, `code` and `suggestedAction`, which the invoke layer uses for its refusal codes ([operations-invoke.md](operations-invoke.md)).
- `ResolutionError` has category `resolution` and `retryable: false`. It has two codes. `ResolutionError.ambiguous` sets `RESOLUTION_AMBIGUOUS`, with candidate ids on `resourceIds` and a default action to retry with one of them. `ResolutionError.truncated` sets `RESOLUTION_TRUNCATED` for a bounded scan that stopped at its cap, and its default action is to narrow the identifier. Resolution behaviour itself is covered in [resource-clients.md](resource-clients.md).

Tests: `test/errors-identity.test.ts` builds `dist` if it is stale and spawns node against the built package, in both ESM and CJS, and checks that the root entry and the `./errors` subpath share one `ApiError` class identity, so `instanceof` and `isKimaiError` accept instances from either. `test/guards.test.ts` covers the guards.
