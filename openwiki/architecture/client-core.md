---
type: architecture
title: Client Core and Transport Layer
description: Explains the ApiClient base class, injectable transport abstraction, request lifecycle, timeout/cancellation handling, and error creation
tags: [client, transport, http, timeout, cancellation, errors]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Client Core and Transport Layer

The ApiClient base class provides the foundation for all Kimai API interactions. It implements an injectable transport pattern for n8n compatibility, supports configurable request timeouts and AbortSignal composition, and auto-wires 13 resource clients. All network failures and timeouts surface as typed ApiErrors with structured metadata.

## ApiClient Construction and Configuration

The [ApiClient class](repo://src/client.ts#L304-L347) accepts four configuration options:

- **`baseUrl`** (required): The Kimai instance URL, with trailing slashes automatically stripped
- **`token`** (required): The API token for Bearer authentication
- **`transport`** (optional): Custom HttpTransport implementation; defaults to FetchTransport
- **`timeoutMs`** (optional): Default request deadline in milliseconds; must be a positive finite number or the constructor throws KimaiConfigError

The constructor validates the timeout, normalizes the baseUrl, instantiates the transport (or uses the injected one), and auto-wires all 13 resource clients. Each resource client receives a reference to the ApiClient, allowing them to call the HTTP verbs (get, post, patch, delete) with the configured transport and timeout settings.

## Injectable Transport Pattern

The [HttpTransport interface](repo://src/client.ts#L56-L58) defines a single `request<T>(options: TransportRequest): Promise<T>` method. This abstraction enables:

1. **n8n integration**: n8n nodes can inject their own transport that wraps the platform's httpRequest helper, inheriting n8n's retry logic, logging, and credential management
2. **Testing**: Tests inject mock transports that return fixtures without network calls
3. **Middleware**: Custom transports can add logging, metrics, or request interception

The default [FetchTransport](repo://src/client.ts#L140-L272) uses Node.js native fetch, appends paths to the baseUrl, builds query strings from parameters, sets Bearer authorization headers, and handles JSON/ArrayBuffer/text responses.

## TransportRequest Contract

The [TransportRequest interface](repo://src/client.ts#L20-L34) defines the wire call parameters:

- **`method`**: One of GET, POST, PATCH, DELETE
- **`path`**: API path (e.g., `/api/activities`)
- **`query`**: Optional query parameters (string/number/boolean/null/arrays)
- **`body`**: Optional request body (serialized to JSON for POST/PATCH, appended to query for GET/DELETE)
- **`headers`**: Optional additional headers
- **`responseType`**: One of json, arraybuffer, text (defaults to json)
- **`signal`**: Optional AbortSignal for timeout/cancellation (composed by ApiClient from timeoutMs and caller signal)

The transport receives the composed signal and honors it during both the fetch call and response body consumption. An abort during either phase throws a typed timeout error.

## Request Lifecycle and HTTP Verbs

The ApiClient exposes four HTTP verbs: [get](repo://src/client.ts#L349-L358), [post](repo://src/client.ts#L360-L369), [patch](repo://src/client.ts#L371-L379), and [delete](repo://src/client.ts#L382-L391). Each verb:

1. Validates the path using `assertSafeRequestPath` (refuses paths with CRLF injection, path traversal, or absolute URLs)
2. Composes the effective AbortSignal from the per-request options and constructor-level timeout
3. Delegates to `this.transport.request<T>()` with the full TransportRequest
4. Returns the typed response or propagates the typed ApiError

Resource clients never call fetch directly; they always call these ApiClient verbs, ensuring consistent timeout handling, path validation, and error creation.

## Timeout and Cancellation

The [composeSignal method](repo://src/client.ts#L409-L437) combines the effective deadline (per-request `timeoutMs` wins over constructor value) with an optional caller-provided AbortSignal:

- **No timeout, no signal**: Returns undefined (unbounded request, historical behavior)
- **Timeout only**: Returns `AbortSignal.timeout(timeoutMs)` directly
- **Signal only**: Returns the caller signal directly
- **Both**: Creates a composed AbortController that aborts when either the deadline or caller signal fires, whichever comes first

The composed signal carries an explicit `TimeoutError` reason on deadline expiry, allowing the [transportFailure function](repo://src/client.ts#L71-L107) to distinguish deadline aborts from caller aborts. The [isTimeoutReason helper](repo://src/client.ts#L122-L125) checks for this reason.

A non-positive or non-finite `timeoutMs` is refused up front with a [KimaiConfigError](repo://src/client.ts#L110-L114), producing zero wire activity.

## Error Creation and Transport Failures

The [FetchTransport.request method](repo://src/client.ts#L146-L271) wraps fetch calls in try-catch blocks at two points:

1. **Fetch call rejection** (network failure or abort before response): The [transportFailure function](repo://src/client.ts#L71-L107) classifies the rejection as either a timeout (signal aborted) or network failure, returning a typed ApiError with `status: 0`, category `timeout` or `network`, code `TIMEOUT` or `NETWORK`, `retryable: true`, and the full request URL
2. **Response body consumption rejection** (abort during body read): Same transportFailure logic applies

For HTTP errors (non-2xx status), FetchTransport extracts the error body (JSON or text), parses a human-readable message from the `message` or `title` field, and calls [createApiError](repo://src/errors.ts) with the status, message, raw data, request URL, correlationId, and parsed `retryAfter` header.

The [parseRetryAfter function](repo://src/client.ts#L279-L288) parses the `Retry-After` header in both delta-seconds and HTTP-date formats, returning the whole seconds to wait (clamped at zero).

## Correlation IDs

Each request generates a unique [correlation ID](repo://src/client.ts#L151) using `crypto.randomUUID()`. This ID is attached to all ApiErrors created from that request, enabling server-side trace correlation when troubleshooting failures.

## Resource Client Auto-wiring

The ApiClient constructor instantiates 13 resource clients, each receiving a reference to the ApiClient:

- [activities](repo://src/client.ts#L311): ActivityClient
- [customers](repo://src/client.ts#L312): CustomerClient
- [projects](repo://src/client.ts#L313): ProjectClient
- [timesheets](repo://src/client.ts#L314): TimesheetClient
- [users](repo://src/client.ts#L315): UserClient
- [tags](repo://src/client.ts#L316): TagClient
- [teams](repo://src/client.ts#L317): TeamClient
- [invoices](repo://src/client.ts#L318): InvoiceClient
- [approvalBundle](repo://src/client.ts#L319): ApprovalBundleClient
- [config](repo://src/client.ts#L320): ConfigClient
- [system](repo://src/client.ts#L321): SystemClient
- [export](repo://src/client.ts#L322): ExportClient
- [actions](repo://src/client.ts#L323): ActionsClient

Resource clients call back into the ApiClient's HTTP verbs, inheriting the transport, timeout, and error handling configuration.

## Path Safety

The [assertSafeRequestPath guard](repo://src/guards.ts) refuses paths containing:

- CRLF sequences (`\r` or `\n`)
- Path traversal patterns (`..`)
- Absolute URLs (protocol prefixes)

This prevents header injection and ensures paths are always relative to the configured baseUrl. FetchTransport enforces this guard at the start of every request.
