---
type: test strategy
title: Unit Test Strategy
description: Vitest setup, fixture-based mocking approach, resource client test coverage, MCP catalog tests, error identity tests, and the served-text single-source rule
tags: [testing, vitest, fixtures, mocking, coverage]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-e682e98a3f4ab8bf67c3721d
    resource: repo://test/client.test.ts
  - id: openwiki-source-863ee412c15681b0e4e87b0f
    resource: repo://test/mcp-catalog.test.ts
  - id: openwiki-source-0d4a2fbf2755f159a94b49cb
    resource: repo://test/mcp-served-text.test.ts
  - id: openwiki-source-12d212f31e14006e72eb5f18
    resource: repo://test/resources/timesheet.test.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Unit Test Strategy

The unit test suite validates client behavior, transport mechanics, error handling, and MCP surface contracts using vitest with fixture-based mocking.

## Test Framework Configuration

The test suite uses vitest as the test runner, configured in repo://vitest.config.ts. The setup includes:

- **Coverage thresholds**: lines/functions/branches/statements = 90/90/80/90 (enforced via `npm run coverage` and CI)
- **Coverage exclusions**: entry points (repo://src/index.ts), type definitions (repo://src/types/**/*.ts), and resource indexes (repo://src/resources/index.ts)
- **Module resolution fix**: The errors module is aliased to resolve the same module instance for both sources and tests, preventing cross-copy `instanceof` failures when checking error types

The resolution alias at repo://vitest.config.ts#L13-L15 ensures that when sources import the errors module by the package's own name (see `tsup.config.ts` external), the test graph sees the SAME module instance as the tests' relative `../src/errors` imports.

## Fixture-Based Mocking Approach

Tests use JSON fixtures stored in `test/__fixtures__/` to provide realistic API responses without depending on a live Kimai server. This approach:

- Loads fixtures synchronously with `readFileSync` and `JSON.parse`
- Mocks the global `fetch` function using `vi.fn()` and `vi.stubGlobal`
- Constructs mock responses with `ok`, `status`, `headers`, and `json`/`text`/`arrayBuffer` methods
- Resets mocks between tests with `vi.restoreAllMocks()` in `afterEach`

The fixture loader at repo://test/client.test.ts#L20-L22 provides a standard pattern reused across test files.

## Transport and Client Tests

The transport layer is tested independently from resource clients to isolate HTTP mechanics from business logic.

### FetchTransport Tests (repo://test/client.test.ts#L24-L698)

Validates HTTP request construction and response parsing:

- **URL construction**: Handles paths with/without leading slashes, constructs full URLs from base + path
- **Query parameters**: Encodes simple values, arrays, skips undefined/null, handles empty query objects
- **Headers**: Sets `Authorization` with Bearer token, sets `Content-Type: application/json`, allows custom header overrides
- **Request body**: JSON stringifies POST/PATCH bodies, skips body for GET, moves GET/DELETE body to query params
- **HTTP methods**: Supports GET, POST, PATCH, DELETE
- **Response parsing**: Parses JSON responses, handles 204/205 no content, handles text/plain responses, falls back to text when Content-Type is not JSON, tries to parse JSON from non-JSON Content-Type, respects `responseType` parameter (text/arraybuffer)
- **Error handling**: Throws typed errors for 400/401/403/404/422/429/5xx status codes, extracts message from response `message` or `title` fields, falls back to HTTP status text, handles text error responses when JSON parsing fails, includes request URL in errors

### ApiClient Tests (repo://test/client.test.ts#L759-L869)

Validates the high-level client wrapper:

- **Constructor**: Stores baseUrl/token, strips trailing slashes from baseUrl, creates FetchTransport when no transport provided, accepts custom transport, creates all resource clients
- **HTTP methods**: Delegates `get`/`post`/`patch`/`delete` calls to transport with correct method/path/query/body parameters

## Resource Client Test Coverage

Resource clients are tested using an injected transport mock, allowing verification of request construction without actual network calls. The timesheet tests at repo://test/resources/timesheet.test.ts demonstrate the pattern:

### List Operations with User Filter Override

The `list`, `listAll`, and `listPages` methods inject `user: 'all'` when no user filter is provided, but respect explicit user/users filters when present. This prevents inadvertent visibility restrictions.

### Pagination Behavior

- **list**: Streams unwrapped records as an AsyncIterable, includes pagination params (page/size)
- **listAll**: Collects every page until an empty response or fewer items than size, starts from page 1 by default, respects custom page/size params
- **listPages**: Yields page metadata `{items, page, size, hasMore}` as async iterable, determines `hasMore` from full page size (page equals size → more may exist)

### CRUD Operations

Standard resource methods (get/create/update/delete) delegate to transport with appropriate HTTP method and path construction. Tests verify exact request shape including method, path, query, and body fields.

### Error Identity Tests

Error handling tests at repo://test/resources/timesheet.test.ts#L505-L517 and repo://test/resources/timesheet.test.ts#L1050-L1136 verify:

- Errors are instances of the correct class (NotFoundError, BadRequestError, etc.)
- Errors carry structured fields: `code`, `category`, `retryable`, `httpStatus`, `correlationId`, `vendorError`, `suggestedAction`
- 429 responses extract `retryAfter` from the `Retry-After` header
- 404 responses normalize to `NOT_FOUND` with category `not_found` and `retryable: false`
- 400 responses normalize to `BAD_REQUEST` with category `validation`
- Correlation IDs are UUIDs generated per request

These tests use the REAL `FetchTransport` with stubbed global `fetch`, proving error contract behavior at the wire edge.

## MCP Catalog Tests

The MCP catalog tests at repo://test/mcp-catalog.test.ts validate the generated data surface against the capabilities registry:

### Catalog Structure (repo://test/mcp-catalog.test.ts#L33-L40)

- One row per registry operation
- Catalog is sorted by operation name
- Plan hash matches the registry group's plan hash
- Every row is reachable or carries a refusal reason

### Dispatch Operations (repo://test/mcp-catalog.test.ts#L52-L58)

- Operations are split by effect (read/write/destructive)
- Each effect enum contains only operations matching that effect
- Operations are sorted within each effect

### Core Tier and META Tools (repo://test/mcp-catalog.test.ts#L60-L71)

- Core tier contains exactly 10 tools
- Five META tools: `kimai_catalog`, `kimai_describe`, `kimai_read`, `kimai_write`, `kimai_delete`
- Each META tool has a description longer than 40 characters
- Core rule defines threshold and requirements R1-R5
- Write dispatcher's operation enum matches `DISPATCH_OPERATIONS.write`

### Exposed Tool Names (repo://test/mcp-catalog.test.ts#L73-L79)

- Every exposed tool is registry-backed
- Tool names follow `kimai_*` convention
- Example: `timesheets.search` → `kimai_search_timesheets`

### Input Contract Tests (repo://test/mcp-catalog.test.ts#L201-L267)

- One closed contract per dispatchable operation
- Each contract's schema sets `additionalProperties: false`
- Required fields are declared in schema.required when present
- Dispatch input schema has one closed branch per operation for each effect
- Confirmation-gated writes require both `input` and `confirm` in branch.required

## Served-Text Single-Source Rule

The served-text tests at repo://test/mcp-served-text.test.ts enforce a critical contract: **the text this SDK serves to an MCP host must be TRUE against its sources**. This prevents the node-hudu #70 failure class where served contracts claim ABSENCE or CLOSURE that the vendor spec contradicts.

### Test Structure

Each test pins one property against a source of truth:

- **Vendored spec** (repo://api-docs.json): OpenAPI spec defining vendor endpoints, parameters, request bodies, and response shapes
- **Generated registry** (repo://capabilities.json): Operation catalog with effect, inputSchema, pagination, and flags
- **SDK source code**: Type definitions, unions, and implementation logic

### Vendor-Required Write Fields (repo://test/mcp-served-text.test.ts#L74-L97)

For every operation with a request body in the vendor spec:

1. The served contract MUST carry a body field (array or object with properties)
2. The served field MUST list every vendor-required field in its `required` array
3. The served field MUST include every vendor property in its `properties`

This prevents serving an opaque object when the spec declares required fields, which would make closure claims dishonest.

### Open Body Contract (repo://test/mcp-served-text.test.ts#L99-L113)

When the vendor spec leaves a request body open (`additionalProperties` is undefined or true):

- The served body field MUST NOT set `additionalProperties: false`
- The served contract note MUST state "passed through, never refused" for the body field
- The served contract note MUST state "unknown field is refused" for the top-level form (the boundary where closure IS enforced)

This prevents claiming closure inside a vendor body the spec leaves open, while still documenting the actual closure boundary at the tool's input level.

### SDK Type Corrections (repo://test/mcp-served-text.test.ts#L115-L137)

When the registry types an argument generically (e.g., 'object') but the SDK source defines a specific union or array schema:

- The served schema MUST reflect the SDK's actual type (string enum, anyOf union, array with item schema)
- Union arguments are served as `anyOf` with each variant's schema
- Array arguments are served as `type: "array"` with an `items` schema
- Example: `actions.getActions.resource` is served as a string enum extracted from the SDK's `ActionResource` type, not as a generic object

### Pagination Mode Pins (repo://test/mcp-served-text.test.ts#L139-L161)

For every `*.list` operation:

- The registry pagination mode MUST match the vendor spec's query parameters
- If the spec declares `page` or `size` params → mode is "page" with vendorDefaultPageSize/vendorMaxPageSize
- If the spec has no pagination params → mode is "none"
- Currently: invoices + timesheets paginate (mode: "page"), six single-batch resources have mode: "none"

### Confirmation Agreement (repo://test/mcp-served-text.test.ts#L164-L189)

For approval-gated writes (registry flag `requiresApproval`):

- The `kimai_write` META tool's `confirm` argument MUST list the operation in its description
- Every catalog row with `confirm_required: true` MUST have a dispatch branch requiring `confirm` with `const: <operation>`
- The converse: no branch may require a confirmation the catalog does not serve

### Why This Rule Exists

The node-hudu #70 incident revealed that serving contracts claiming closure or absence without validating against the vendor spec creates a trust failure:

1. Host sees "exactly these fields" in the served note
2. Host builds a payload with only those fields
3. Vendor rejects the request because spec-required fields are missing
4. Host cannot determine if the SDK lied or the vendor changed

The served-text rule prevents this by **pinning every closure/absence claim to a verifiable source** (vendor spec, SDK source, or registry). Tests FAIL if the SDK cannot evaluate the pin (e.g., api-docs.json is missing), forcing manual investigation before the false claim ships.

## Coverage Enforcement

The test suite enforces coverage thresholds automatically:

- Lines: 90%
- Functions: 90%
- Branches: 80%
- Statements: 90%

Coverage is checked via `npm run coverage` in CI and before publish. Uncovered code paths trigger CI failure, preventing quality regression.
