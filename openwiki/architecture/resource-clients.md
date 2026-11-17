---
type: architecture
title: Resource Clients, Paging, Dry-Run and Helpers
description: How the per-resource clients are structured, how Kimai's bare-array paging is handled, the dry-run mutation envelope, bounded helper limits, and the timesheet resolve, search and getContext helpers.
tags: [resources, paging, dry-run, helpers, resolve]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-17T00:59:56.546Z
sources:
  - id: openwiki-source-79962e9f34fcc677c99e5e9c
    resource: repo://src/resources/ActionsClient.ts
  - id: openwiki-source-9e0b87e93c3e5a77d4cf7feb
    resource: repo://src/resources/paging.ts
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
  - id: openwiki-source-795e1a7dc3ec1be94d67ae7d
    resource: repo://src/types/common.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-17T00:59:56.546Z" }
---

# Resource Clients, Paging, Dry-Run and Helpers

Each Kimai resource has a client class in `src/resources/`: activities, customers, projects, timesheets, users, tags, teams, invoices, approval bundle, config, system, export and actions. `ApiClient` instantiates each one and exposes it as a property ([client-and-transport.md](client-and-transport.md)). A client receives the `ApiClient` and issues requests through its `get`, `post`, `patch` and `delete` verbs. Path segments are built with `pathId` and `pathToken`, whose rules are owned by [client-and-transport.md](client-and-transport.md). Failures are the typed errors in [errors.md](errors.md).

Each method corresponds to a registry record ([capability-registry.md](capability-registry.md)). `invokeOperation` calls these methods by name ([operations-invoke.md](operations-invoke.md)). `TimesheetClient` is the richest client and is used below as the reference.

## Small clients: `ActionsClient`

`ActionsClient.getActions(resource, id, view, locale)` validates `resource` against the closed set `activity`, `customer`, `project` and `timesheet`, throwing `KimaiConfigError` for anything else. It builds the path with `pathId(id)`, `pathToken(view)` and `pathToken(locale)`.

## Paging

Kimai list endpoints return a bare array with no totals, so `src/resources/paging.ts` derives continuation from the page size:

- `pageParams` defaults `page` to 1 and `size` to 100. A `page` or `size` that is not a positive integer throws `KimaiConfigError`. It is never clamped.
- `streamPages` yields `{ items, page, size, hasMore }` where `hasMore` is true when the page was full (`items.length === size`). It stops after the first short page. It throws `KimaiConfigError` if it would walk past 100,000 pages, as a runaway-loop guard.
- `streamItems` flattens pages into records, `collectPages` collects them into an array, and `streamOnce` serves non-paginated resources, which send no page or size.
- `TimesheetClient.list` returns an async iterable of records. `listPages` returns an async iterable of pages. `listAll` collects every record into an array. When neither `user` nor `users` is given, the list sends `user=all`.

Because `list` and `listPages` return iterables, the invoke layer refuses them. See [operations-invoke.md](operations-invoke.md).

## Dry-run mutations

Every `TimesheetClient` mutation (`create`, `update`, `delete`, `updateMeta`, `stop`, `restart`, `duplicate`, `toggleExport`) accepts `{ dryRun: true }` and then issues no wire call. It returns a `DryRunResult` (`src/types/common.ts`) with these fields:

- `operation`, `wouldApply: true`, `target { resource, ids }` and `request { method, path }`.
- `checks`, a list of named pass or fail entries such as a valid positive target id.
- `impact { affected, scope, reversible }`, `simulated: true`, `warnings`, and `data` (the input that would be applied) when there is one.

`mutationDryRun` always adds two warnings: referenced resources are not verified, and impact is a best-effort estimate. The current record is not fetched, so no diff is computed. For example, a create dry run checks that `project` and `activity` are valid ids and warns when `begin` is missing.

## Bounded helpers

- **Limit.** `helperLimit` defaults a helper `limit` to 25. The maximum is `MAX_HELPER_LIMIT` (100), and a non-integer or out-of-range value throws `KimaiConfigError` instead of being clamped.
- **Compact shapes.** Helpers return `TimesheetSummary` by default (`toTimesheetSummary` keeps id, begin, end, duration, break, user, project, activity, description, rate, exported, billable and tags). `expand: true` returns full records.
- **`search`.** It makes one bounded request with the spec's filters and `size` equal to the limit. It sends `user=all` unless `user` or `users` is given. Without `user` it relies on the vendor's permission to view other users' timesheets, so it needs that permission. The result is sliced to the limit.
- **`getContext(id)`.** It fetches the timesheet, then the user, activity and project in parallel (only for references that are numeric ids), then the project's customer. At most three requests are in flight, then the dependent customer read.
- **`getActive`.** It is caller-scoped: it serves the API key's own running timesheets and takes no user parameter.

## Resolution

`timesheets.resolve(identifier)` accepts `{ id }`, `{ begin }`, a bare number, a numeric string or a begin-timestamp string. An empty string, or an object without `id` or `begin`, throws `KimaiConfigError`.

- An id is a direct fetch. A miss throws `NOT_FOUND` and never returns `null`.
- A begin value is one server-filtered read (`begin=<value>&user=all`) with a single page of `RESOLVE_SCAN_PAGE_SIZE` (500) records. Zero hits give `null`, one hit gives the record, and more than one throws `RESOLUTION_AMBIGUOUS` with the candidate ids ([errors.md](errors.md)). The vendor's begin filter means "at or after", so a stale timestamp commonly matches several records and is ambiguous.
- By default the result is a compact summary. `expand: true` returns the full record, and `resolutionDetails: true` returns a `Resolution` wrapper with `value`, `resolutionCost` (`direct`, `server-filter` or `client-scan`), `scanned`, `scanTruncated` and optional `candidates`.
