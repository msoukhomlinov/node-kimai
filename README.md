# node-kimai

[![npm version](https://img.shields.io/npm/v/node-kimai.svg)](https://www.npmjs.com/package/node-kimai)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node->=24-green.svg)](https://nodejs.org/)

TypeScript API client SDK for [Kimai](https://www.kimai.org/) time-tracking software.

Full coverage of the Kimai Pro API v1.1 (66 paths, 52 schemas, 13 resources) with zero runtime dependencies.

## Features

- **Full API coverage** — All 66 API paths / 90 endpoint operations across 13 resources
- **Type-safe** — Complete TypeScript types for every request and response
- **Zero runtime deps** — Uses native `fetch`; no extra packages
- **ESM-first, dual ESM + CJS** — `type: module`; ESM artifacts use `.js` / `.d.ts` and CJS companions use `.cjs` / `.d.cts`. Requires Node.js >= 24
- **Streaming lists** — `list()` is an `AsyncIterable<T>` that walks every page, `listAll()` collects the whole set, and `listPages()` streams `Page<T>` records on the paginated resources
- **MCP-first design** — Plain `T` / `T[]` returns, no wrapper envelopes, plus a generated MCP tool catalog behind `node-kimai/mcp`
- **Agent execution layer** — `resolve` / `search` / `getContext` helpers, dry-run on every mutation, structured errors, a registry-validated invoke surface, and a generated capability registry
- **Transport-injectable** — Drop-in compatibility with n8n and other runtimes
- **Typed errors** — Catchable error hierarchy per HTTP status code, with a structured error contract

## Installation

```bash
npm install node-kimai
# or
pnpm add node-kimai
# or
yarn add node-kimai
```

Requires Node.js >= 24 (for native fetch). The package is ESM-first (`"type": "module"`): the
ESM entry points are the bare `.js` / `.d.ts` files, and CommonJS consumers are routed to the
`.cjs` / `.d.cts` targets by the `exports` map — no extra configuration is needed.

## Quickstart

```typescript
import { ApiClient } from 'node-kimai';

const client = new ApiClient({
  baseUrl: 'https://kimai.example.com',
  token: 'your-api-token',
});

// Check connectivity
const alive = await client.system.ping();
console.log('Kimai is', alive ? 'up' : 'down');

// Fetch all activities
const activities = await client.activities.listAll();
console.log(`Found ${activities.length} activities`);

// Create a timesheet entry
const entry = await client.timesheets.create({
  activity: 1,
  project: 5,
  begin: '2026-08-10T09:00:00+02:00',
  description: 'Working on node-kimai SDK',
});

console.log('Started timesheet', entry.id);
```

## Streaming and Pagination

The 2.0.0 surface replaces the old first-page-only `list()` with an honest stream:

- `list(params?)` returns an **`AsyncIterable<T>`**. On a paginated resource (timesheets,
  invoices) it walks **every page**; on a non-paginated resource it yields the single batch.
  Consume it with `for await`.
- `listAll(params?)` returns `Promise<T[]>` — the complete collection (all pages concatenated).
- `listPages(params?)` returns `AsyncIterable<Page<T>>` — available **only** on the paginated
  resources (timesheets, invoices). Each `Page<T>` is `{ items, page, size, hasMore }`.

```typescript
// Stream every timesheet, one record at a time (all pages)
for await (const timesheet of client.timesheets.list()) {
  console.log(timesheet.id, timesheet.duration);
}

// Collect the full set in one call
const all = await client.timesheets.listAll({ begin: '2026-08-01' });

// Stream whole pages (paginated resources only)
for await (const page of client.timesheets.listPages({ size: 100 })) {
  console.log(`page ${page.page}: ${page.items.length} items, more=${page.hasMore}`);
}
```

Kimai list endpoints return a **bare array with no totals**, so `hasMore` is derived from the
requested page size: `hasMore = items.length === size`. No `total` or `totalPages` is invented.
A non-integer or non-positive `page` / `size` throws `KimaiConfigError` — it is never silently
clamped.

## Usage by Resource

The SDK exposes 13 resource clients on the `ApiClient` instance. Each client provides type-safe
methods matching the Kimai API.

### Activities

```typescript
import { ApiClient } from 'node-kimai';

const client = new ApiClient({ baseUrl, token });

// Stream all activities (non-paginated: one batch)
for await (const activity of client.activities.list()) {
  console.log(activity.name);
}

// Collect all activities
const activities = await client.activities.listAll();

// Stream with filters (each yielded record)
for await (const a of client.activities.list({ visible: true, customer: 3 })) {
  console.log(a.name);
}

// Get single activity
const activity = await client.activities.get(1);

// Create activity
const newActivity = await client.activities.create({
  name: 'Development',
  project: 5,
  billable: true,
});

// Update activity
await client.activities.update(1, { name: 'Backend Development' });

// Delete activity
await client.activities.delete(1);

// Update custom fields (meta)
await client.activities.updateMeta(1, { region: 'EMEA', priority: 'high' });

// Rate management
const rates = await client.activities.getRates(1);
await client.activities.createRate(1, { rate: 150, user: 2 });
await client.activities.deleteRate(1, 10);

// Team assignment
await client.activities.addToTeam(1, { teams: [1, 2] });
```

### Customers

```typescript
// Fetch all customers (non-paginated)
const customers = await client.customers.listAll();

// Filter by visibility (stream)
for await (const c of client.customers.list({ visible: true })) {
  console.log(c.name);
}

// Create customer
const customer = await client.customers.create({
  name: 'Acme Corp',
  country: 'DE',
  language: 'en',
  currency: 'EUR',
  timezone: 'Europe/Berlin',
});

// Update customer
await client.customers.update(customer.id!, { comment: 'Premium client' });

// Delete customer
await client.customers.delete(customer.id!);

// Custom fields
await client.customers.updateMeta(customer.id!, { department: 'Engineering' });

// Rates
await client.customers.createRate(customer.id!, { rate: 200 });

// Comments
await client.customers.createComment(customer.id!, { body: 'Onboarding complete' });
const comments = await client.customers.listComments(customer.id!);
await client.customers.pinComment(customer.id!, comments[0].id!);
await client.customers.deleteComment(customer.id!, comments[0].id!);

// Team assignment
await client.customers.addToTeam(customer.id!, { teams: [1] });
```

### Projects

```typescript
// Fetch all projects
const projects = await client.projects.listAll();

// Filter by customer (stream)
for await (const p of client.projects.list({ customer: 3 })) {
  console.log(p.name);
}

// Create project
const project = await client.projects.create({
  name: 'Website Redesign',
  customer: 3,
  billable: true,
});

// Update project
await client.projects.update(project.id!, { visible: true });

// Delete project
await client.projects.delete(project.id!);

// Custom fields
await client.projects.updateMeta(project.id!, { sprint: 'S26-Q3' });

// Rates
await client.projects.createRate(project.id!, { rate: 175 });

// Comments
await client.projects.createComment(project.id!, { body: 'Phase 1 complete' });

// Team assignment
await client.projects.addToTeam(project.id!, { teams: [2] });
```

### Timesheets

```typescript
// Stream timesheets across every page (defaults to all users)
for await (const timesheet of client.timesheets.list({ begin: '2026-08-01' })) {
  console.log(timesheet.id);
}

// Collect the full set
const allTimesheets = await client.timesheets.listAll();

// Iterate whole pages
for await (const page of client.timesheets.listPages({ size: 100 })) {
  console.log(`page ${page.page}: ${page.items.length} timesheets`);
}

// Get active (running) timesheets
const active = await client.timesheets.getActive();

// Get recent timesheets
const recentEntries = await client.timesheets.getRecent();

// Create (start) a timesheet
const entry = await client.timesheets.create({
  activity: 1,
  project: 5,
  description: 'API implementation',
});

// Stop a running timesheet
await client.timesheets.stop(entry.id!);

// Restart a stopped timesheet
await client.timesheets.restart(entry.id!);

// Update timesheet
await client.timesheets.update(entry.id!, { description: 'API implementation v2' });

// Duplicate a timesheet
const copy = await client.timesheets.duplicate(entry.id!);

// Toggle export flag
await client.timesheets.toggleExport(entry.id!);

// Custom fields
await client.timesheets.updateMeta(entry.id!, { ticket: 'PROJ-123' });

// Delete timesheet
await client.timesheets.delete(entry.id!);
```

### Users

```typescript
// Fetch all users
const users = await client.users.listAll();

// Get current API key owner
const me = await client.users.getMe();

// Get specific user
const user = await client.users.get(2);

// Create user
const newUser = await client.users.create({
  username: 'jdoe',
  email: 'jdoe@example.com',
});

// Update user
await client.users.update(newUser.id!, { firstname: 'John', lastname: 'Doe' });

// Update preferences
await client.users.updatePreferences(newUser.id!, [
  { name: 'locale', value: 'en' },
  { name: 'timezone', value: 'Europe/London' },
]);

// Delete API token
await client.users.deleteApiToken(5);

// NOTE: Users cannot be deleted via API (no DELETE /users/{id})
```

### Tags

```typescript
// Fetch all tags
const tags = await client.tags.listAll();

// Create tag
const tag = await client.tags.create({ name: 'urgent', color: '#ff0000' });

// Find tags by name
const found = await client.tags.find('urgent');

// Delete tag
await client.tags.delete(tag.id!);
```

### Teams

```typescript
// Fetch all teams
const teams = await client.teams.listAll();

// Create team
const team = await client.teams.create({ name: 'Engineering' });

// Update team
await client.teams.update(team.id!, { name: 'Backend Engineering' });

// Delete team
await client.teams.delete(team.id!);

// Member management
await client.teams.addMember(team.id!, 3);
await client.teams.removeMember(team.id!, 3);

// Resource access control
await client.teams.grantCustomerAccess(team.id!, 5);
await client.teams.revokeCustomerAccess(team.id!, 5);
await client.teams.grantProjectAccess(team.id!, 10);
await client.teams.revokeProjectAccess(team.id!, 10);
await client.teams.grantActivityAccess(team.id!, 20);
await client.teams.revokeActivityAccess(team.id!, 20);
```

### Invoices

```typescript
// Fetch all invoices across all pages
const invoices = await client.invoices.listAll();

// Stream filtered invoices
for await (const inv of client.invoices.list({ customer: 3 })) {
  console.log(inv.id);
}

// Iterate pages
for await (const page of client.invoices.listPages({ size: 50 })) {
  console.log(`Page ${page.page}: ${page.items.length} invoices`);
}

// Get single invoice
const invoice = await client.invoices.get(1);

// Update custom fields
await client.invoices.updateCustomFields(1, [
  { name: 'reference', value: 'INV-2026-001' },
]);

// Download invoice PDF
const pdfBuffer = await client.invoices.download(1); // ArrayBuffer
```

### Approval Bundle

```typescript
// Submit a week for approval
const url = await client.approvalBundle.addToApprove({
  date: '2026-08-10',
  user: 3,
});
console.log('Submitted:', url);

// Get next week status
const next = await client.approvalBundle.nextWeek();

// Check week status
const status = await client.approvalBundle.weekStatus({
  date: '2026-08-10',
});

// Yearly overtime
const overtime = await client.approvalBundle.overtimeYear({
  date: '2026-08-10',
});

// Weekly overtime
const weekly = await client.approvalBundle.weeklyOvertime({
  date: '2026-08-10',
});
```

### Config

```typescript
// Get timesheet configuration
const config = await client.config.getTimesheetConfig();

// Get color configuration
const colors = await client.config.getColors();
```

### System

```typescript
// Health check
const alive = await client.system.ping();

// Version info
const version = await client.system.getVersion();

// Installed plugins
const plugins = await client.system.getPlugins();
```

### Export

```typescript
// Delete export template
await client.export.deleteTemplate(5);

// NOTE: GET /api/export (binary file download) is NOT implemented.
// Use n8n's HTTP helpers or direct fetch for export downloads.
```

### Actions

```typescript
import type { ActionResource } from 'node-kimai';

const resource: ActionResource = 'activity';

// Get UI actions for a resource
const actions = await client.actions.getActions(resource, 1, 'show', 'en');
```

## Error Handling

The SDK throws typed errors for every non-2xx response. All errors extend `ApiError` and expose
`status`, `message`, `data`, `request`, optional `code`, and the structured error contract
(`category`, `retryable`, `operation`, `httpStatus`, `vendorError`, `resourceIds`,
`suggestedAction`, `correlationId`, and `retryAfter` on a 429).

```typescript
import { ApiClient, ApiError, NotFoundError, RateLimitError } from 'node-kimai';

const client = new ApiClient({ baseUrl, token });

try {
  const activity = await client.activities.get(9999);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Activity not found');
  } else if (err instanceof RateLimitError) {
    console.log('Rate limited, retry later');
  } else if (err instanceof ApiError) {
    console.error(`API error ${err.status}:`, err.message);
    console.error('Category:', err.category, 'Retryable:', err.retryable);
    console.error('Raw response:', err.data);
  } else {
    throw err; // Non-API error (network, etc.)
  }
}
```

### Error Hierarchy

| Error Class | Status | Description |
|-------------|--------|-------------|
| `ApiError` | any | Base error for all API errors |
| `BadRequestError` | 400 | Invalid request parameters |
| `UnauthorizedError` | 401 | Invalid or missing token |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `UnprocessableEntityError` | 422 | Validation failed |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ServerError` | 5xx | Server-side error |
| `KimaiConfigError` | — | Local argument refusal, zero fetch, non-retryable |
| `ResolutionError` | — | The bounded `resolve` contract (`RESOLUTION_AMBIGUOUS` / `RESOLUTION_TRUNCATED`) |

## Transport Injection (n8n Integration)

The SDK uses an injectable transport interface, making it easy to integrate with n8n or other runtimes that provide their own HTTP client.

```typescript
import { ApiClient, type HttpTransport, type TransportRequest } from 'node-kimai';

// Custom transport for n8n
class N8nTransport implements HttpTransport {
  constructor(
    private baseUrl: string,
    private token: string,
    private helpers: ILoadOptionsFunctions,
  ) {}

  async request<T>(options: TransportRequest): Promise<T> {
    const url = new URL(options.path, this.baseUrl);

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

// Use with ApiClient
const transport = new N8nTransport(baseUrl, token, this.helpers);
const client = new ApiClient({
  baseUrl,
  token,
  transport,
});
```

## Deep Imports

The SDK supports subpath imports for tree-shaking and reduced bundle size. Every subpath is
declared in `package.json` `exports` and ships both an ESM and a CJS target:

```typescript
// Main entry (everything)
import { ApiClient } from 'node-kimai';

// Resource clients only
import { ActivityClient, TimesheetClient } from 'node-kimai/resources';

// Types only
import type { Activity, Timesheet, User } from 'node-kimai/types';

// Errors only
import { ApiError, NotFoundError } from 'node-kimai/errors';

// Capability registry only (zero-import static data, no SDK runtime pulled in)
import { CAPABILITIES, CAPABILITY_GROUPS, getCapability } from 'node-kimai/capabilities';

// Registry-validated invoke only (no client barrel)
import { invokeOperation, planInvoke, REFUSAL_CODES } from 'node-kimai/operations';

// Generated MCP tool catalog + the effect-split dispatcher
import { CATALOG, CORE_TOOLS, META_TOOLS, describeOperation, dispatchOperation } from 'node-kimai/mcp';

// Untrusted-content marking for prompt/transport boundaries
import { wrapUntrusted, markUntrusted, stripUntrustedDeep } from 'node-kimai/untrusted';
```

## Agent Execution Layer

The primitives above are the endpoint surface. On top of them sits a small agent-facing layer
(everything below is additive). Full details in `ARCHITECTURE.md` §15.

### Helpers

- `resolve(identifier)` — turn a human identifier into a record.
  Accepts `{ id }`, `{ name }`, a bare numeric id or an exact name.
  Several exact matches throw `ResolutionError` (`RESOLUTION_AMBIGUOUS`, candidates in
  `err.resourceIds`); a *full* 500-record page with no exact match throws
  `RESOLUTION_TRUNCATED` — a bounded scan never reports a silent `null`.
- `search(params, { limit })` — one filtered page. `limit` defaults to **25**, maximum **100**;
  anything outside 1…100 throws `KimaiConfigError` (never silently clamped).
- `getContext(id)` — one call for a workflow record plus its references
  (timesheets, customers, projects only).

Helpers return a **compact summary** by default. `{ expand: true }` returns the full record;
`{ resolutionDetails: true }` returns the `Resolution<T>` wrapper (`value`, `scanned`,
`scanTruncated`, `candidates`).

```typescript
const ts = await client.timesheets.resolve({ id: 42 });        // TimesheetSummary | null
const full = await client.timesheets.resolve(42, { expand: true }); // Timesheet | null
const page = await client.timesheets.search({ customer: 3 }, { limit: 50 });
```

### Dry-run every mutation

Every mutation accepts `{ dryRun: true }` and issues **no wire call** — it validates the
arguments and returns what it would send:

```typescript
const preview = await client.timesheets.create(
  { project: 1, activity: 2, begin: '2026-08-10T09:00:00+02:00' },
  { dryRun: true },
);
// preview.simulated === true; preview.target / preview.request / preview.checks / preview.impact
// preview.warnings says the referenced records were not verified and the impact is best-effort
```

### Structured errors

`ApiError` carries a closed `category` (`auth`, `not_found`, `validation`, `conflict`,
`rate_limit`, `server`, `network`, `timeout`, `resolution`, `policy`) and, when known,
`operation`, `retryable`, `httpStatus`, `vendorError`, `resourceIds`, `suggestedAction`,
`correlationId` and `retryAfter` (parsed from `Retry-After` on a 429). `KimaiConfigError` marks
an argument the SDK refused locally — zero fetch, non-retryable.

```typescript
catch (err) {
  if (err instanceof ApiError && err.category === 'rate_limit') {
    // wait err.retryAfter (seconds) before retrying — the transport itself never retries
    console.warn(`retry in ${err.retryAfter ?? 5}s`, err.correlationId);
  }
  // err.correlationId identifies the one request for a server-side trace
}
```

### Capability registry

`node-kimai/capabilities` is generated, zero-import static data describing the whole surface —
one record per implemented operation. It is the same registry the MCP manifest and catalog are
projected from:

```typescript
import { CAPABILITIES } from 'node-kimai/capabilities';

const helpers = CAPABILITIES.filter((c) => c.kind === 'helper');            // 18 helpers
const gated = CAPABILITIES.filter((c) => c.flags.includes('requiresApproval')); // 21 rows
// each record: id, resource, operation, kind, endpoint, effect, flags, dryRun,
// inputSchema, outputSchema, examples, pagination, resolution, retry, errors, compact, tests
```

### Registry-validated invoke

`node-kimai/operations` exposes `invokeOperation(client, operation, input?, options?)` and
`planInvoke(...)`. Validation and governance live in exactly one place: an unknown operation key,
an unknown input field, a missing confirmation, or a streaming operation is refused **before any
wire call**, with a bounded alternative named. Writes are dry-run-first: only an explicit
`{ dryRun: false }` executes.

```typescript
import { invokeOperation, planInvoke } from 'node-kimai/operations';

const plan = planInvoke(client, 'timesheets.create', { project: 1, activity: 2 });
// plan.execute === false, plan.checks / plan.impact describe the call — no wire traffic

const created = await invokeOperation(
  client,
  'timesheets.create',
  { project: 1, activity: 2, begin: '2026-08-10T09:00:00+02:00' },
  { dryRun: false },
);
```

## MCP Server Usage

This SDK is designed as the foundation for MCP (Model Context Protocol) servers. Three shipped
artifacts describe the tool surface, and all of them are projections of the same generated
capability registry — never hand-written:

- **`MCP_TOOL_MANIFEST.md`** — the projected, human-readable tool manifest.
- **`MCP_TOOL_CATALOG.json`** — the machine-readable catalog (the same data as the `./mcp`
  subpath).
- **`node-kimai/mcp`** — the compiled catalog: `CATALOG`, `CORE_TOOLS`, `META_TOOLS`,
  `TOOL_DESCRIPTIONS`, `describeOperation`, plus the effect-split `dispatchOperation` for
  `kimai_read` / `kimai_write` / `kimai_delete`.

When building an MCP server with this SDK:

1. Use `listAll()` for tool inputs that need complete data (e.g., a `list_activities` tool).
2. Use `list()` for a streamed read, and `listPages()` on paginated resources when page
   boundaries matter.
3. Wrap SDK errors into MCP tool errors with `err.status`, `err.category` and `err.message`.
4. Route writes through `dispatchOperation(client, 'write' | 'destructive', operation, input)` so
   the SDK's single governor decides dry-run and confirmation; it delegates to `invokeOperation`.
5. Use deep imports (`node-kimai/types`) to avoid bundling unused code.

MCP-friendly characteristics:

- **Plain returns** — Every read returns `T` or `T[]`, never wrapped in envelopes
- **No runtime validation** — Zod stays consumer-side; the SDK does not add validation overhead
- **Typed errors** — Structured error types for clean tool error reporting
- **`listAll()` / `list()`** — one-call collection or a full stream for tool inputs

See `examples/mcp-usage.ts` for a minimal MCP integration pattern.

## License

MIT
