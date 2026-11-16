---
type: pattern
title: Transport Injection Pattern
description: Injectable HTTP transport interface enabling n8n compatibility and custom runtime integration through HttpTransport abstraction, FetchTransport default implementation, and TransportRequest signal handling.
tags: [transport, http, fetch, n8n, integration, timeout, cancellation]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Transport Injection Pattern

The SDK decouples HTTP execution from the client API through an injectable `HttpTransport` interface, enabling custom runtime integration without modifying the SDK. The pattern supports n8n's `httpRequest` helpers, timeout/cancellation control, and typed network error handling.

## Transport Interface

```typescript
interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

interface TransportRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | null | string[] | number[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'text';
  signal?: AbortSignal;
}
```

The `HttpTransport.request` contract:

- **Path**: The API path relative to `baseUrl` (e.g., `/api/activities`, never resolved with `..`)
- **Query parameters**: Serialized to URL query string, with array handling (repeated keys)
- **Body**: Sent as JSON for POST/PATCH, appended to query string for GET/DELETE
- **Response types**: `json` (default), `arraybuffer` (binary downloads), `text` (plain response)
- **Signal**: Combined deadline + caller abort control (see Timeout and Cancellation)

## Default Transport: FetchTransport

`FetchTransport` implements the interface using native Node.js fetch:

- Constructs full URL by appending `path` to `baseUrl` (preserving base sub-paths like `/kimai`)
- Sets `Authorization: Bearer {token}` and `Content-Type: application/json` headers
- Serializes request body as JSON for POST/PATCH operations
- Parses response based on `Content-Type` header or explicit `responseType`
- Generates one `correlationId` (UUID) per request for error tracing
- Surfaces `Retry-After` header on 429 responses as `err.retryAfter` (seconds)

Error handling:

- **Non-2xx HTTP**: Throws typed `ApiError` with status, message, data, correlationId, retryAfter
- **Network failure** (no response): Throws typed `ApiError` with `category: 'network'`, `code: 'NETWORK'`, `status: 0`, `retryable: true`, original error under `data`
- **Timeout/abort**: Throws typed `ApiError` with `category: 'timeout'`, `code: 'TIMEOUT'`, `status: 0`, `retryable: true`, distinguishes deadline vs caller abort

## n8n Integration Pattern

n8n consumers inject a custom transport wrapping `this.helpers.httpRequest`:

```typescript
class N8nTransport implements HttpTransport {
  constructor(
    private baseUrl: string,
    private token: string,
    private helpers: ILoadOptionsFunctions
  ) {}

  async request<T>(options: TransportRequest): Promise<T> {
    const url = new URL(options.path, this.baseUrl);

    // Serialize query parameters
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

    // Delegate to n8n's HTTP request helper
    const response = await this.helpers.httpRequest<T>({
      method: options.method,
      url: url.toString(),
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body,
    });

    return response;
  }
}
```

The n8n transport:

- Serializes query parameters manually (n8n's HTTP helper expects full URL)
- Passes authorization token and content type headers
- Delegates response handling to n8n's HTTP infrastructure
- Does not implement signal handling (n8n controls timeouts through its own mechanisms)

## Timeout and Cancellation

The SDK supports per-request and client-level timeout control via `AbortSignal` composition:

### Client-Level Timeout

```typescript
const client = new ApiClient({
  baseUrl: 'https://kimai.example.com',
  token: 'your-api-token',
  timeoutMs: 30_000, // 30-second default deadline
});
```

Every request without a per-request `timeoutMs` aborts after the client-level deadline. Omit `timeoutMs` to keep unbounded requests (historical behavior).

### Per-Request Control

```typescript
const controller = new AbortController();

try {
  // Per-request timeoutMs REPLACES the client default
  const activities = await client.get('/api/activities', {
    timeoutMs: 10_000,
    signal: controller.signal,
  });
} catch (err) {
  if (err instanceof ApiError && err.category === 'timeout') {
    console.warn('Request timed out', err.correlationId);
  }
}

// Caller-side cancellation
controller.abort();
```

The effective deadline is `per-request timeoutMs ?? client.timeoutMs ?? undefined`. When both a deadline and a caller signal are present, they are combined via `AbortSignal.any` semantics:

- **Deadline only**: `AbortSignal.timeout(timeoutMs)`
- **Caller signal only**: Passed through untouched
- **Both**: Composed `AbortController` that aborts on the EARLIEST input (caller abort at t < deadline rejects immediately)

Deadline signals carry an explicit `TimeoutError` reason so `isTimeoutReason()` can distinguish deadline expiry from caller abort.

### Error Classification

| Scenario | Category | Code | Status | Retryable |
|----------|----------|------|--------|-----------|
| Deadline expires | `timeout` | `TIMEOUT` | 0 | true |
| Caller aborts | `timeout` | `TIMEOUT` | 0 | true |
| Network failure (no response) | `network` | `NETWORK` | 0 | true |
| Non-2xx HTTP | varies | varies | HTTP status | varies |

A non-positive or non-finite `timeoutMs` throws `KimaiConfigError` before any wire activity.

## Signal Handling in FetchTransport

The combined signal reaches `fetch()` via `TransportRequest.signal`:

1. **Request phase**: `fetch(url, { signal })` aborts immediately on signal abort
2. **Body consumption phase**: `response.json()` / `response.arrayBuffer()` aborts mid-stream on signal abort
3. **Error wrapping**: Both phases catch abort and network failures, surfacing them as typed `ApiError` with `correlationId`

Deadline timers are `unref`'d so they never keep the process alive when the event loop is otherwise idle.

## Transport Contract Requirements

Custom transports MUST:

- Respect the `TransportRequest.path` as a base-relative path (never resolve `..`)
- Serialize `query` parameters correctly (arrays as repeated keys)
- Handle POST/PATCH `body` as JSON; append GET/DELETE `body` to query string
- Return parsed `T` matching the requested `responseType`
- Throw errors that the SDK can catch (preferably typed `ApiError`)

Custom transports SHOULD:

- Honor `TransportRequest.signal` for timeout/cancellation support
- Surface network failures as typed errors (not raw `TypeError`)
- Distinguish timeout from caller abort when possible

Custom transports MAY:

- Implement retry logic (the SDK transport itself never retries)
- Add custom headers beyond those in `TransportRequest.headers`
- Use alternative HTTP clients (axios, undici, etc.) under the hood
