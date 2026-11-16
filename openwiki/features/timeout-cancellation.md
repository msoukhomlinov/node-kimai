---
type: request-lifecycle
title: Timeout and Cancellation
description: Constructor-level and per-request timeoutMs, AbortSignal composition, timeout/network error categories, and status=0 convention for non-HTTP failures
tags: [timeout, cancellation, abort-signal, error-handling]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
  - id: openwiki-source-198604e930e645fde95804c1
    resource: repo://src/errors.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Timeout and Cancellation

The SDK provides deadline-based timeouts and external cancellation via `AbortSignal` composition. Both constructor-level defaults and per-request overrides are supported, with typed error classification distinguishing timeouts from network failures.

## Timeout Configuration

**Constructor-level default:**
```typescript
const client = new ApiClient({
  baseUrl: 'https://kimai.example.com',
  token: 'api-token',
  timeoutMs: 5000, // default 5s deadline for every request
});
```

**Per-request override (wins over constructor value):**
```typescript
await client.timesheets.listAll({ user: 'all' }, { timeoutMs: 10000 });
```

When neither is set, requests run indefinitely with no deadline (pre-issue-7 behavior). Both values must be positive finite numbers—non-finite or non-positive values throw `KimaiConfigError` before any wire activity.

## Signal Composition

The SDK composes the effective deadline (per-request `timeoutMs` wins over constructor default) with an optional external `AbortSignal` into a single signal passed to the transport:

**Single input (fast path):**
- Deadline only → `AbortSignal.timeout(timeoutMs)` passed through
- Caller signal only → passed through untouched
- Neither → `undefined`, request runs with no deadline

**Composed (both deadline and caller signal):**
- Creates an `AbortController` forwarding both inputs
- Deadline armed as `AbortSignal.timeout` with explicit `TimeoutError` reason
- Combined signal aborts on the **earliest** event (deadline or caller abort)
- Caller abort at t < deadline rejects immediately, never waits for deadline

This ensures that an external cancellation always wins when it fires first, and that the deadline reason is reliably distinguishable from caller-side aborts.

## Error Classification

**Timeout (category: `timeout`, code: `TIMEOUT`):**
- Request aborted by deadline (signal reason is `TimeoutError`)
- Status: `0` (non-HTTP failure convention)
- Retryable: `true`
- Message distinguishes deadline abort vs caller abort

**Network failure (category: `network`, code: `NETWORK`):**
- Fetch rejection when signal was not aborted
- Status: `0` (non-HTTP failure convention)
- Retryable: `true`
- Original error captured under `data` field

The classifier checks `signal?.aborted` first. If aborted, it inspects the reason: a `TimeoutError` name or `DOMException` with that name signals a deadline abort. Otherwise, it's a caller abort (still timeout category, different message). If not aborted, it's a network failure.

Both consume the body phase: a mid-body abort (e.g., slow download exceeding deadline) is classified the same way as a pre-fetch abort.

## Status=0 Convention

Non-HTTP failures (timeout, network) use `status: 0` to signal that no HTTP response was received. This convention is shared across the error hierarchy:

- `ApiError` (timeout/network): `status: 0`
- `KimaiConfigError` (validation): `status: 0` by default (can be overridden)
- `ResolutionError` (helper resolution failures): `status: 0` by default

HTTP errors (400–599) have their actual status codes. The `status: 0` marker enables downstream logic to distinguish "no response received" from "received a 500".

## Usage Examples

**Deadline-only timeout:**
```typescript
const client = new ApiClient({ baseUrl, token, timeoutMs: 3000 });
try {
  await client.timesheets.listAll({ user: 'all' });
} catch (err) {
  if (err instanceof ApiError && err.category === 'timeout') {
    console.log('Timed out after 3s');
  }
}
```

**Per-request override:**
```typescript
// Extends deadline to 10s for this request only
await client.timesheets.listAll({ user: 'all' }, { timeoutMs: 10000 });
```

**External cancellation:**
```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 2000);

try {
  await client.timesheets.listAll({ user: 'all' }, { signal: controller.signal });
} catch (err) {
  if (err instanceof ApiError && err.code === 'TIMEOUT') {
    console.log('Aborted by external signal');
  }
}
```

**Composed (deadline + external signal):**
```typescript
const controller = new AbortController();
const promise = client.timesheets.listAll(
  { user: 'all' },
  { timeoutMs: 5000, signal: controller.signal }
);

// Whichever fires first aborts the request:
// - controller.abort() before 5s → immediate abort
// - 5s elapsed → deadline abort
```

## Implementation Details

Signal composition is centralized in `ApiClient.composeSignal()`. The combined flow:

1. Resolve effective `timeoutMs` (per-request ?? constructor default)
2. If only one input active, return it as-is (fast path)
3. If both present, create an `AbortController` and forward both inputs
4. Arm deadline as `AbortSignal.timeout` with explicit `TimeoutError` reason
5. Install listeners forwarding each input's abort to the controller
6. Return `controller.signal` (aborts on earliest event)

The transport (`FetchTransport`) honors the signal on both the `fetch()` call and the response body consumption. An abort at any stage produces a typed timeout or network error based on the signal's abort reason.
