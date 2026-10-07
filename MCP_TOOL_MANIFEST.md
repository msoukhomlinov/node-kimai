# MCP Tool Manifest — node-kimai

> **Machine-generated** by `scripts/project-mcp-tools.mjs` (`npm run mcp:project`) from
> `capabilities.json` (planHash `c7a8a71fbd684b17…`). Do not hand-edit.
> Curation is recorded in `MCP_TOOL_OVERRIDES.json` and re-applied by the script.

## Projection summary

- registry records: 108
- projected tools: 92 (90 after curation exclusions)
- always-on core tier: 10 tools (5 registry-backed + 5 META)
- catalog entries: 103 (every non-core registry operation)
- excluded by rule: 1 (binary/download)
- subsumed read primitives: 15 (covered by a helper — see below)
- excluded by curation: 2
- overrides applied: 16
- projected at: 2026-10-07T12:34:31.108Z

## Progressive disclosure — the decision

The projected surface is **90 tools**, above the ~10-tool threshold, so the
surface is disclosed **progressively**, not flat. The always-on core is
**10 tools**; every other registry operation is a GENERATED catalog entry reachable
through the dispatch meta-tools. A flat surface is NOT justified here.

The five required properties (mcp-tool-manifest.md) as implemented:

1. **REACHABILITY** — a capability with no dedicated tool is invoked through `kimai_read`
   (effect `read`), `kimai_write` (effect `write`, dry-run first) or `kimai_delete` (effect
   `destructive`, `confirm` required). Dispatch input is validated against the registry
   record's `inputSchema` **before** the SDK call — an argument the record does not declare
   is refused with a typed `CONFIG_ERROR`, never forwarded.
2. **HONESTY** — every registry operation is either in the core or listed in the catalog
   below with its name, purpose and `preferredWhen`, so an agent can learn a capability
   exists and how to reach it instead of concluding the SDK cannot do it.
3. **CORE SET BY EVIDENCE** — the written `CORE_RULE` (R1–R4) below, computed by the
   projection, produces the core list. Two people applying the rule get the same core.
4. **NO GOD-TOOL** — the catalog/dispatch pair is a FALLBACK behind the described core;
   the core alone completes the common read work (identity, bounded search per workflow
   resource). A single unvalidated `operation` dispatcher is never the only tool.
5. **DRIFT** — the catalog and this manifest are generated from `capabilities.json`;
   `npm run mcp:project:check` fails when a registry operation is in neither the core nor
   the catalog, or when this file differs from a fresh projection.

This manifest specifies the required MCP server contract. node-kimai is an MCP-independent SDK:
the server that registers these tools lives in a separate package (see `examples/mcp-usage.ts`
for the data-layer patterns). The dispatch safety rules in property 1 are requirements on that
server, not claims about code in this repository. A host MAY also load any extended tool
on demand in addition to the always-on core.

### CORE_RULE

- **R1** the five META tools (catalog / describe / read / write / delete) — the mechanism.
- **R2** identify the API-key owner (`users.getMe`).
- **R3** discovery is R1: the generated catalog (`kimai_catalog`) + `kimai_describe`. The
  Kimai registry has no cross-resource `resolve`/`searchAcrossResources` operation.
- **R4** one bounded helper-tier read per `workflowResource: true` resource
  (`resources[].workflowResource` in `capabilities.plan.json`). Where a resource has no
  search helper, its bounded week/status read stands in.
- Writes are NOT in the core: they are reachable through `kimai_write` / `kimai_delete`,
  dry-run first, destructive calls confirmation-gated.

## Core tier — always on

| # | tool | backingOperation | rule | effect | description |
|---|------|------------------|------|--------|-------------|
| 1 | `kimai_catalog` | — (serves every operation) | R1 | meta | List the capabilities the node-kimai registry implements with the tool that exposes each one (when it has one), its effect, whether it needs a dry run or a confirmation flag, and the arguments it requires. The tool list on this server is a SUBSET: this is a curated core profile, and the catalog is how you discover a capability that has no tool of its own — find the row, call kimai_describe for the exact schema, then kimai_read/kimai_write/kimai_delete. Bounded: limit defaults to 40 and is hard-capped at 100; prefer a filter over dumping the catalog. |
| 2 | `kimai_describe` | — (serves every operation) | R1 | meta | Return the full input schema, effect, flags, dry-run support, error vocabulary, related operations and preferredWhen guidance for ONE registry operation, so a capability can be called correctly without carrying every schema in context. Use it after kimai_catalog named the operation and before kimai_read/kimai_write/kimai_delete. Takes the canonical operation key exactly as the catalog prints it (for example "timesheets.search") — never a tool name, and there is no fuzzy matching: an unknown key is a CONFIG_ERROR naming the nearest catalog keys. |
| 3 | `kimai_read` | — (serves every operation) | R1 | meta | Execute only effect "read" operations by canonical registry key. Prefer the dedicated bounded search/resolve tools where they exist; use this dispatch for a read with no dedicated tool. `input` is a CLOSED per-operation contract: exactly the operation's declared fields — an unknown field is refused with a typed CONFIG_ERROR before any request. Reads have no dry run and never mutate. |
| 4 | `kimai_write` | — (serves every operation) | R1 | meta | Execute only effect "write" operations by canonical registry key. Mutations default to a dry-run preview (dry_run: true returns the plan; the request is never issued); dry_run: false executes. `input` is a CLOSED per-operation contract — an unknown field is refused before any request. A destructive operation is REFUSED here; use kimai_delete. |
| 5 | `kimai_delete` | — (serves every operation) | R1 | meta | Execute only effect "destructive" operations by canonical registry key. Destructive calls are irreversible and REFUSED without `confirm` equal to the operation key. `input` is a CLOSED per-operation contract. Neither the preview nor the confirmation string is human consent: the host must enforce its own approval policy. |
| 6 | `kimai_get_current_user` | users.getMe | R2 | read | Fetch current user. Read path for users. Primitives return the full typed record. |
| 7 | `kimai_search_timesheets` | timesheets.search | R4 | read | Search timesheets with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100 (out of range throws KimaiConfigError — never silently clamped). Without a user filter the SDK passes user=all (requires the vendor view_other_timesheet permission). Find activity/project/customer ids with kimai_search_activities / kimai_search_projects / kimai_search_customers. Compact TimesheetSummary rows by default; expand: true for the full records. Bounded: limit default 25, hard max 100. Compact TimesheetSummary by default; expand: true returns the full record. |
| 8 | `kimai_search_customers` | customers.search | R4 | read | Search customers with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100. Compact CustomerSummary rows by default; expand: true for the full records. Use kimai_resolve_customer to turn a name into one id. Bounded: limit default 25, hard max 100. Compact CustomerSummary by default; expand: true returns the full record. |
| 9 | `kimai_search_projects` | projects.search | R4 | read | Search projects with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100. Filter by customer/activity ids from kimai_search_customers / kimai_search_activities. Compact ProjectSummary rows by default; expand: true for the full records. Bounded: limit default 25, hard max 100. Compact ProjectSummary by default; expand: true returns the full record. |
| 10 | `kimai_get_week_status` | approvalBundle.weekStatus | R4 | read | Get the approval status of one calendar week for a user: whether it is approved plus its timesheets and total duration. Pass the ISO date (YYYY-MM-DD) that identifies the week; omit `user` for the API-key owner. |

### Core tool detail

#### `kimai_catalog` — Discover Operations (Catalog)

**Backing operation:** none (the disclosure mechanism itself)

**Description:** List the capabilities the node-kimai registry implements with the tool that exposes each one (when it has one), its effect, whether it needs a dry run or a confirmation flag, and the arguments it requires. The tool list on this server is a SUBSET: this is a curated core profile, and the catalog is how you discover a capability that has no tool of its own — find the row, call kimai_describe for the exact schema, then kimai_read/kimai_write/kimai_delete. Bounded: limit defaults to 40 and is hard-capped at 100; prefer a filter over dumping the catalog.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `limit` | `number` | no | Rows per page (default 40, hard max 100). |
| `offset` | `number` | no | Row offset for paging through the catalog. |
| `effect` | `string` | no | Filter to one effect: read \| write \| destructive. |
| `resource` | `string` | no | Filter to one registry resource (e.g. timesheets). |
| `unexposed_only` | `boolean` | no | true = only capabilities with no dedicated tool. |

**Annotations:** readOnlyHint, idempotentHint

---

#### `kimai_describe` — Describe One Operation

**Backing operation:** none (the disclosure mechanism itself)

**Description:** Return the full input schema, effect, flags, dry-run support, error vocabulary, related operations and preferredWhen guidance for ONE registry operation, so a capability can be called correctly without carrying every schema in context. Use it after kimai_catalog named the operation and before kimai_read/kimai_write/kimai_delete. Takes the canonical operation key exactly as the catalog prints it (for example "timesheets.search") — never a tool name, and there is no fuzzy matching: an unknown key is a CONFIG_ERROR naming the nearest catalog keys.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `operation` | `string` | yes | Canonical registry key exactly as the catalog prints it (e.g. "timesheets.search"). |

**Annotations:** readOnlyHint, idempotentHint

---

#### `kimai_read` — Read One Registry Operation

**Backing operation:** none (the disclosure mechanism itself)

**Description:** Execute only effect "read" operations by canonical registry key. Prefer the dedicated bounded search/resolve tools where they exist; use this dispatch for a read with no dedicated tool. `input` is a CLOSED per-operation contract: exactly the operation's declared fields — an unknown field is refused with a typed CONFIG_ERROR before any request. Reads have no dry run and never mutate.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `operation` | `string` | yes | A registry key whose effect is "read". |
| `input` | `object` | no | Closed per-operation contract: exactly the operation's declared fields, nothing else. |

**Annotations:** readOnlyHint, openWorldHint

---

#### `kimai_write` — Write One Registry Operation

**Backing operation:** none (the disclosure mechanism itself)

**Description:** Execute only effect "write" operations by canonical registry key. Mutations default to a dry-run preview (dry_run: true returns the plan; the request is never issued); dry_run: false executes. `input` is a CLOSED per-operation contract — an unknown field is refused before any request. A destructive operation is REFUSED here; use kimai_delete.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `operation` | `string` | yes | A registry key whose effect is "write". |
| `input` | `object` | no | Closed per-operation contract: exactly the operation's declared fields, nothing else. |
| `dry_run` | `boolean` | no | true (default) = return the plan without issuing the write. |

**Annotations:** openWorldHint

---

#### `kimai_delete` — Delete One Registry Operation

**Backing operation:** none (the disclosure mechanism itself)

**Description:** Execute only effect "destructive" operations by canonical registry key. Destructive calls are irreversible and REFUSED without `confirm` equal to the operation key. `input` is a CLOSED per-operation contract. Neither the preview nor the confirmation string is human consent: the host must enforce its own approval policy.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `operation` | `string` | yes | A registry key whose effect is "destructive". |
| `input` | `object` | no | Closed per-operation contract: exactly the operation's declared fields, nothing else. |
| `confirm` | `string` | yes | Must equal the operation key exactly; otherwise the call is refused. |

**Annotations:** destructiveHint, openWorldHint

---

#### `kimai_get_current_user` — Get Current User

**Backing operation:** `users.getMe`

**Description:** Fetch current user. Read path for users. Primitives return the full typed record.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| _none_ | | | |

**Output:** `UserEntity`

**Annotations:** readOnlyHint, openWorldHint

**Example:** `await client.users.getMe()`

**Errors:** CONFIG_ERROR, RATE_LIMITED, SERVER_ERROR

---

#### `kimai_search_timesheets` — Search Timesheets

**Backing operation:** `timesheets.search`

**Description:** Search timesheets with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100 (out of range throws KimaiConfigError — never silently clamped). Without a user filter the SDK passes user=all (requires the vendor view_other_timesheet permission). Find activity/project/customer ids with kimai_search_activities / kimai_search_projects / kimai_search_customers. Compact TimesheetSummary rows by default; expand: true for the full records. Bounded: limit default 25, hard max 100. Compact TimesheetSummary by default; expand: true returns the full record.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `params` | `object` | no | every filter the spec declares on GET /api/timesheets (user/users/customer/customers/project/projects/activity/activities/tags/orderBy/order/begin/end/exported/active/billable/full/modified_after/term); paging is the limit option, not a param |
| `limit` | `number` | no | Max rows (default 25, hard max 100; out of range throws KimaiConfigError — never clamped). |
| `expand` | `boolean` | no | true = return the full typed record instead of the compact shape. |

**Output:** `TimesheetSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)`

**Annotations:** readOnlyHint, openWorldHint

**Example:** `await client.timesheets.search({ begin: '2026-01-01' }, { limit: 25 })`

**Errors:** CONFIG_ERROR, RATE_LIMITED, SERVER_ERROR

---

#### `kimai_search_customers` — Search Customers

**Backing operation:** `customers.search`

**Description:** Search customers with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100. Compact CustomerSummary rows by default; expand: true for the full records. Use kimai_resolve_customer to turn a name into one id. Bounded: limit default 25, hard max 100. Compact CustomerSummary by default; expand: true returns the full record.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `params` | `object` | no | CustomerSearchParams |
| `limit` | `number` | no | Max rows (default 25, hard max 100; out of range throws KimaiConfigError — never clamped). |
| `expand` | `boolean` | no | true = return the full typed record instead of the compact shape. |

**Output:** `CustomerSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)`

**Annotations:** readOnlyHint, openWorldHint

**Example:** `await client.customers.search({ begin: '2026-01-01' }, { limit: 25 })`

**Errors:** CONFIG_ERROR, RATE_LIMITED, SERVER_ERROR

---

#### `kimai_search_projects` — Search Projects

**Backing operation:** `projects.search`

**Description:** Search projects with the spec filters, bounded by an explicit limit. limit defaults to 25, hard max 100. Filter by customer/activity ids from kimai_search_customers / kimai_search_activities. Compact ProjectSummary rows by default; expand: true for the full records. Bounded: limit default 25, hard max 100. Compact ProjectSummary by default; expand: true returns the full record.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `params` | `object` | no | ProjectSearchParams |
| `limit` | `number` | no | Max rows (default 25, hard max 100; out of range throws KimaiConfigError — never clamped). |
| `expand` | `boolean` | no | true = return the full typed record instead of the compact shape. |

**Output:** `ProjectSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)`

**Annotations:** readOnlyHint, openWorldHint

**Example:** `await client.projects.search({ begin: '2026-01-01' }, { limit: 25 })`

**Errors:** CONFIG_ERROR, RATE_LIMITED, SERVER_ERROR

---

#### `kimai_get_week_status` — Get Week Status

**Backing operation:** `approvalBundle.weekStatus`

**Description:** Get the approval status of one calendar week for a user: whether it is approved plus its timesheets and total duration. Pass the ISO date (YYYY-MM-DD) that identifies the week; omit `user` for the API-key owner.

**Input:**

| field | type | required | notes |
|-------|------|----------|-------|
| `params` | `object` | yes | { user?: number; date: string } |

**Output:** `ApprovalWeekStatus`

**Annotations:** readOnlyHint, openWorldHint

**Example:** `await client.approvalBundle.weekStatus({ example: 'example' })`

**Errors:** CONFIG_ERROR, RATE_LIMITED, SERVER_ERROR

---

## Catalog — every non-core registry operation (generated)

One row per registry operation outside the core. `tool` is the dedicated tool when one
exists; otherwise the operation is reachable through the dispatch tool named in
`reachable via`. `preferredWhen` is the registry guidance verbatim.

| operation | dedicated tool | effect | purpose | preferredWhen | reachable via |
|-----------|----------------|--------|---------|---------------|---------------|
| `actions.getActions` | — | read | Fetch item actions for Timesheet. | — | `kimai_read` |
| `activities.addToTeam` | `kimai_add_activity_to_team` | write | Create team for activity. | — | `kimai_add_activity_to_team` |
| `activities.create` | `kimai_create_activity` | write | Create activity. | Preferred over activities.update for a new activity. | `kimai_create_activity` |
| `activities.createRate` | `kimai_create_activity_rate` | write | Add rate for activity. | — | `kimai_create_activity_rate` |
| `activities.delete` | `kimai_delete_activity` | destructive | Delete activity. | — | `kimai_delete_activity` |
| `activities.deleteRate` | `kimai_delete_activity_rate` | destructive | Delete rate for activity. | — | `kimai_delete_activity_rate` |
| `activities.get` | — | read | Fetch activity. | Preferred over activities.list + a client-side find when the id is known. | `kimai_read` |
| `activities.getRates` | `kimai_get_activity_rates` | read | Fetch rates for activity. | — | `kimai_get_activity_rates` |
| `activities.list` | — | read | Fetch activities. | Preferred over activities.search only when the agent must walk pages; activities.search is the bounded default read. | `kimai_read` |
| `activities.resolve` | `kimai_resolve_activity` | read | Resolve one activity from an identifier. | Preferred over activities.list + a client-side find for any single-activity lookup. | `kimai_resolve_activity` |
| `activities.search` | `kimai_search_activities` | read | Search activities with the spec filters, bounded by an explicit limit. | Preferred over activities.list for any bounded filtered read (at most 100 rows). | `kimai_search_activities` |
| `activities.update` | `kimai_update_activity` | write | Update activity. | Preferred over activities.create for any change to an existing activity. | `kimai_update_activity` |
| `activities.updateMeta` | `kimai_update_activity_meta` | write | Update activity custom-field. | — | `kimai_update_activity_meta` |
| `approvalBundle.addToApprove` | `kimai_submit_for_approval` | write | POST /api/approval-bundle/add_to_approve. | — | `kimai_submit_for_approval` |
| `approvalBundle.nextWeek` | `kimai_get_next_approval_week` | read | GET /api/approval-bundle/next-week. | — | `kimai_get_next_approval_week` |
| `approvalBundle.overtimeYear` | `kimai_get_overtime_year` | read | GET /api/approval-bundle/overtime_year. | — | `kimai_get_overtime_year` |
| `approvalBundle.weeklyOvertime` | `kimai_get_weekly_overtime` | read | GET /api/approval-bundle/weekly_overtime. | — | `kimai_get_weekly_overtime` |
| `config.getColors` | `kimai_get_colors` | read | Fetch configured color codes. | — | `kimai_get_colors` |
| `config.getTimesheetConfig` | `kimai_get_timesheet_config` | read | Fetch timesheet configuration. | — | `kimai_get_timesheet_config` |
| `customers.addToTeam` | `kimai_add_customer_to_team` | write | Create team for customer. | — | `kimai_add_customer_to_team` |
| `customers.create` | `kimai_create_customer` | write | Create customer. | Preferred over customers.update for a new customer. | `kimai_create_customer` |
| `customers.createComment` | `kimai_create_customer_comment` | write | Add comment for customer. | — | `kimai_create_customer_comment` |
| `customers.createRate` | `kimai_create_customer_rate` | write | Add rate for customer. | — | `kimai_create_customer_rate` |
| `customers.delete` | `kimai_delete_customer` | destructive | Delete customer. | — | `kimai_delete_customer` |
| `customers.deleteComment` | `kimai_delete_customer_comment` | destructive | Delete customer comment. | — | `kimai_delete_customer_comment` |
| `customers.deleteRate` | `kimai_delete_customer_rate` | destructive | Delete rate for customer. | — | `kimai_delete_customer_rate` |
| `customers.get` | — | read | Fetch customer. | Preferred over customers.list + a client-side find when the id is known. | `kimai_read` |
| `customers.getContext` | `kimai_get_customer_context` | read | Fetch the working context of one customer. | Preferred over separate customers.get + getRates + listComments calls when the agent needs the customer's working context. | `kimai_get_customer_context` |
| `customers.getRates` | `kimai_get_customer_rates` | read | Fetch rates for customer. | — | `kimai_get_customer_rates` |
| `customers.list` | — | read | Fetch customers. | Preferred over customers.search only when the agent must walk pages; customers.search is the bounded default read. | `kimai_read` |
| `customers.listComments` | `kimai_list_customer_comments` | read | Fetch comments for customer. | — | `kimai_list_customer_comments` |
| `customers.pinComment` | `kimai_pin_customer_comment` | write | Pin customer comment. | — | `kimai_pin_customer_comment` |
| `customers.resolve` | `kimai_resolve_customer` | read | Resolve one customer from an identifier. | Preferred over customers.list + a client-side find for any single-customer lookup. | `kimai_resolve_customer` |
| `customers.update` | `kimai_update_customer` | write | Update customer. | Preferred over customers.create for any change to an existing customer. | `kimai_update_customer` |
| `customers.updateMeta` | `kimai_update_customer_meta` | write | Update customer custom-field. | — | `kimai_update_customer_meta` |
| `export.deleteTemplate` | `kimai_delete_export_template` | destructive | Delete export template. | — | `kimai_delete_export_template` |
| `invoices.download` | — | read | Download invoice. | — | `kimai_read` |
| `invoices.get` | — | read | Fetch invoice. | Preferred over invoices.list + a client-side find when the id is known. | `kimai_read` |
| `invoices.list` | — | read | Fetch invoices. | Preferred over invoices.search only when the agent must walk pages; invoices.search is the bounded default read. | `kimai_read` |
| `invoices.resolve` | `kimai_resolve_invoice` | read | Resolve one invoice from an identifier. | Preferred over invoices.list when the id is already known. | `kimai_resolve_invoice` |
| `invoices.search` | `kimai_search_invoices` | read | Search invoices with the spec filters, bounded by an explicit limit. | Preferred over invoices.list for any bounded filtered read (at most 100 rows). | `kimai_search_invoices` |
| `invoices.updateCustomFields` | `kimai_update_invoice_custom_fields` | write | Update invoice custom-fields. | — | `kimai_update_invoice_custom_fields` |
| `projects.addToTeam` | `kimai_add_project_to_team` | write | Create team for project. | — | `kimai_add_project_to_team` |
| `projects.create` | `kimai_create_project` | write | Create project. | Preferred over projects.update for a new project. | `kimai_create_project` |
| `projects.createComment` | `kimai_create_project_comment` | write | Add comment for project. | — | `kimai_create_project_comment` |
| `projects.createRate` | `kimai_create_project_rate` | write | Add rate for project. | — | `kimai_create_project_rate` |
| `projects.delete` | `kimai_delete_project` | destructive | Delete project. | — | `kimai_delete_project` |
| `projects.deleteComment` | `kimai_delete_project_comment` | destructive | Delete project comment. | — | `kimai_delete_project_comment` |
| `projects.deleteRate` | `kimai_delete_project_rate` | destructive | Delete rate for project. | — | `kimai_delete_project_rate` |
| `projects.get` | — | read | Fetch project. | Preferred over projects.list + a client-side find when the id is known. | `kimai_read` |
| `projects.getContext` | `kimai_get_project_context` | read | Fetch the working context of one project. | Preferred over separate projects.get + getRates calls when the agent needs the project's working context. | `kimai_get_project_context` |
| `projects.getRates` | `kimai_get_project_rates` | read | Fetch rates for project. | — | `kimai_get_project_rates` |
| `projects.list` | — | read | Fetch projects. | Preferred over projects.search only when the agent must walk pages; projects.search is the bounded default read. | `kimai_read` |
| `projects.listComments` | `kimai_list_project_comments` | read | Fetch comments for project. | — | `kimai_list_project_comments` |
| `projects.pinComment` | `kimai_pin_project_comment` | write | Pin project comment. | — | `kimai_pin_project_comment` |
| `projects.resolve` | `kimai_resolve_project` | read | Resolve one project from an identifier. | Preferred over projects.list + a client-side find for any single-project lookup. | `kimai_resolve_project` |
| `projects.update` | `kimai_update_project` | write | Update project. | Preferred over projects.create for any change to an existing project. | `kimai_update_project` |
| `projects.updateMeta` | `kimai_update_project_meta` | write | Update project custom-field. | — | `kimai_update_project_meta` |
| `system.getPlugins` | `kimai_list_plugins` | read | Fetch installed Plugins. | — | `kimai_list_plugins` |
| `system.getVersion` | `kimai_get_version` | read | Fetch Kimai release. | — | `kimai_get_version` |
| `system.ping` | `kimai_ping` | read | Testing route for the API. | — | `kimai_ping` |
| `tags.create` | `kimai_create_tag` | write | Create tag. | Preferred for creating a new tag; the vendor exposes no tag update, so a rename is a create + delete pair. | `kimai_create_tag` |
| `tags.delete` | `kimai_delete_tag` | destructive | Delete tag. | — | `kimai_delete_tag` |
| `tags.find` | — | read | Fetch tags. | — | `kimai_read` |
| `tags.list` | — | read | Fetch tags. | Preferred over tags.search only when the agent must walk pages; tags.search is the bounded default read. | `kimai_read` |
| `tags.resolve` | `kimai_resolve_tag` | read | Resolve one tag from an identifier. | Preferred over tags.list + a client-side find for any single-tag lookup. | `kimai_resolve_tag` |
| `tags.search` | `kimai_search_tags` | read | Search tags with the spec filters, bounded by an explicit limit. | Preferred over tags.list for any bounded filtered read (at most 100 rows). | `kimai_search_tags` |
| `teams.addMember` | `kimai_add_team_member` | write | Add team member. | — | `kimai_add_team_member` |
| `teams.create` | `kimai_create_team` | write | Create team. | Preferred over teams.update for a new team. | `kimai_create_team` |
| `teams.delete` | `kimai_delete_team` | destructive | Delete team. | — | `kimai_delete_team` |
| `teams.get` | — | read | Fetch team. | Preferred over teams.list + a client-side find when the id is known. | `kimai_read` |
| `teams.grantActivityAccess` | `kimai_grant_team_activity_access` | write | Grant activity access. | — | `kimai_grant_team_activity_access` |
| `teams.grantCustomerAccess` | `kimai_grant_team_customer_access` | write | Grant customer access. | — | `kimai_grant_team_customer_access` |
| `teams.grantProjectAccess` | `kimai_grant_team_project_access` | write | Grant project access. | — | `kimai_grant_team_project_access` |
| `teams.list` | `kimai_list_teams` | read | Fetch teams. | Preferred when the caller must walk pages; otherwise a bounded read is enough. | `kimai_list_teams` |
| `teams.removeMember` | `kimai_remove_team_member` | destructive | Remove team member. | — | `kimai_remove_team_member` |
| `teams.resolve` | `kimai_resolve_team` | read | Resolve one team from an identifier. | Preferred over teams.list + a client-side find for any single-team lookup. | `kimai_resolve_team` |
| `teams.revokeActivityAccess` | `kimai_revoke_team_activity_access` | destructive | Revoke activity access. | — | `kimai_revoke_team_activity_access` |
| `teams.revokeCustomerAccess` | `kimai_revoke_team_customer_access` | destructive | Revoke customer access. | — | `kimai_revoke_team_customer_access` |
| `teams.revokeProjectAccess` | `kimai_revoke_team_project_access` | destructive | Revoke project access. | — | `kimai_revoke_team_project_access` |
| `teams.update` | `kimai_update_team` | write | Update team. | Preferred over teams.create for any change to an existing team. | `kimai_update_team` |
| `timesheets.create` | `kimai_create_timesheet` | write | Create a timesheet. | — | `kimai_create_timesheet` |
| `timesheets.delete` | `kimai_delete_timesheet` | destructive | Delete a timesheet. | — | `kimai_delete_timesheet` |
| `timesheets.duplicate` | `kimai_duplicate_timesheet` | write | Duplicate a timesheet (resetting its export state). | — | `kimai_duplicate_timesheet` |
| `timesheets.get` | — | read | Fetch one timesheet by its id. | Preferred over timesheets.list + client-side find when the id is known. | `kimai_read` |
| `timesheets.getActive` | `kimai_get_active_timesheets` | read | Fetch the active (running) timesheets. | Preferred over timesheets.list({ active: true }) for the plain active set: the dedicated endpoint, no list envelope. | `kimai_get_active_timesheets` |
| `timesheets.getContext` | `kimai_get_timesheet_context` | read | Fetch a timesheet with its referenced user, activity, project and customer. | Preferred over get + individual user/activity/project/customer reads: one call instead of four or five. | `kimai_get_timesheet_context` |
| `timesheets.getRecent` | `kimai_get_recent_timesheets` | read | Fetch the most recent timesheets. | — | `kimai_get_recent_timesheets` |
| `timesheets.list` | — | read | Fetch timesheets. | Preferred over timesheets.search only when the agent must walk pages; search is the bounded default read. | `kimai_read` |
| `timesheets.resolve` | `kimai_resolve_timesheet` | read | Resolve one timesheet from an id or a begin timestamp. | Preferred over timesheets.list for any identifier lookup — it removes the paging and the hand-matching. | `kimai_resolve_timesheet` |
| `timesheets.restart` | `kimai_restart_timesheet` | write | Restart a timesheet for the same customer, project and activity. | — | `kimai_restart_timesheet` |
| `timesheets.stop` | `kimai_stop_timesheet` | write | Stop an active timesheet. | — | `kimai_stop_timesheet` |
| `timesheets.toggleExport` | `kimai_toggle_timesheet_export` | write | Toggle the exported state of a timesheet (the record is locked while exported). | — | `kimai_toggle_timesheet_export` |
| `timesheets.update` | `kimai_update_timesheet` | write | Update a timesheet. | Preferred over timesheets.create for any change to an existing timesheet. | `kimai_update_timesheet` |
| `timesheets.updateMeta` | `kimai_update_timesheet_meta` | write | Update the custom meta fields of a timesheet. | — | `kimai_update_timesheet_meta` |
| `users.create` | `kimai_create_user` | write | Create user. | Preferred over users.update for a new user. | `kimai_create_user` |
| `users.deleteApiToken` | — | destructive | Delete API token. | — | `kimai_delete` |
| `users.get` | — | read | Fetch user. | Preferred over users.list + a client-side find when the id is known. | `kimai_read` |
| `users.list` | — | read | Fetch users. | Preferred over users.search only when the agent must walk pages; users.search is the bounded default read. | `kimai_read` |
| `users.resolve` | `kimai_resolve_user` | read | Resolve one user from an identifier. | Preferred over users.list + a client-side find for any single-user lookup. | `kimai_resolve_user` |
| `users.search` | `kimai_search_users` | read | Search users with the spec filters, bounded by an explicit limit. | Preferred over users.list for any bounded filtered read (at most 100 rows). | `kimai_search_users` |
| `users.update` | `kimai_update_user` | write | Update an existing user. | Preferred over users.create for any change to an existing user. | `kimai_update_user` |
| `users.updatePreferences` | `kimai_update_user_preferences` | write | Update user preferences. | — | `kimai_update_user_preferences` |

## Extended tools (projected beyond the core)

Dedicated tools outside the always-on core. They are loadable on demand and remain
reachable through the dispatch tools regardless. All read tools back onto the helper tier
where one exists; every mutation carries the `dry_run` affordance.

### read — 31 tools

| tool | backingOperation | kind | input | output | annotations |
|------|------------------|------|-------|--------|-------------|
| `kimai_get_active_timesheets` | `timesheets.getActive` | primitive | `none` | `Timesheet[]` | readOnlyHint, openWorldHint |
| `kimai_get_activity_rates` | `activities.getRates` | primitive | `id: number (required)` | `ActivityRate[]` | readOnlyHint, openWorldHint |
| `kimai_get_colors` | `config.getColors` | primitive | `none` | `Record<string, string>` | readOnlyHint, openWorldHint |
| `kimai_get_customer_context` | `customers.getContext` | helper | `id: number (required), expand: boolean` | `CustomerSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_get_customer_rates` | `customers.getRates` | primitive | `id: number (required)` | `CustomerRate[]` | readOnlyHint, openWorldHint |
| `kimai_get_next_approval_week` | `approvalBundle.nextWeek` | primitive | `params: object` | `ApprovalWeekStatus` | readOnlyHint, openWorldHint |
| `kimai_get_overtime_year` | `approvalBundle.overtimeYear` | primitive | `params: object (required)` | `ApprovalOvertimeYear` | readOnlyHint, openWorldHint |
| `kimai_get_project_context` | `projects.getContext` | helper | `id: number (required), expand: boolean` | `ProjectSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_get_project_rates` | `projects.getRates` | primitive | `id: number (required)` | `ProjectRate[]` | readOnlyHint, openWorldHint |
| `kimai_get_recent_timesheets` | `timesheets.getRecent` | primitive | `params: object` | `Timesheet[]` | readOnlyHint, openWorldHint |
| `kimai_get_timesheet_config` | `config.getTimesheetConfig` | primitive | `none` | `TimesheetConfig` | readOnlyHint, openWorldHint |
| `kimai_get_timesheet_context` | `timesheets.getContext` | helper | `id: number (required), expand: boolean` | `TimesheetSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_get_version` | `system.getVersion` | primitive | `none` | `Version` | readOnlyHint, openWorldHint |
| `kimai_get_weekly_overtime` | `approvalBundle.weeklyOvertime` | primitive | `params: object (required)` | `ApprovalWeeklyOvertime[]` | readOnlyHint, openWorldHint |
| `kimai_list_customer_comments` | `customers.listComments` | primitive | `id: number (required)` | `Comment[]` | readOnlyHint, openWorldHint |
| `kimai_list_plugins` | `system.getPlugins` | primitive | `none` | `Plugin[]` | readOnlyHint, openWorldHint |
| `kimai_list_project_comments` | `projects.listComments` | primitive | `id: number (required)` | `Comment[]` | readOnlyHint, openWorldHint |
| `kimai_list_teams` | `teams.list` | primitive | `params: object` | `unknown` | readOnlyHint, openWorldHint |
| `kimai_ping` | `system.ping` | primitive | `none` | `boolean` | readOnlyHint, openWorldHint |
| `kimai_resolve_activity` | `activities.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `ActivitySummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_customer` | `customers.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `CustomerSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_invoice` | `invoices.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `InvoiceSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_project` | `projects.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `ProjectSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_tag` | `tags.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `TagSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_team` | `teams.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `TeamSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_timesheet` | `timesheets.resolve` | helper | `identifier: number | string | object (required), expand: boolean, resolution_details: boolean` | `TimesheetSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_resolve_user` | `users.resolve` | helper | `identifier: object (required), expand: boolean, resolution_details: boolean` | `UserSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_search_activities` | `activities.search` | helper | `params: object, limit: number, expand: boolean` | `ActivitySummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_search_invoices` | `invoices.search` | helper | `params: object, limit: number, expand: boolean` | `InvoiceSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_search_tags` | `tags.search` | helper | `params: object, limit: number, expand: boolean` | `TagSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |
| `kimai_search_users` | `users.search` | helper | `params: object, limit: number, expand: boolean` | `UserSummary (drops internalRate, fixedRate, hourlyRate, metaFields — expand: true returns them)` | readOnlyHint, openWorldHint |

### write — 38 tools

| tool | backingOperation | kind | input | output | annotations |
|------|------------------|------|-------|--------|-------------|
| `kimai_add_activity_to_team` | `activities.addToTeam` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_add_customer_to_team` | `customers.addToTeam` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_add_project_to_team` | `projects.addToTeam` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_add_team_member` | `teams.addMember` | primitive | `teamId: number (required), userId: number (required), dry_run: boolean, confirm: string (required)` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_create_activity` | `activities.create` | primitive | `input: object (required), dry_run: boolean` | `ActivityEntity | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_activity_rate` | `activities.createRate` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `ActivityRate | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_customer` | `customers.create` | primitive | `input: object (required), dry_run: boolean` | `CustomerEntity | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_customer_comment` | `customers.createComment` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Comment | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_customer_rate` | `customers.createRate` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `CustomerRate | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_project` | `projects.create` | primitive | `input: object (required), dry_run: boolean` | `ProjectEntity | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_project_comment` | `projects.createComment` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Comment | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_project_rate` | `projects.createRate` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `ProjectRate | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_tag` | `tags.create` | primitive | `input: object (required), dry_run: boolean` | `Tag | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_team` | `teams.create` | primitive | `input: object (required), dry_run: boolean` | `Team | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_timesheet` | `timesheets.create` | primitive | `input: object (required), dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_create_user` | `users.create` | primitive | `input: object (required), dry_run: boolean` | `UserEntity | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_duplicate_timesheet` | `timesheets.duplicate` | primitive | `id: number (required), dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_grant_team_activity_access` | `teams.grantActivityAccess` | primitive | `teamId: number (required), activityId: number (required), dry_run: boolean, confirm: string (required)` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_grant_team_customer_access` | `teams.grantCustomerAccess` | primitive | `teamId: number (required), customerId: number (required), dry_run: boolean, confirm: string (required)` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_grant_team_project_access` | `teams.grantProjectAccess` | primitive | `teamId: number (required), projectId: number (required), dry_run: boolean, confirm: string (required)` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_pin_customer_comment` | `customers.pinComment` | primitive | `id: number (required), commentId: number (required), dry_run: boolean` | `Comment | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_pin_project_comment` | `projects.pinComment` | primitive | `id: number (required), commentId: number (required), dry_run: boolean` | `Comment | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_restart_timesheet` | `timesheets.restart` | primitive | `id: number (required), input: object, dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_stop_timesheet` | `timesheets.stop` | primitive | `id: number (required), dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_submit_for_approval` | `approvalBundle.addToApprove` | primitive | `params: object (required), dry_run: boolean` | `string | DryRunResult<...> when dry_run: true` | openWorldHint |
| `kimai_toggle_timesheet_export` | `timesheets.toggleExport` | primitive | `id: number (required), dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_activity` | `activities.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Activity | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_activity_meta` | `activities.updateMeta` | primitive | `id: number (required), meta: object (required), dry_run: boolean` | `Activity> | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_customer` | `customers.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Customer | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_customer_meta` | `customers.updateMeta` | primitive | `id: number (required), meta: object (required), dry_run: boolean` | `Customer> | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_invoice_custom_fields` | `invoices.updateCustomFields` | primitive | `id: number (required), fields: object (required), dry_run: boolean` | `Invoice | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_project` | `projects.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Project | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_project_meta` | `projects.updateMeta` | primitive | `id: number (required), meta: object (required), dry_run: boolean` | `Project> | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_team` | `teams.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Team | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_timesheet` | `timesheets.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `Timesheet | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_timesheet_meta` | `timesheets.updateMeta` | primitive | `id: number (required), meta: object (required), dry_run: boolean` | `Timesheet> | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_user` | `users.update` | primitive | `id: number (required), input: object (required), dry_run: boolean` | `User | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |
| `kimai_update_user_preferences` | `users.updatePreferences` | primitive | `id: number (required), prefs: object (required), dry_run: boolean` | `User | DryRunResult<...> when dry_run: true` | idempotentHint, openWorldHint |

### destructive — 16 tools

| tool | backingOperation | kind | input | output | annotations |
|------|------------------|------|-------|--------|-------------|
| `kimai_delete_activity` | `activities.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_activity_rate` | `activities.deleteRate` | primitive | `id: number (required), rateId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_customer` | `customers.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_customer_comment` | `customers.deleteComment` | primitive | `id: number (required), commentId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_customer_rate` | `customers.deleteRate` | primitive | `id: number (required), rateId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_export_template` | `export.deleteTemplate` | primitive | `templateId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_project` | `projects.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_project_comment` | `projects.deleteComment` | primitive | `id: number (required), commentId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_project_rate` | `projects.deleteRate` | primitive | `id: number (required), rateId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_tag` | `tags.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_team` | `teams.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_delete_timesheet` | `timesheets.delete` | primitive | `id: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_remove_team_member` | `teams.removeMember` | primitive | `teamId: number (required), userId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_revoke_team_activity_access` | `teams.revokeActivityAccess` | primitive | `teamId: number (required), activityId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_revoke_team_customer_access` | `teams.revokeCustomerAccess` | primitive | `teamId: number (required), customerId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |
| `kimai_revoke_team_project_access` | `teams.revokeProjectAccess` | primitive | `teamId: number (required), projectId: number (required), dry_run: boolean, confirm: string (required)` | `void | DryRunResult<...> when dry_run: true` | destructiveHint, openWorldHint |

## Excluded by rule

### Binary / download (never an MCP tool)

- `invoices.download` — binary/download output (ArrayBuffer) — cannot map to MCP text content

### Read primitives subsumed by a helper (tools back onto the helper tier)

- `activities.get` — subsumed by the helper activities.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `activities.list` — subsumed by the helper activities.search (bounded search covers list + filter; name one read tool per resource)
- `customers.get` — subsumed by the helper customers.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `customers.list` — subsumed by the helper customers.search (bounded search covers list + filter; name one read tool per resource)
- `invoices.get` — subsumed by the helper invoices.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `invoices.list` — subsumed by the helper invoices.search (bounded search covers list + filter; name one read tool per resource)
- `projects.get` — subsumed by the helper projects.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `projects.list` — subsumed by the helper projects.search (bounded search covers list + filter; name one read tool per resource)
- `tags.find` — subsumed by the helper tags.search (one search tool per resource)
- `tags.list` — subsumed by the helper tags.search (bounded search covers list + filter; name one read tool per resource)
- `teams.get` — subsumed by the helper teams.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `timesheets.get` — subsumed by the helper timesheets.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `timesheets.list` — subsumed by the helper timesheets.search (bounded search covers list + filter; name one read tool per resource)
- `users.get` — subsumed by the helper users.resolve (resolve covers get-by-id, compact with an expand escape hatch)
- `users.list` — subsumed by the helper users.search (bounded search covers list + filter; name one read tool per resource)

### Excluded by curation (`MCP_TOOL_OVERRIDES.json`)

- `kimai_get_actions` (`actions.getActions`, read) — UI-only view rendering (GET /api/actions/{resource}/{id}/{view}/{locale}): the payload is pre-rendered HTML fragments for the Kimai web UI, not agent-usable data. Still reachable through kimai_read when a host deliberately needs it.
- `kimai_delete_user_api_token` (`users.deleteApiToken`, destructive) — Credential-lifecycle operation: a model must not be handed the API-key deletion path as a first-class tool. Registry flags: destructive + requiresApproval. Still reachable, confirmation-gated, through kimai_delete for a host that deliberately enables it.

## Annotations and the error contract

- `readOnlyHint` ← `effect === "read"`; `destructiveHint` ← `effect === "destructive"`;
  `idempotentHint` ← the registry `idempotent` flag. The registry records
  `retry.idempotencySupport: "none"` for every operation: Kimai exposes no
  idempotency-key mechanism, so `idempotentHint` states natural semantic idempotency
  (update/delete by id), not a vendor guarantee.
- `openWorldHint: true` on every tool: each call reaches the Kimai instance over the network.
- `sensitive` and `requiresApproval` records say so in their description; the SDK does
  not enforce approval policy — the manifest advertises the need so the gateway can gate it.
- Errors surface the SDK `ApiError` fields `code`, `category`, `status`/`httpStatus`,
  `retryable`, `suggestedAction`, `operation`, `request` (the request PATH only) and
  `retryAfter`. A tool NEVER returns the request headers, the API token, or the raw vendor
  error body, so a credential cannot leak through an error block.
- Reads are search-first: `kimai_catalog`/`kimai_describe` name the bounded helper for a
  resource; `limit` is capped at 100 on every read tool.

## Overrides applied (`MCP_TOOL_OVERRIDES.json`)

| tool | field | reason |
|------|-------|--------|
| `kimai_get_actions` | exclude (drop) | UI-only view rendering (GET /api/actions/{resource}/{id}/{view}/{locale}): the payload is pre-rendered HTML fragments for the Kimai web UI, not agent-usable data. Still reachable through kimai_read when a host deliberately needs it. |
| `kimai_delete_user_api_token` | exclude (drop) | Credential-lifecycle operation: a model must not be handed the API-key deletion path as a first-class tool. Registry flags: destructive + requiresApproval. Still reachable, confirmation-gated, through kimai_delete for a host that deliberately enables it. |
| `kimai_update_user_preferences` | description | Registry purpose was not LLM-directed (a bare label) and the shared usage string said nothing about the preference semantics. |
| `kimai_get_week_status` | description | Registry purpose was the raw route string 'GET /api/approval-bundle/week-status.' — not LLM-directed. |
| `kimai_get_next_approval_week` | description | Registry purpose was the raw route string 'GET /api/approval-bundle/next-week.' — not LLM-directed. |
| `kimai_get_overtime_year` | description | Registry purpose was the raw route string 'GET /api/approval-bundle/overtime_year.' — not LLM-directed. |
| `kimai_get_weekly_overtime` | description | Registry purpose was the raw route string 'GET /api/approval-bundle/weekly_overtime.' — not LLM-directed. |
| `kimai_submit_for_approval` | description | Registry purpose was the bare label 'Add to approve.' — it did not say what is submitted or what is returned. |
| `kimai_ping` | description | Registry purpose was 'Testing route for the API.' — not LLM-directed. |
| `kimai_get_version` | description | Registry purpose was 'Fetch Kimai release.' — too terse to guide a tool choice. |
| `kimai_list_plugins` | description | Registry purpose was 'Fetch installed Plugins.' — too terse to guide a tool choice. |
| `kimai_search_timesheets` | description | Curation adds the cross-tool look-up hints the MCP standard requires on id filters; the registry usage stated the bound and the compact/expand behaviour but not where the referenced ids come from. |
| `kimai_create_timesheet` | description | Curation adds the cross-tool look-up hints the MCP standard requires on required id fields. |
| `kimai_search_customers` | description | Curation adds the cross-tool look-up hint to the resolver; the registry usage stated the bound and the compact/expand behaviour only. |
| `kimai_search_projects` | description | Curation adds the cross-tool look-up hints the MCP standard requires on id filters. |
| `kimai_list_teams` | description | Registry usage told the caller to use the SDK's getAll/listPages iterators, which are deliberately not MCP tools; the served text must not recommend an unsupported path. Adds the vendor page bound and the resolver hint. |

## Meta

- planHash: `c7a8a71fbd684b171075bcd09d361748f4c9b32bb42dcd47f6ee220215fc4629`
- registry records: 108
- projected tools: 90
- core tier: 10
- catalog entries: 103
