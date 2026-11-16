---
type: Architecture
title: Type System and Schema Organization
description: TypeScript type organization across 13 resources, naming conventions for entities/collections/forms, and the dual module export strategy
tags: [types, typescript, schema, api, resources]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-d1fbef09192ffbab6eff0bc2
    resource: repo://src/index.ts
  - id: openwiki-source-bf48a8902a38b2ea421ffd0f
    resource: repo://src/resources/TimesheetClient.ts
  - id: openwiki-source-4dacc930531c4e86b950afe0
    resource: repo://src/types/activity.ts
  - id: openwiki-source-a7e5a655994da22018f04310
    resource: repo://src/types/approval_bundle.ts
  - id: openwiki-source-795e1a7dc3ec1be94d67ae7d
    resource: repo://src/types/common.ts
  - id: openwiki-source-769a848891fab9cf972935cc
    resource: repo://src/types/customer.ts
  - id: openwiki-source-b95d8da3a2f5037f67d1c7d1
    resource: repo://src/types/export.ts
  - id: openwiki-source-1478731ef2ae53c3fda40b6c
    resource: repo://src/types/index.ts
  - id: openwiki-source-a14150d2f834e86779488597
    resource: repo://src/types/invoice.ts
  - id: openwiki-source-983cce29faad16de7591842c
    resource: repo://src/types/project.ts
  - id: openwiki-source-3f687055a30c1b5dd833d9fb
    resource: repo://src/types/system.ts
  - id: openwiki-source-27eff420b17262a5796834ac
    resource: repo://src/types/tag.ts
  - id: openwiki-source-0570a046b1b7907830d10158
    resource: repo://src/types/team.ts
  - id: openwiki-source-d3bdb689f3740da9f3ea6571
    resource: repo://src/types/timesheet.ts
  - id: openwiki-source-1e8d2628b64c7214c10af0c6
    resource: repo://src/types/user.ts
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# Type System and Schema Organization

## Overview

The SDK organizes TypeScript types across 13 resource files in `src/types/`, each representing a Kimai API domain: `activity`, `customer`, `project`, `timesheet`, `user`, `tag`, `team`, `invoice`, `approval_bundle`, `system`, `export`, and shared `common` types. All type files are generated and marked with `DO NOT EDIT MANUALLY` headers.

## Type File Organization

### Barrel Export Pattern

The type system uses a barrel export at `src/types/index.ts` that re-exports all resource types. This barrel file is also generated and contains exports for all 11 resource modules plus the common types module.

### Dual Module Export Strategy

The SDK provides two export paths for types:

1. **Root wildcard export**: The main entry point (`src/index.ts`) exports all types using `export type * from './types'`, making every type available directly from the package root.

2. **Dedicated `/types` subpath**: The `package.json` exports map defines a separate `node-kimai/types` entry point that provides direct access to the types module with both ESM (`.js`/`.d.ts`) and CJS (`.cjs`/`.d.cts`) builds.

This dual strategy allows consumers to import types either from the root package (`import type { Activity } from 'node-kimai'`) or from the dedicated types subpath (`import type { Activity } from 'node-kimai/types'`), with the latter offering a clearer separation of concerns for type-only imports.

## Resource Type Naming Conventions

Each resource file follows a consistent naming pattern with three to five type variants representing different API shapes:

### Core Type Variants

1. **Base interface** (e.g., `Activity`, `Customer`, `Project`): The standard wire format returned by most list and read operations, containing numeric foreign key references (e.g., `project?: number`).

2. **`<Resource>Entity`** (e.g., `ActivityEntity`, `CustomerEntity`, `ProjectEntity`): Extended record shape with additional fields returned by detail endpoints, including embedded child collections (`teams`, `metaFields`), budget fields, and administrative attributes (`parentTitle`, `addressLine1-3`, `memberships`). This variant represents the full server-side entity shape.

3. **`<Resource>Expanded`** (e.g., `ActivityExpanded`, `ProjectExpanded`, `TimesheetExpanded`): Denormalized shape where numeric foreign keys are replaced with embedded full objects. For example, `ActivityExpanded.project` becomes a `ProjectExpanded` object instead of a number, and `TimesheetExpanded.user` becomes a `User` object.

4. **`<Resource>EditForm`** (e.g., `ActivityEditForm`, `CustomerEditForm`, `ProjectEditForm`): Input shape for create and update operations, containing writable fields with appropriate constraints. Foreign keys remain numeric, and some fields that are server-computed (like `id`) are omitted.

5. **`<Resource>CreateForm`** (optional, e.g., `UserCreateForm`): Distinct creation shape when create requirements differ from update (e.g., `plainPassword` required only on user creation).

### Supplementary Types

Each resource also defines:

- **`<Resource>Meta`** interfaces (e.g., `ActivityMeta`, `CustomerMeta`, `ProjectMeta`): Shape of the custom metadata fields collection with `name` and optional `value` properties.

- **`<Resource>Rate`** and `<Resource>RateForm`** (where applicable): Structures for rate records (billing/internal rates) with optional `user` reference, `rate`, `internalRate`, and `isFixed` flag.

- **Other domain-specific types**: For example, `Comment`/`CommentForm` (customer comments), `TeamMember`/`TeamMembership` (team relationships), `TimesheetConfig` (timesheet settings), `UserPreference` (user preferences).

## Phase F Agent Execution Layer Types

Each resource file includes a "Phase F (agent execution layer)" section with specialized types for the SDK's helper operations. These types support the agent-oriented API surface added in Phase F.

### Helper Shape Conventions

1. **`<Resource>Summary`** (e.g., `ActivitySummary`, `TimesheetSummary`, `CustomerSummary`): Compact projection of the full entity that keeps only the fields an agent needs for decision-making. Drops verbose fields like `comment`, `metaFields`, duplicate fields like `"color-safe"`, and deeply nested child collections. Each Summary type documents exactly which fields are kept and dropped, with an `expand: true` escape hatch to retrieve the full record.

2. **`<Resource>Identifier`** (e.g., `ActivityIdentifier`, `ProjectIdentifier`, `UserIdentifier`): Union type documenting the identifier kinds accepted by the resource's `resolve` helper. Typically includes `{ id: number } | { name: string } | number | string`, where bare numbers map to `{ id }` and bare strings map to `{ name }`. Each type includes documentation of resolution semantics (direct fetch vs. server filter vs. client scan).

3. **`<Resource>SearchParams`** (e.g., `ActivitySearchParams`, `TimesheetSearchParams`): Server-driven filter parameters for the `search` helper, mirroring the filters declared in the vendor's OpenAPI spec for that resource's list endpoint. Paging is excluded from these params (handled by the helper's `limit` option instead).

4. **Context shapes** (e.g., `TimesheetContext`, `CustomerContext`, `ProjectContext`): Aggregated shapes returned by `getContext` helpers that fetch a resource plus its related records in a single operation. Each includes a compact base record (the Summary variant) and related references fetched with bounded concurrency. An `Expanded` variant (e.g., `TimesheetContextExpanded`) returns full entity shapes when `expand: true` is passed.

### Shared Agent Layer Types

The `src/types/common.ts` file defines shared agent execution layer types used across all resources:

- **`FieldDiff`**: Represents a before/after field difference for update dry-runs (`field`, `from`, `to` properties).

- **`DryRunResult<T>`**: Dry-run result structure for mutations (policy §7.2) with `operation`, `wouldApply`, `target`, `request`, optional `diff`, `checks`, `impact`, mandatory `simulated: true`, `warnings`, and optional `data`.

- **`ResolutionCandidate`**: Candidate record shape for ambiguous resolution outcomes (`id`, `label`).

- **`Resolution<T>`**: Bounded resolution outcome wrapper (policy §6) with `value`, `resolutionCost` ('direct' | 'server-filter' | 'client-scan'), `scanned` count, `scanTruncated` flag, and optional `candidates` array for ambiguity.

- **`HelperOptions`**: Common options for read helpers (`expand?: boolean`, `resolutionDetails?: boolean`).

- **`MutationOptions`**: Common options for mutations (`dryRun?: boolean`).

- **`OperationMetadata`**: Registry mirror of operation metadata with `name`, `resource`, `endpoint`, `kind`, `effect`, `flags`, and `dryRun` capability.

Compact helper shapes (`RateSummary`, `CommentSummary`) are also defined in `common.ts` and reused across resource contexts to avoid duplication.

## List Parameter Types and Pagination

The `common.ts` file defines list parameter types for each resource (e.g., `ActivityListParams`, `TimesheetListParams`, `InvoiceListParams`) that specify the optional filters available on the corresponding list endpoint. Base `ListParams` includes only `page?: number` and `size?: number`.

### Page Structure

The `Page<T>` interface represents one page of a paginated Kimai list. Because the Kimai API returns a bare array with no totals, the SDK derives `hasMore` honestly from the requested size: `hasMore = items.length === size`. No `total` or `totalPages` is invented. The page structure includes:

- `items: T[]`: The batch of records.
- `page: number`: 1-based page number this batch was requested as.
- `size: number`: Page size requested for this batch.
- `hasMore: boolean`: True when the page was full (the only continuation signal the vendor gives).

## Conventions and Invariants

1. **Generated-only modification**: All type files carry `DO NOT EDIT MANUALLY` headers. Changes must flow through the generation tool (`tools/generate_resources.py`), not direct edits.

2. **Consistent foreign key encoding**: Base and Entity types use numeric foreign keys (e.g., `project?: number`); Expanded types resolve them to embedded objects (e.g., `project: ProjectExpanded`); Form types keep numeric keys for input.

3. **Optional vs. required fields**: The `id` field is always optional on entities (not present before creation). Required creation fields are non-optional in CreateForm types. Update forms make most fields optional except semantic identity fields (e.g., `name`, `country`, `timezone` required in `CustomerEditForm`).

4. **Vendor field preservation**: Vendor-specific fields like `"color-safe"` (a duplicate of `color`) are preserved in Base and Entity types but typically dropped from Summary projections.

5. **Phase F layer separation**: Agent execution layer types (Summary, Identifier, SearchParams, Context, DryRunResult, Resolution) are grouped in dedicated sections below the wire types and document their design rationale in comments referencing the SDK's policy sections (§4, §6, §7, §9).

6. **MetaFields representation**: Custom metadata is always represented as an array of `{ name: string; value?: string }` objects, never as a key-value map, matching the vendor's wire format.

## Type Usage

Resource clients import types from the barrel export using relative paths (`import type { TimesheetEntity, TimesheetSummary, ... } from '../types'`). The SDK's root entry point re-exports all types, making them available to consumers either through the root package or the `/types` subpath.
