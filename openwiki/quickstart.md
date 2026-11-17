---
type: quickstart
title: Quickstart
description: Entry point for node-kimai, a TypeScript client SDK for the Kimai time-tracking API. Shows how to construct a client and routes common tasks to the right wiki page.
tags: [quickstart, overview, sdk, kimai]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-6a83ce77327c8f7dc294c306
    resource: repo://examples/quickstart.ts
  - id: openwiki-source-70e4b2761b73c09c7ad31136
    resource: repo://src/client.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Quickstart

node-kimai is a TypeScript API client for Kimai. It uses native `fetch` and has no runtime dependencies. Build and package details are on [build, verify and release](operations/build-verify-release.md).

## Constructing a client

`ApiClient` takes `baseUrl` and `token` (`src/client.ts`). Resource clients hang off it as properties, for example `client.system`, `client.activities`, `client.timesheets` and `client.users`. An abridged version of `examples/quickstart.ts`, which falls back to placeholder values when the env vars are unset:

```ts
import { ApiClient, NotFoundError } from 'node-kimai';

const client = new ApiClient({ baseUrl: process.env.KIMAI_URL!, token: process.env.KIMAI_TOKEN! });
const alive = await client.system.ping();
const activities = await client.activities.listAll();
```

Constructor options, timeouts, transport injection and request behaviour are covered in [client and transport](architecture/client-and-transport.md).

## Where to go for what

| Task | Page |
| --- | --- |
| Change how requests are sent, timed out or authenticated | [client and transport](architecture/client-and-transport.md) |
| Add or change an endpoint wrapper | [resource clients](architecture/resource-clients.md) |
| Understand or catch failures | [errors](architecture/errors.md) |
| Look up what operations exist, their effects and metadata | [capability registry](architecture/capability-registry.md) |
| Call operations by id (dry-run, confirm) | [operations invoke](architecture/operations-invoke.md) |
| Expose the SDK as MCP tools | [MCP catalog and dispatch](architecture/mcp-catalog-and-dispatch.md) |
| Build, run verify gates, pack or publish | [build, verify and release](operations/build-verify-release.md) |

## Importing

The package has several subpath entry points; the authoritative list lives on [build, verify and release](operations/build-verify-release.md).
