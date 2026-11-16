---
type: test-infrastructure
title: Transport Mocking and Fixtures
description: Documents the mock transport pattern, fixture organization, JSON response shapes, and how tests verify request paths without real API calls
tags: [testing, mocking, fixtures, transport, vitest]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
  - id: openwiki-source-198604e930e645fde95804c1
    resource: repo://src/errors.ts
  - id: openwiki-source-9832b2b355b10c3bf67a8e1f
    resource: repo://test/__fixtures__/activity_single.json
  - id: openwiki-source-1a4e1f21512947320b55e76a
    resource: repo://test/__fixtures__/timesheet_created.json
  - id: openwiki-source-e682e98a3f4ab8bf67c3721d
    resource: repo://test/client.test.ts
  - id: openwiki-source-63021c096ebecf8066ee0000
    resource: repo://test/resources/activity.test.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Transport Mocking and Fixtures

The SDK test suite uses injectable transport mocking and JSON fixtures to verify behavior without making real API calls. This approach enables fast, deterministic tests that validate request construction, response parsing, error handling, and edge cases across all 108 operations.

## Mock Transport Pattern

### Injectable Transport Design

The `HttpTransport` interface enables test isolation by injecting a mock implementation that captures requests and returns controlled responses:

```typescript
interface HttpTransport {
  request<T>(options: TransportRequest): Promise<T>;
}

interface TransportRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | string[]>;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'text';
}
```

Production code uses `FetchTransport` (native fetch wrapper), while tests inject a mock that records calls and returns fixtures.

### Test Setup Pattern

Tests use Vitest's `vi.fn()` to create a mock transport and inject it into the `ApiClient`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, type HttpTransport } from '../src/client';

describe('ActivityClient', () => {
  let mockTransport: HttpTransport;
  let client: ApiClient;

  beforeEach(() => {
    mockTransport = {
      request: vi.fn().mockResolvedValue(loadFixture('activity')),
    };
    client = new ApiClient({
      baseUrl: 'https://api.kimai.test',
      token: 'test-token',
      transport: mockTransport,
    });
  });

  it('should fetch activities', async () => {
    const activities = await client.activities.listAll();

    expect(mockTransport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/activities',
    });
    expect(activities).toEqual(loadFixture('activity'));
  });
});
```

### Request Verification

Tests verify request construction without caring about the actual fetch mechanics:

```typescript
// Verify path construction
expect(mockTransport.request).toHaveBeenCalledWith(
  expect.objectContaining({ path: '/api/activities/123' })
);

// Verify query params
expect(mockTransport.request).toHaveBeenCalledWith(
  expect.objectContaining({
    query: { visible: true, project: 5 }
  })
);

// Verify body payload
expect(mockTransport.request).toHaveBeenCalledWith(
  expect.objectContaining({
    method: 'POST',
    body: { name: 'Development', visible: true }
  })
);
```

## Fixture Organization

### Directory Structure

Fixtures live in `test/__fixtures__/` with one JSON file per response shape:

```
test/__fixtures__/
  ├── activity.json              # Bare array of activities
  ├── activity_single.json       # Single activity object
  ├── activity_entity.json       # ActivityEntity (from create/update)
  ├── activity_rate.json         # Array of rates
  ├── activity_rate_single.json  # Single rate
  ├── timesheet.json             # Bare array of timesheets
  ├── timesheet_single.json      # Single timesheet
  ├── timesheet_created.json     # Created timesheet (active)
  ├── customer.json              # Bare array of customers
  ├── project.json               # Bare array of projects
  ├── user.json                  # Bare array of users
  ├── error_400.json             # BadRequest error shape
  ├── error_404.json             # NotFound error shape
  ├── error_429.json             # RateLimit error shape
  └── ...
```

### Fixture Naming Convention

| Pattern | Purpose | Example |
|---------|---------|---------|
| `{resource}.json` | List response (bare array) | `activity.json` → `Activity[]` |
| `{resource}_single.json` | Get response (bare object) | `activity_single.json` → `Activity` |
| `{resource}_created.json` | Create response (may differ from get) | `timesheet_created.json` → active timesheet |
| `{resource}_entity.json` | Entity variant (e.g. ActivityEntity) | `activity_entity.json` |
| `{resource}_{subtype}.json` | Sub-resource | `activity_rate.json` → `ActivityRate[]` |
| `error_{code}.json` | Error response | `error_404.json` → NotFound shape |

### Loading Fixtures

Tests load fixtures via a helper function:

```typescript
import { readFileSync } from 'node:fs';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`./__fixtures__/${name}.json`, import.meta.url),
      'utf8'
    )
  );
}
```

This uses `import.meta.url` to resolve paths relative to the test file, ensuring it works in both ESM and CJS test runners.

## Response Shape Verification

### Critical Contract: Bare Responses

The Kimai API returns **bare arrays** for lists and **bare objects** for single items. There are NO wrapper envelopes like `{activities: [...]}`.

Fixtures must match this contract exactly:

**Correct (bare array):**
```json
[
  { "id": 1, "name": "Development" },
  { "id": 2, "name": "Testing" }
]
```

**Wrong (wrapped array):**
```json
{
  "items": [
    { "id": 1, "name": "Development" }
  ]
}
```

This is verified by ARCHITECTURE.md §8 response envelope table and enforced by fixture-based tests.

### Single Object Shape

Single-item responses (GET by id, POST create, PATCH update) return the object directly:

```json
{
  "id": 1,
  "name": "Development",
  "comment": "Software development work",
  "visible": true,
  "billable": true,
  "color": "#1976d2",
  "color-safe": "dark",
  "number": "ACT-001",
  "project": 1,
  "metaFields": [
    { "name": "department", "value": "engineering" }
  ]
}
```

Stored in `test/__fixtures__/activity_single.json`.

### Created/Updated Shapes

Some resources return a slightly different shape after create/update. For example, a created timesheet includes nested objects:

```json
{
  "id": 3,
  "user": { "id": 1, "username": "admin" },
  "activity": {
    "id": 1,
    "name": "Development",
    "project": { "id": 1, "name": "Website Redesign" }
  },
  "project": { "id": 1, "name": "Website Redesign" },
  "begin": "2024-01-16T09:00:00+00:00",
  "end": null,
  "duration": null,
  "description": "New timesheet entry",
  "exportable": false,
  "metaFields": []
}
```

Stored in `test/__fixtures__/timesheet_created.json`.

### Error Shapes

Error fixtures capture the vendor's error response structure:

```json
{
  "code": 404,
  "message": "Activity with id \"999\" not found"
}
```

Tests verify these map to typed error classes:

```typescript
it('should throw NotFoundError on 404', async () => {
  mockTransport.request.mockRejectedValueOnce(
    createApiError(404, loadFixture('error_404'), '/api/activities/999')
  );

  await expect(client.activities.get(999)).rejects.toThrow(NotFoundError);
});
```

## FetchTransport Tests

The `test/client.test.ts` suite verifies the production `FetchTransport` by mocking `global.fetch` with Vitest's `vi.stubGlobal()`:

### Mock Fetch Setup

```typescript
describe('FetchTransport', () => {
  let transport: FetchTransport;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    transport = new FetchTransport(BASE_URL, TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
```

### URL Construction Verification

Tests verify URL construction from `baseUrl` + `path`:

```typescript
it('should construct URL from baseUrl and path', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => [],
  });

  await transport.request({ method: 'GET', path: '/api/activities' });

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringMatching(/^https:\/\/api\.kimai\.test\/api\/activities$/),
    expect.any(Object)
  );
});
```

### Query Parameter Encoding

Tests verify query params are encoded correctly:

```typescript
it('should encode simple query parameters', async () => {
  await transport.request({
    method: 'GET',
    path: '/api/activities',
    query: { name: 'test', visible: true },
  });

  const [url] = mockFetch.mock.calls[0]!;
  expect(url).toContain('name=test');
  expect(url).toContain('visible=true');
});

it('should encode array query parameters', async () => {
  await transport.request({
    method: 'GET',
    path: '/api/timesheets',
    query: { users: [1, 2, 3] },
  });

  const [url] = mockFetch.mock.calls[0]!;
  expect(url).toContain('users=1');
  expect(url).toContain('users=2');
  expect(url).toContain('users=3');
});
```

### Authentication Header

Tests verify the `X-AUTH-TOKEN` header is set:

```typescript
it('should include auth token in headers', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => [],
  });

  await transport.request({ method: 'GET', path: '/api/activities' });

  const [, options] = mockFetch.mock.calls[0]!;
  expect(options.headers).toEqual(
    expect.objectContaining({
      'X-AUTH-TOKEN': TOKEN,
    })
  );
});
```

## Resource Client Tests

### Test Organization

Each resource client has a corresponding test file in `test/resources/`:

```
test/resources/
  ├── activity.test.ts
  ├── customer.test.ts
  ├── project.test.ts
  ├── timesheet.test.ts
  ├── user.test.ts
  ├── team.test.ts
  ├── invoice.test.ts
  ├── approval_bundle.test.ts
  ├── config.test.ts
  ├── system.test.ts
  ├── export.test.ts
  ├── actions.test.ts
  └── tag.test.ts
```

### Standard Test Structure

Each resource test follows the same pattern:

1. **Setup:** Create mock transport and client
2. **List tests:** Verify `list()` and `listAll()` call correct endpoint
3. **Get tests:** Verify `get(id)` constructs path correctly
4. **Create tests:** Verify `create(input)` sends correct body
5. **Update tests:** Verify `update(id, input)` sends correct body
6. **Delete tests:** Verify `delete(id)` calls correct endpoint
7. **Special operations:** Verify sub-resource endpoints (rates, comments, meta, etc.)
8. **Helper tests:** Verify `resolve()`, `search()`, `getContext()` behavior

### Example: Activity Client Tests

```typescript
describe('ActivityClient', () => {
  let mockTransport: HttpTransport;
  let client: ApiClient;

  beforeEach(() => {
    mockTransport = {
      request: vi.fn().mockResolvedValue(loadFixture('activity')),
    };
    client = new ApiClient({
      baseUrl: 'https://api.kimai.test',
      token: 'test-token',
      transport: mockTransport,
    });
  });

  describe('listAll', () => {
    it('should fetch all activities', async () => {
      const activities = await client.activities.listAll();

      expect(mockTransport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities',
      });
      expect(activities).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should fetch a single activity', async () => {
      mockTransport.request = vi.fn().mockResolvedValue(
        loadFixture('activity_single')
      );

      const activity = await client.activities.get(1);

      expect(mockTransport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities/1',
      });
      expect(activity.id).toBe(1);
    });
  });

  describe('getRates', () => {
    it('should fetch activity rates', async () => {
      mockTransport.request = vi.fn().mockResolvedValue(
        loadFixture('activity_rate')
      );

      await client.activities.getRates(1);

      expect(mockTransport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/activities/1/rates',
      });
    });
  });
});
```

## Pagination Testing

### Non-Paginated Resources

Non-paginated resources (activities, customers, projects, users, teams, tags) must NOT send `page`/`size` params:

```typescript
it('should not send page params for non-paginated endpoint', async () => {
  await client.activities.listAll();

  expect(mockTransport.request).toHaveBeenCalledWith(
    expect.not.objectContaining({
      query: expect.objectContaining({ page: expect.anything() })
    })
  );
});
```

### Paginated Resources

Paginated resources (timesheets, invoices) accept `page`/`size` and stream pages:

```typescript
it('should send page params for paginated endpoint', async () => {
  await client.timesheets.listAll({ page: 2, size: 50 });

  expect(mockTransport.request).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.objectContaining({ page: 2, size: 50 })
    })
  );
});
```

## Error Handling Tests

### Error Hierarchy

Tests verify that HTTP status codes map to typed error classes:

```typescript
describe('error handling', () => {
  it('should throw BadRequestError on 400', async () => {
    mockTransport.request.mockRejectedValueOnce(
      createApiError(400, loadFixture('error_400'), '/api/activities')
    );

    await expect(client.activities.listAll()).rejects.toThrow(BadRequestError);
  });

  it('should throw NotFoundError on 404', async () => {
    mockTransport.request.mockRejectedValueOnce(
      createApiError(404, loadFixture('error_404'), '/api/activities/999')
    );

    await expect(client.activities.get(999)).rejects.toThrow(NotFoundError);
  });

  it('should throw RateLimitError on 429', async () => {
    mockTransport.request.mockRejectedValueOnce(
      createApiError(429, loadFixture('error_429'), '/api/activities')
    );

    await expect(client.activities.listAll()).rejects.toThrow(RateLimitError);
  });
});
```

### Structured Error Fields

Tests verify the structured error contract fields are populated:

```typescript
it('should populate structured error fields', async () => {
  const error = createApiError(
    429,
    { code: 429, message: 'Rate limit exceeded' },
    '/api/activities'
  );

  expect(error).toMatchObject({
    status: 429,
    category: 'rate_limit',
    retryable: true,
    httpStatus: 429,
    operation: expect.any(String),
    correlationId: expect.stringMatching(/^[a-f0-9-]+$/),
  });
});
```

## Coverage Strategy

### Fixture-Based Coverage

Every endpoint must have:
1. **Success fixture** — typical successful response
2. **Request verification** — path/method/query/body correct
3. **Response parsing** — fixture parses to correct type

### Edge Case Fixtures

Additional fixtures cover edge cases:
- Empty arrays (`activity_empty.json`)
- Null/missing fields (`timesheet_no_end.json`)
- Special response shapes (`approval_overtime_year.json`)

### No Real API Calls

The entire test suite runs without making a single real API call:
- Faster execution (< 1 second for 100+ tests)
- Deterministic (no flaky network issues)
- Offline-capable (no credentials required)
- Safe (no side effects on real data)

## Related Documentation

- Transport interface: `src/client.ts`
- Error hierarchy: `src/errors.ts`, ARCHITECTURE.md §5
- Response envelope contract: ARCHITECTURE.md §8
- Pagination strategy: ARCHITECTURE.md §6
- Test configuration: `vitest.config.ts`
- Coverage gates: 90% lines/statements, 80% functions
