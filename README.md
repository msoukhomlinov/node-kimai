# node-kimai

[![npm version](https://img.shields.io/npm/v/node-kimai.svg)](https://www.npmjs.com/package/node-kimai)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node >= 20](https://img.shields.io/badge/node->=20-green.svg)](https://nodejs.org/)

TypeScript API client SDK for [Kimai](https://www.kimai.org/) time-tracking software.

Full coverage of the Kimai Pro API v1.1 (66 paths, 52 schemas, 13 resources) with zero runtime dependencies.

## Features

- **Full API coverage** — All 66 API endpoints across 13 resources
- **Type-safe** — Complete TypeScript types for every request and response
- **Zero runtime deps** — Uses native `fetch`; no extra packages
- **Dual ESM + CJS** — Works in any Node.js environment (>= 20)
- **MCP-first design** — Plain `T` / `T[]` returns, no wrapper envelopes
- **Transport-injectable** — Drop-in compatibility with n8n and other runtimes
- **Typed errors** — Catchable error hierarchy per HTTP status code

## Installation

```bash
npm install node-kimai
# or
pnpm add node-kimai
# or
yarn add node-kimai
```

Requires Node.js >= 20 (for native fetch).

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
const activities = await client.activities.getAll();
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

## Usage by Resource

The SDK exposes 13 resource clients on the `ApiClient` instance. Each client provides type-safe methods matching the Kimai API.

### Activities

```typescript
import { ApiClient } from 'node-kimai';

const client = new ApiClient({ baseUrl, token });

// List all activities (non-paginated)
const activities = await client.activities.getAll();

// List with filters
const visibleActivities = await client.activities.list({ visible: true, customer: 3 });

// Get single activity
const activity = await client.activities.getById(1);

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
// List all customers (non-paginated)
const customers = await client.customers.getAll();

// Filter by visibility
const visible = await client.customers.list({ visible: true });

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
// List projects
const projects = await client.projects.getAll();

// Filter by customer
const customerProjects = await client.projects.list({ customer: 3 });

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
// List timesheets (paginated; defaults to all users)
// NOTE: on paginated endpoints `list()` fetches the FIRST page only.
const recent = await client.timesheets.list({ begin: '2026-08-01' });

// Fetch ALL pages
const allTimesheets = await client.timesheets.getAll();

// Iterate pages
for await (const page of client.timesheets.listPages({ size: 100 })) {
  console.log(`Processed ${page.length} timesheets`);
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
// List users
const users = await client.users.getAll();

// Get current API key owner
const me = await client.users.getMe();

// Get specific user
const user = await client.users.getById(2);

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
// List all tags
const tags = await client.tags.getAll();

// Create tag
const tag = await client.tags.create({ name: 'urgent', color: '#ff0000' });

// Find tags by name
const found = await client.tags.find('urgent');

// Delete tag
await client.tags.delete(tag.id!);
```

### Teams

```typescript
// List teams
const teams = await client.teams.getAll();

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
// List invoices (paginated)
const invoices = await client.invoices.getAll();

// Filter by customer
const customerInvoices = await client.invoices.list({ customer: 3 });

// Iterate pages
for await (const page of client.invoices.listPages({ size: 50 })) {
  console.log(`Page with ${page.length} invoices`);
}

// Get single invoice
const invoice = await client.invoices.getById(1);

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

The SDK throws typed errors for every non-2xx response. All errors extend `ApiError` and expose `status`, `message`, `data`, `request`, and optional `code`.

```typescript
import { ApiClient, ApiError, NotFoundError, RateLimitError } from 'node-kimai';

const client = new ApiClient({ baseUrl, token });

try {
  const activity = await client.activities.getById(9999);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Activity not found');
  } else if (err instanceof RateLimitError) {
    console.log('Rate limited, retry later');
  } else if (err instanceof ApiError) {
    console.error(`API error ${err.status}:`, err.message);
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

The SDK supports subpath imports for tree-shaking and reduced bundle size:

```typescript
// Main entry (everything)
import { ApiClient } from 'node-kimai';

// Resource clients only
import { ActivityClient, TimesheetClient } from 'node-kimai/resources';

// Types only
import type { Activity, Timesheet, User } from 'node-kimai/types';

// Errors only
import { ApiError, NotFoundError } from 'node-kimai/errors';
```

## MCP Server Usage

This SDK is designed as the foundation for MCP (Model Context Protocol) servers. Its MCP-friendly characteristics:

- **Plain returns** — Every read returns `T` or `T[]`, never wrapped in envelopes
- **No runtime validation** — Zod stays consumer-side; the SDK does not add validation overhead
- **Typed errors** — Structured error types for clean tool error reporting
- **`getAll()` methods** — One-call fetch for MCP tool inputs (preferred over pagination)

When building an MCP server with this SDK:

1. Use `getAll()` for tool inputs that need complete data (e.g., `list_activities`)
2. Use `list()` with filters for targeted queries on NON-paginated resources; on paginated ones (timesheets, invoices) it returns the first page only — prefer `getAll()` for tool inputs
3. Wrap SDK errors into MCP tool errors with `err.status` and `err.message`
4. Use deep imports (`node-kimai/types`) to avoid bundling unused code

See `examples/mcp-usage.ts` for a minimal MCP integration pattern.

## License

MIT
