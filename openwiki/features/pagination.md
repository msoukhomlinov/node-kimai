---
type: pagination-mechanism
title: Pagination and Streaming
description: The SDK's three-method pagination surface (list/listAll/listPages), AsyncIterable streaming, and hasMore derivation from vendor bare arrays
tags: [pagination, streaming, api-design, kimai-constraints]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-77bd11c58038f91e7a76b901
    resource: repo://src/resources/ActivityClient.ts
  - id: openwiki-source-f5151e7ff9dd86c5755171fb
    resource: repo://src/resources/InvoiceClient.ts
  - id: openwiki-source-9e0b87e93c3e5a77d4cf7feb
    resource: repo://src/resources/paging.ts
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
  - id: openwiki-source-795e1a7dc3ec1be94d67ae7d
    resource: repo://src/types/common.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Pagination and Streaming

The SDK provides a uniform three-method pagination interface across all resource clients, with separate implementations for paginated and non-paginated resources. Kimai's API returns bare arrays without totals, requiring client-side hasMore derivation.

## Three-Method Surface

Every resource client exposes three list methods:

**Paginated resources** (Invoices, Timesheets):
- `list(params?)` — AsyncIterable stream of individual records across pages
- `listAll(params?)` — Promise collecting every record into one array
- `listPages(params?)` — AsyncIterable stream of Page objects with metadata

**Non-paginated resources** (Activities, Customers, Projects, Tags, Teams, Users):
- `list(params?)` — AsyncIterable stream from the single batch
- `listAll(params?)` — Promise returning the complete array

Non-paginated resources do not expose `listPages()` because the vendor returns exactly one batch.

## AsyncIterable Streaming

All `list()` and `listPages()` methods return AsyncIterable, enabling `for await` iteration:

```typescript
// Individual records
for await (const timesheet of client.timesheets.list({ user: 'all' })) {
  console.log(timesheet.id, timesheet.begin);
}

// Whole pages
for await (const page of client.timesheets.listPages({ user: 'all' })) {
  console.log(`Page ${page.page}: ${page.items.length} items, hasMore=${page.hasMore}`);
}
```

Paginated resources walk pages automatically until a short or empty page signals no more data. Non-paginated resources yield from the single batch.

## Page Structure and hasMore Derivation

Paginated methods return `Page<T>` objects:

```typescript
interface Page<T> {
  items: T[];
  page: number;    // 1-based page number
  size: number;    // requested page size
  hasMore: boolean; // derived: items.length === size
}
```

Kimai returns bare arrays without totals or continuation tokens. The SDK derives `hasMore` honestly: `hasMore = items.length === size`. A full page signals more records may exist; a short page (or empty) is the terminal condition.

No `total` or `totalPages` is invented—the vendor does not provide counts.

## Pagination Parameters

Paginated resources accept `page` and `size` params (1-indexed, default page=1, size=100):

```typescript
await client.invoices.listAll({ page: 2, size: 50 });
```

Non-integer or non-positive values throw `KimaiConfigError`—never silently clamped.

## Runaway Loop Guard

The streaming helpers refuse to walk past `MAX_PAGES = 100,000` pages. If that limit is hit, `streamPages()` throws `KimaiConfigError` to prevent infinite loops from upstream bugs or misconfigurations.

## Implementation Details

**Paginated resources** build a `PageFetcher<T>` callback wrapping the vendor endpoint, then delegate to shared helpers in `src/resources/paging.ts`:

- `streamPages(fetch, startPage, size)` — yields Page objects
- `streamItems(fetch, startPage, size)` — yields individual records
- `collectPages(fetch, startPage, size)` — collects all records into one array

**Non-paginated resources** call their `listAll()` directly (which issues one GET), then delegate to `streamOnce(fetch)` for AsyncIterable wrapping.

Seed implementations: `src/resources/InvoiceClient.ts:149-180` (paginated), `src/resources/TimesheetClient.ts:143-176` (paginated with user defaulting), `src/resources/ActivityClient.ts:138-146` (non-paginated).
