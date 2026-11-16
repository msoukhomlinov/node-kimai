---
type: guide
title: Quickstart Guide
description: Entry point for navigating the node-kimai SDK wiki - find documentation by task (using the SDK, building tools, contributing) or by topic (architecture, features, workflows).
tags: [quickstart, navigation, guide, entry-point]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Quickstart Guide

This wiki documents the **node-kimai** TypeScript SDK for the Kimai time-tracking API (v2.0.2). Navigate by task or by topic.

## By Task

### Using the SDK

<!-- openwiki: broken internal link [/openwiki/architecture/client-core.md] link "/openwiki/architecture/client-core.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Client Core](/openwiki/architecture/client-core.md)** — `ApiClient`, transport injection, HTTP verbs, timeout/cancellation
<!-- openwiki: broken internal link [/openwiki/architecture/resource-clients.md] link "/openwiki/architecture/resource-clients.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Resource Clients](/openwiki/architecture/resource-clients.md)** — 13 resource clients (activities, customers, projects, timesheets, users, tags, teams, invoices, approval bundles, config, system, export, actions)
<!-- openwiki: broken internal link [/openwiki/features/error-handling.md] link "/openwiki/features/error-handling.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Error Handling](/openwiki/features/error-handling.md)** — Typed error hierarchy, structured error contract, retryability, `KimaiConfigError`, `ResolutionError`
<!-- openwiki: broken internal link [/openwiki/features/pagination.md] link "/openwiki/features/pagination.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Pagination](/openwiki/features/pagination.md)** — `list()` streams, `listAll()` collections, `listPages()` for paginated resources, page detection
<!-- openwiki: broken internal link [/openwiki/features/timeout-cancellation.md] link "/openwiki/features/timeout-cancellation.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Timeout and Cancellation](/openwiki/features/timeout-cancellation.md)** — Client-level and per-request deadlines, `AbortSignal` composition, typed timeout/network errors

### Building MCP Tools or Agents

<!-- openwiki: broken internal link [/openwiki/features/capability-registry.md] link "/openwiki/features/capability-registry.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Capability Registry](/openwiki/features/capability-registry.md)** — Generated operation metadata (`node-kimai/capabilities`), effect classification, dry-run, helper records
<!-- openwiki: broken internal link [/openwiki/features/mcp-integration.md] link "/openwiki/features/mcp-integration.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[MCP Integration](/openwiki/features/mcp-integration.md)** — Progressive disclosure (CORE tier + catalog), META tools, dispatch operations, closed input contracts
<!-- openwiki: broken internal link [/openwiki/features/agent-execution.md] link "/openwiki/features/agent-execution.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Agent Execution Layer](/openwiki/features/agent-execution.md)** — `resolve` / `search` / `getContext` helpers, dry-run on mutations, structured errors, registry-validated invoke
<!-- openwiki: broken internal link [/openwiki/features/untrusted-content.md] link "/openwiki/features/untrusted-content.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Untrusted Content Marking](/openwiki/features/untrusted-content.md)** — `wrapUntrusted`, `markUntrusted`, `deepMarkUntrusted` for prompt boundaries

### Contributing or Generating

<!-- openwiki: broken internal link [/openwiki/workflows/generation-pipeline.md] link "/openwiki/workflows/generation-pipeline.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Code Generation Pipeline](/openwiki/workflows/generation-pipeline.md)** — Four-stage pipeline: derive-plan, generate-capabilities, project-mcp-tools, build-tool-catalog
<!-- openwiki: broken internal link [/openwiki/operations/verification.md] link "/openwiki/operations/verification.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Verification Gates](/openwiki/operations/verification.md)** — Capability checks, staleness detection, MCP surface checks, public surface guard
<!-- openwiki: broken internal link [/openwiki/testing/unit-tests.md] link "/openwiki/testing/unit-tests.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Unit Test Strategy](/openwiki/testing/unit-tests.md)** — Vitest setup, fixture-based mocking, served-text single-source rule, error identity tests
<!-- openwiki: broken internal link [/openwiki/workflows/transport-injection.md] link "/openwiki/workflows/transport-injection.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Transport Injection Pattern](/openwiki/workflows/transport-injection.md)** — `HttpTransport` interface, `FetchTransport`, n8n integration, signal handling

## By Topic

### Architecture

<!-- openwiki: broken internal link [/openwiki/architecture/client-core.md] link "/openwiki/architecture/client-core.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Client Core](/openwiki/architecture/client-core.md)** — `ApiClient`, `FetchTransport`, HTTP verbs, error wrapping
<!-- openwiki: broken internal link [/openwiki/architecture/resource-clients.md] link "/openwiki/architecture/resource-clients.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Resource Clients](/openwiki/architecture/resource-clients.md)** — 13 resource clients, CRUD operations, special endpoints
<!-- openwiki: broken internal link [/openwiki/features/error-handling.md] link "/openwiki/features/error-handling.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Error Hierarchy](/openwiki/features/error-handling.md)** — Base `ApiError`, status-specific errors, structured contract
<!-- openwiki: broken internal link [/openwiki/operations/sdk-gaps.md] link "/openwiki/operations/sdk-gaps.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[SDK Gaps Register](/openwiki/operations/sdk-gaps.md)** — Known gaps, vendor limitations, upstream issues

### Features

<!-- openwiki: broken internal link [/openwiki/features/capability-registry.md] link "/openwiki/features/capability-registry.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Capability Registry](/openwiki/features/capability-registry.md)** — Operation metadata, effect classification, helper records
<!-- openwiki: broken internal link [/openwiki/features/mcp-integration.md] link "/openwiki/features/mcp-integration.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[MCP Integration](/openwiki/features/mcp-integration.md)** — Progressive disclosure, catalog, dispatch operations
<!-- openwiki: broken internal link [/openwiki/features/agent-execution.md] link "/openwiki/features/agent-execution.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Agent Execution Layer](/openwiki/features/agent-execution.md)** — Helpers, dry-run, structured errors, invoke
<!-- openwiki: broken internal link [/openwiki/features/pagination.md] link "/openwiki/features/pagination.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Pagination](/openwiki/features/pagination.md)** — Streaming lists, page detection, `listPages()`
<!-- openwiki: broken internal link [/openwiki/features/timeout-cancellation.md] link "/openwiki/features/timeout-cancellation.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Timeout and Cancellation](/openwiki/features/timeout-cancellation.md)** — Deadlines, signal composition, typed errors
<!-- openwiki: broken internal link [/openwiki/features/untrusted-content.md] link "/openwiki/features/untrusted-content.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Untrusted Content Marking](/openwiki/features/untrusted-content.md)** — Prompt boundary safety

### Workflows

<!-- openwiki: broken internal link [/openwiki/workflows/generation-pipeline.md] link "/openwiki/workflows/generation-pipeline.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Code Generation Pipeline](/openwiki/workflows/generation-pipeline.md)** — Four-stage pipeline from vendor spec to SDK artifacts
<!-- openwiki: broken internal link [/openwiki/workflows/transport-injection.md] link "/openwiki/workflows/transport-injection.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Transport Injection Pattern](/openwiki/workflows/transport-injection.md)** — `HttpTransport` interface, n8n integration, signal handling

### Operations

<!-- openwiki: broken internal link [/openwiki/operations/verification.md] link "/openwiki/operations/verification.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Verification Gates](/openwiki/operations/verification.md)** — Capability checks, MCP surface checks, public surface guard
<!-- openwiki: broken internal link [/openwiki/operations/sdk-gaps.md] link "/openwiki/operations/sdk-gaps.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[SDK Gaps Register](/openwiki/operations/sdk-gaps.md)** — Known gaps, vendor limitations, tracked issues

### Testing

<!-- openwiki: broken internal link [/openwiki/testing/unit-tests.md] link "/openwiki/testing/unit-tests.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
- **[Unit Test Strategy](/openwiki/testing/unit-tests.md)** — Vitest setup, fixture-based mocking, served-text rule, coverage

## Package Information

- **Package**: `node-kimai` v2.0.2
- **API Coverage**: Kimai Pro API v1.1 (66 paths, 90 operations, 13 resources)
- **Node Requirement**: >= 24.0.0 (native fetch)
- **Module Format**: ESM-first dual ESM+CJS
- **License**: MIT
- **Repository**: [github.com/msoukhomlinov/node-kimai](https://github.com/msoukhomlinov/node-kimai)

## Deep Imports

The SDK supports subpath imports for tree-shaking:

```typescript
import { ApiClient } from 'node-kimai';                           // Everything
import { ActivityClient, TimesheetClient } from 'node-kimai/resources';  // Resource clients only
import type { Activity, Timesheet } from 'node-kimai/types';     // Types only
import { ApiError, NotFoundError } from 'node-kimai/errors';     // Errors only
import { CAPABILITIES, getCapability } from 'node-kimai/capabilities';  // Registry (zero-import)
import { invokeOperation } from 'node-kimai/operations';         // Registry-validated invoke
import { CATALOG, dispatchOperation } from 'node-kimai/mcp';     // MCP catalog + dispatcher
import { wrapUntrusted } from 'node-kimai/untrusted';            // Untrusted-content marking
```

## Quick Reference

### Essential Client Methods

```typescript
// Create client
const client = new ApiClient({ baseUrl, token, timeoutMs?: number });

// Streaming (all pages)
for await (const item of client.timesheets.list(params)) { /* ... */ }

// Collect all
const all = await client.timesheets.listAll(params);

// Page boundaries (paginated resources only)
for await (const page of client.timesheets.listPages(params)) { /* ... */ }

// CRUD operations
const item = await client.activities.get(id);
const created = await client.activities.create(input);
await client.activities.update(id, input);
await client.activities.delete(id);

// Helpers (agent execution layer)
const resolved = await client.timesheets.resolve({ name: 'Task' });
const page = await client.timesheets.search({ customer: 3 }, { limit: 25 });
const context = await client.timesheets.getContext(42);

// Dry-run
const preview = await client.timesheets.create(input, { dryRun: true });
```

### Error Handling

```typescript
try {
  await client.activities.get(9999);
} catch (err) {
  if (err instanceof NotFoundError) {
    // Handle 404
  } else if (err instanceof RateLimitError) {
    console.warn('Retry after', err.retryAfter, 'seconds');
  } else if (err instanceof ApiError) {
    console.error('Category:', err.category, 'Retryable:', err.retryable);
  }
}
```

### Registry and Invoke

```typescript
import { CAPABILITIES, getCapability } from 'node-kimai/capabilities';
import { invokeOperation } from 'node-kimai/operations';

// Query registry
const helpers = CAPABILITIES.filter(c => c.kind === 'helper');
const writes = CAPABILITIES.filter(c => c.effect === 'write');

// Registry-validated invoke
const result = await invokeOperation(client, 'timesheets.create', input, { dryRun: false });
```

## Related Documentation

- **README.md** — Installation, usage examples, API surface
- **ARCHITECTURE.md** — Design goals, module structure, capability table, Phase F agent execution layer
- **docs/API.md** — Full API reference per resource
- **MCP_TOOL_MANIFEST.md** — Projected MCP tool surface
- **capabilities.json** — Generated capability registry
