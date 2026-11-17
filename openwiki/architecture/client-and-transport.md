---
type: architecture
title: ApiClient and Transport
description: How ApiClient is constructed, how FetchTransport builds and sends requests, how timeouts and abort signals compose, and which request-path and credential guards run before any wire activity.
tags: [client, transport, timeout, guards]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
  - id: openwiki-source-6a3b5e8588b45fe998d20819
    resource: repo://src/guards.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# ApiClient and Transport

`ApiClient` (`src/client.ts`) is the root object. It holds `baseUrl`, `token` and an optional default `timeoutMs`, and it exposes one property per resource client (see [resource-clients.md](resource-clients.md)). Each resource client receives the `ApiClient` and calls its `get`, `post`, `patch` and `delete` verbs. Failures surface as the typed errors described in [errors.md](errors.md).

## Construction

- `baseUrl` has trailing slashes stripped.
- `transport` is injectable through `HttpTransport.request`. Without one, a `FetchTransport` is built from `baseUrl` and `token`.
- A `timeoutMs` that is not a positive finite number makes the constructor throw `KimaiConfigError`, before any request.
- With no `timeoutMs`, requests have no deadline.

Every verb calls `assertSafeRequestPath` first, then hands the transport a `TransportRequest` with method, path, query and a composed `signal`. `get` also passes `responseType`, and the other verbs pass `body`. `delete` returns `void`.

## FetchTransport

`FetchTransport.request` in `src/client.ts`:

1. Re-checks the path with `assertSafeRequestPath`. It appends the path to the base URL string rather than resolving it, so a base sub-path such as `/kimai` is kept.
2. Generates one `crypto.randomUUID()` correlation id per request and attaches it to errors.
3. Appends `query` entries to the URL. Arrays become repeated parameters, and `undefined` and `null` values are skipped.
4. Sends `Content-Type: application/json` and `Authorization: Bearer <token>`. Headers in the request override these.
5. Treats a `body` on `GET` or `DELETE` as extra query parameters. For other methods it JSON-encodes the body.
6. Maps a fetch rejection to a typed `TIMEOUT` or `NETWORK` error (see below).
7. For a non-2xx response, parses the body as JSON (falling back to text) and builds the error with `createApiError`. The message is the body's `message` or `title` string if present, otherwise `HTTP <status>: <statusText>`. `retryAfter` is taken from the `Retry-After` header.
8. Returns `undefined` for 204 and 205.
9. Reads a success body according to `responseType` (`arraybuffer`, `text`, or JSON by default). For JSON it parses the body when the content type contains `application/json`. Otherwise it reads the text, returns `undefined` if that is empty or whitespace, parses it as JSON, and returns the raw text if it is not valid JSON.

`parseRetryAfter` accepts either delta-seconds or an HTTP-date. It floors the value to whole seconds and clamps at 0. A value it cannot parse gives `undefined`.

## Timeouts and abort composition

`composeSignal` picks the effective deadline. A per-request `timeoutMs` replaces the constructor value, and an invalid per-request value throws `KimaiConfigError` before any wire activity. The result depends on which inputs are present:

- No deadline and no signal: no signal is passed.
- Caller signal only: passed through untouched.
- Deadline only: a bare `AbortSignal.timeout`.
- Both: one composed `AbortController` that aborts on the earliest input. The deadline abort carries an explicit `TimeoutError` reason, so it classifies as a timeout even on runtimes where `AbortSignal.timeout` leaves the reason unset.

`transportFailure` converts an abort into a `timeout` error with code `TIMEOUT`. A deadline reason gives the "timed out" message, and any other reason gives the "aborted" message. A rejection with no aborted signal becomes a `network` error with code `NETWORK`, with the original error under `data`. The body-reading phase is guarded the same way, so a mid-body abort is also a typed timeout. Other body-consumption failures pass through unchanged. The error fields are owned by [errors.md](errors.md).

## Request-path and credential guards

These are in `src/guards.ts` and run before a request is built:

- `pathId(value, name)` accepts only a safe positive integer and returns its decimal string.
- `pathToken(value, name)` accepts only `[A-Za-z0-9_-]+`.
- `assertSafeRequestPath` accepts only a plain relative path. It rejects backslashes, `?`, `#`, control characters, and empty, `.` or `..` segments. It checks the path as given and after repeated percent-decoding (up to four rounds), and refuses if any form is unsafe or the decoding fails. Query parameters belong in `query`.
- `credentialShapeProblem({ baseUrl, token })` returns a value-free message, or `null` when usable. It requires a non-empty absolute `http(s)` `baseUrl` and a non-empty `token`. It rejects a token with leading or trailing whitespace, surrounding single or double quotes, or a carriage return. This catches quote-preserving env loaders. The message names the field and the artifact, never the value.
- `isKimaiError` narrows to `ApiError` and so covers every subclass.

All guard refusals throw `KimaiConfigError` with the message stating that no request was issued.
