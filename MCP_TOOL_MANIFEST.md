# MCP Tool Manifest — Kimai API Client SDK

**Generated:** 2026-08-10
**SDK:** node-kimai v1.0.0
**API:** Kimai Pro API v1.1
**Prefix:** `kimai_` (all tools prefixed to avoid collisions)

---

## Tiering Strategy

- **Core tier (enabled by default):** Read-only tools for querying Kimai data. ~18 tools.
- **Full CRUD tier (opt-in):** Create, update, delete operations. Marked with ⚠️. Enable via `MCP_KIMAI_FULL_TIER=true`.
- **Excluded:** Binary endpoints, iterator methods, UI-specific endpoints, sensitive admin ops.

---

## Error Handling

All tools wrap SDK calls in try/catch. On error, tools return a structured error content block:

```json
{
  "type": "error",
  "error": {
    "code": "NotFoundError",
    "status": 404,
    "message": "Resource not found",
    "request": "/api/timesheets/123"
  }
}
```

SDK error types surfaced:
- `ApiError` (base), `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `UnprocessableEntityError` (422), `RateLimitError` (429), `ServerError` (5xx).

---

## Shared Field Descriptions

- `id`: Numeric primary key of the resource. Use `kimai_list_*` or `kimai_find_*` to discover IDs.
- `page`: Page number for paginated results (1-based). Default: 1.
- `size`: Results per page. Default: 100. Raise to 250-500 for large result sets.
- `name`: Partial-match search on resource name. Prefer over exact filters when unsure.
- `visible`: Filter to show only visible (non-archived) resources. Default: null (all).

---

## CORE TIER — Read-Only Tools (enabled by default)

### 1. kimai_ping

**Description:** Health-check the Kimai instance. Returns true if the API is reachable. Call this first to verify connectivity.

**Backing method:** `SystemClient.ping()`

**Return:** `boolean` — true if API responds, false otherwise.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Pings the Kimai API.")
```

---

### 2. kimai_list_activities

**Description:** List all activities (tasks). Returns Activity[] with numeric `id` you can pass to `kimai_get_activity`. Use `name` for partial search.

**Backing method:** `ActivityClient.getAll()`

**Return:** `Activity[]` — each with `id`, `name`, `billable`, `visible`, `color`.

**Input schema:**
```typescript
z.object({
  name: z.string().optional().describe("Partial-match search on activity name."),
  visible: z.boolean().optional().describe("Filter by visibility. true = active only, false = archived only."),
  customer: z.number().optional().describe("Filter by customer ID. Find via kimai_list_customers."),
}).describe("List activities with optional filters. Non-paginated — returns all matching results.")
```

---

### 3. kimai_get_activity

**Description:** Get a single activity by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_activities` first.

**Backing method:** `ActivityClient.getById()`

**Return:** `Activity` — full activity details including `metaFields`, `teams`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the activity. Find via kimai_list_activities."),
}).describe("Retrieve a single activity by its numeric ID.")
```

---

### 4. kimai_list_customers

**Description:** List all customers. Returns Customer[] with numeric `id` you can pass to `kimai_get_customer`. Use `name` for partial search.

**Backing method:** `CustomerClient.getAll()`

**Return:** `Customer[]` — each with `id`, `name`, `number`, `visible`, `currency`, `timezone`.

**Input schema:**
```typescript
z.object({
  name: z.string().optional().describe("Partial-match search on customer name."),
  visible: z.boolean().optional().describe("Filter by visibility. true = active only, false = archived only."),
}).describe("List customers with optional filters. Non-paginated — returns all matching results.")
```

---

### 5. kimai_get_customer

**Description:** Get a single customer by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_customers` first.

**Backing method:** `CustomerClient.getById()`

**Return:** `Customer` — full customer details including `metaFields`, `teams`, address fields.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the customer. Find via kimai_list_customers."),
}).describe("Retrieve a single customer by its numeric ID.")
```

---

### 6. kimai_list_projects

**Description:** List all projects. Returns Project[] with numeric `id` you can pass to `kimai_get_project`. Filter by `customer` or `name`.

**Backing method:** `ProjectClient.getAll()`

**Return:** `Project[]` — each with `id`, `name`, `customer`, `billable`, `visible`.

**Input schema:**
```typescript
z.object({
  name: z.string().optional().describe("Partial-match search on project name."),
  visible: z.boolean().optional().describe("Filter by visibility. true = active only, false = archived only."),
  customer: z.number().optional().describe("Filter by customer ID. Find via kimai_list_customers."),
  activity: z.number().optional().describe("Filter by activity ID. Find via kimai_list_activities."),
}).describe("List projects with optional filters. Non-paginated — returns all matching results.")
```

---

### 7. kimai_get_project

**Description:** Get a single project by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_projects` first.

**Backing method:** `ProjectClient.getById()`

**Return:** `Project` — full project details including `metaFields`, `teams`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the project. Find via kimai_list_projects."),
}).describe("Retrieve a single project by its numeric ID.")
```

---

### 8. kimai_list_timesheets

**Description:** List timesheet entries with date/user filters. Returns Timesheet[] with `id` for `kimai_get_timesheet`.

**Backing method:** `TimesheetClient.getAll()` (fetches all pages automatically)

**Return:** `Timesheet[]` — each with `id`, `user`, `activity`, `project`, `begin`, `end`, `duration`, `description`.

**Input schema:**
```typescript
z.object({
  user: z.union([z.string(), z.number()]).optional().describe("Filter by user. Pass a numeric user ID, or 'me' for current user. Default: 'all' (all users, requires view_other_timesheet permission)."),
  users: z.array(z.number()).optional().describe("Filter by multiple user IDs. Mutually exclusive with `user`."),
  begin: z.string().optional().describe("Start date filter (ISO 8601 or YYYY-MM-DD). Include timesheets starting on or after this date."),
  end: z.string().optional().describe("End date filter (ISO 8601 or YYYY-MM-DD). Include timesheets ending on or before this date."),
  activity: z.number().optional().describe("Filter by activity ID. Find via kimai_list_activities."),
  project: z.number().optional().describe("Filter by project ID. Find via kimai_list_projects."),
  customer: z.number().optional().describe("Filter by customer ID. Find via kimai_list_customers."),
  tag: z.string().optional().describe("Filter by tag name (exact match)."),
  exported: z.boolean().optional().describe("Filter by export status. true = already exported, false = not exported."),
}).describe("List timesheet entries with optional filters. Non-paginated — getAll() returns all pages automatically.")
```

---

### 9. kimai_get_timesheet

**Description:** Get a single timesheet entry by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_timesheets` first.

**Backing method:** `TimesheetClient.getById()`

**Return:** `Timesheet` — full timesheet details including `metaFields`, expanded `user`, `activity`, `project`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the timesheet entry. Find via kimai_list_timesheets."),
}).describe("Retrieve a single timesheet entry by its numeric ID.")
```

---

### 10. kimai_list_active_timesheets

**Description:** List currently running (active) timesheet entries. Non-paginated — returns all active entries.

**Backing method:** `TimesheetClient.getActive()`

**Return:** `Timesheet[]` — currently running entries with `id`, `user`, `begin`, `description`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns all currently active (running) timesheet entries.")
```

---

### 11. kimai_list_recent_timesheets

**Description:** List recently completed timesheet entries. Non-paginated — returns the most recent entries.

**Backing method:** `TimesheetClient.getRecent()`

**Return:** `Timesheet[]` — recent entries with `id`, `user`, `begin`, `end`, `duration`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns recently completed timesheet entries.")
```

---

### 12. kimai_list_users

**Description:** List all users. Returns User[] with numeric `id` you can pass to `kimai_get_user`. Filter by role or team.

**Backing method:** `UserClient.getAll()`

**Return:** `User[]` — each with `id`, `username`, `firstname`, `lastname`, `email`, `teams`.

**Input schema:**
```typescript
z.object({
  role: z.string().optional().describe("Filter by user role (e.g., 'ROLE_ADMIN', 'ROLE_USER')."),
  team: z.number().optional().describe("Filter by team ID. Find via kimai_list_teams."),
}).describe("List users with optional filters. Non-paginated — returns all matching results.")
```

---

### 13. kimai_get_user

**Description:** Get a single user by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_users` first.

**Backing method:** `UserClient.getById()`

**Return:** `User` — full user details including `teams`, `locale`, `timezone`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the user. Find via kimai_list_users or kimai_get_current_user."),
}).describe("Retrieve a single user by their numeric ID.")
```

---

### 14. kimai_get_current_user

**Description:** Get the authenticated user (API key owner). No ID required. Call this to discover who the API key belongs to.

**Backing method:** `UserClient.getMe()`

**Return:** `User` — current user details including `id`, `username`, `teams`, `locale`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns the user associated with the current API key.")
```

---

### 15. kimai_list_tags

**Description:** List all tags. Returns Tag[] with numeric `id`. Use `kimai_find_tag` to search by name.

**Backing method:** `TagClient.getAll()`

**Return:** `Tag[]` — each with `id`, `name`, `visible`, `color`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns all tags. Non-paginated.")
```

---

### 16. kimai_find_tag

**Description:** Search tags by name (partial match). Returns matching Tag[]. Use this when you know a tag name but not its ID.

**Backing method:** `TagClient.find()`

**Return:** `Tag[]` — tags matching the search term.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Tag name to search for. Supports partial matching."),
}).describe("Search for tags by name. Use when you know the tag name but not its ID.")
```

---

### 17. kimai_list_teams

**Description:** List all teams. Returns Team[] with numeric `id` you can pass to `kimai_get_team`. Filter by `name`.

**Backing method:** `TeamClient.getAll()`

**Return:** `Team[]` — each with `id`, `name`, `members`, `customers`, `projects`, `activities`.

**Input schema:**
```typescript
z.object({
  name: z.string().optional().describe("Partial-match search on team name."),
}).describe("List teams with optional filters. Non-paginated — returns all matching results.")
```

---

### 18. kimai_get_team

**Description:** Get a single team by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_teams` first.

**Backing method:** `TeamClient.getById()`

**Return:** `Team` — full team details including `members`, `customers`, `projects`, `activities`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the team. Find via kimai_list_teams."),
}).describe("Retrieve a single team by its numeric ID.")
```

---

### 19. kimai_list_invoices

**Description:** List invoices. Returns Invoice[] with `id` for `kimai_get_invoice`.

**Backing method:** `InvoiceClient.getAll()` (fetches all pages automatically)

**Return:** `Invoice[]` — each with `id`, `number`, `customer`, `year`, `month`, `begin`, `end`, `sum`, `sumWithTax`.

**Input schema:**
```typescript
z.object({
  customer: z.number().optional().describe("Filter by customer ID. Find via kimai_list_customers."),
}).describe("List invoices with optional filters. Non-paginated — getAll() returns all pages automatically.")
```

---

### 20. kimai_get_invoice

**Description:** Get a single invoice by ID. Only call when you have a numeric `id`; otherwise call `kimai_list_invoices` first. NOTE: Invoice download is NOT available (binary endpoint excluded).

**Backing method:** `InvoiceClient.getById()`

**Return:** `Invoice` — full invoice details including `customFields`, expanded `customer`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the invoice. Find via kimai_list_invoices."),
}).describe("Retrieve a single invoice by its numeric ID. Binary download is not available via this tool.")
```

---

### 21. kimai_get_timesheet_config

**Description:** Get timesheet configuration settings (default project/activity, page, mode). Call to understand system defaults.

**Backing method:** `ConfigClient.getTimesheetConfig()`

**Return:** `TimesheetConfig` — object with `timesheet`, `timesheetPage`, `timesheetDefaultProject`, `timesheetDefaultActivity`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns the system's timesheet configuration.")
```

---

### 22. kimai_get_version

**Description:** Get the Kimai server version information.

**Backing method:** `SystemClient.getVersion()`

**Return:** `Version` — object with `version`, `versionId`, `copyright`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns the Kimai server version.")
```

---

### 23. kimai_list_plugins

**Description:** List all installed plugins on the Kimai server.

**Backing method:** `SystemClient.getPlugins()`

**Return:** `Plugin[]` — each with `name`, `version`.

**Input schema:**
```typescript
z.object({}).describe("No parameters required. Returns all installed plugins.")
```

---

## FULL CRUD TIER — Opt-In Tools (enable via MCP_KIMAI_FULL_TIER=true)

⚠️ **These tools modify data.** Enable only when write access is needed.

### 24. kimai_create_timesheet ⚠️

**Description:** Create a new timesheet entry. Requires `activity` or `project` and `begin` timestamp.

**Backing method:** `TimesheetClient.create()`

**Return:** `Timesheet` — the created timesheet with assigned `id`.

**Input schema:**
```typescript
z.object({
  user: z.number().optional().describe("User ID to assign. Defaults to API key owner if not specified."),
  activity: z.number().optional().describe("Activity ID. Required unless project is provided. Find via kimai_list_activities."),
  project: z.number().optional().describe("Project ID. Required unless activity is provided. Find via kimai_list_projects."),
  begin: z.string().optional().describe("Start datetime (ISO 8601). If omitted, entry starts now (running)."),
  end: z.string().optional().describe("End datetime (ISO 8601). If omitted with begin, entry is running."),
  description: z.string().optional().describe("Optional description/note for the timesheet entry."),
}).describe("Create a new timesheet entry. Provide activity or project. Omit end to start a running entry.")
```

---

### 25. kimai_update_timesheet ⚠️

**Description:** Update an existing timesheet entry. Only specified fields are modified.

**Backing method:** `TimesheetClient.update()`

**Return:** `Timesheet` — the updated timesheet.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the timesheet to update. Find via kimai_list_timesheets."),
  user: z.number().optional().describe("New user ID to assign."),
  activity: z.number().optional().describe("New activity ID. Find via kimai_list_activities."),
  project: z.number().optional().describe("New project ID. Find via kimai_list_projects."),
  begin: z.string().optional().describe("New start datetime (ISO 8601)."),
  end: z.string().optional().describe("New end datetime (ISO 8601)."),
  description: z.string().optional().describe("New description."),
}).describe("Update an existing timesheet entry. Only provided fields are modified.")
```

---

### 26. kimai_stop_timesheet ⚠️

**Description:** Stop a running timesheet entry. Sets the end time to now.

**Backing method:** `TimesheetClient.stop()`

**Return:** `Timesheet` — the stopped timesheet with `end` timestamp set.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the running timesheet to stop. Find via kimai_list_active_timesheets."),
}).describe("Stop a currently running timesheet entry. Irreversible — sets end time to now.")
```

---

### 27. kimai_restart_timesheet ⚠️

**Description:** Restart a stopped timesheet entry. Optionally set a new begin time.

**Backing method:** `TimesheetClient.restart()`

**Return:** `Timesheet` — the restarted (running) timesheet.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the timesheet to restart."),
  begin: z.string().optional().describe("New begin datetime (ISO 8601). If omitted, restarts from original begin."),
}).describe("Restart a stopped timesheet entry as running. Optionally set a new begin time.")
```

---

### 28. kimai_duplicate_timesheet ⚠️

**Description:** Duplicate an existing timesheet entry. Creates a new entry with the same data.

**Backing method:** `TimesheetClient.duplicate()`

**Return:** `Timesheet` — the newly duplicated timesheet with a new `id`.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the timesheet to duplicate."),
}).describe("Create a copy of an existing timesheet entry. Useful for recurring entries.")
```

---

### 29. kimai_delete_timesheet ⚠️

**Description:** Delete a timesheet entry. ⚠️ IRREVERSIBLE — the entry is permanently removed.

**Backing method:** `TimesheetClient.delete()`

**Return:** `void` — no content returned on success.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the timesheet to delete. Find via kimai_list_timesheets."),
}).describe("Delete a timesheet entry. IRREVERSIBLE — confirm the ID before calling.")
```

---

### 30. kimai_create_activity ⚠️

**Description:** Create a new activity (task). Requires `name`.

**Backing method:** `ActivityClient.create()`

**Return:** `ActivityEntity` — the created activity with assigned `id`.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Activity name (required)."),
  number: z.string().optional().describe("Internal reference number."),
  comment: z.string().optional().describe("Description/comment."),
  invoiceText: z.string().optional().describe("Text to display on invoices."),
  project: z.number().optional().describe("Parent project ID. Find via kimai_list_projects."),
  teams: z.array(z.number()).optional().describe("Team IDs to assign. Find via kimai_list_teams."),
  color: z.string().optional().describe("Color hex code (e.g., '#FF0000')."),
  budget: z.number().optional().describe("Budget amount."),
  timeBudget: z.string().optional().describe("Time budget in seconds."),
  budgetType: z.literal("month").optional().describe("Budget type. Currently only 'month' is supported."),
  visible: z.boolean().optional().describe("Whether the activity is visible. Default: true."),
  billable: z.boolean().optional().describe("Whether the activity is billable. Default: true."),
}).describe("Create a new activity. Name is required. Optionally assign to a project and teams.")
```

---

### 31. kimai_update_activity ⚠️

**Description:** Update an existing activity. Only specified fields are modified.

**Backing method:** `ActivityClient.update()`

**Return:** `Activity` — the updated activity.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the activity to update."),
  name: z.string().optional().describe("New activity name."),
  number: z.string().optional().describe("New reference number."),
  comment: z.string().optional().describe("New description."),
  invoiceText: z.string().optional().describe("New invoice text."),
  project: z.number().optional().describe("New parent project ID."),
  teams: z.array(z.number()).optional().describe("New team IDs to assign."),
  color: z.string().optional().describe("New color hex code."),
  budget: z.number().optional().describe("New budget amount."),
  timeBudget: z.string().optional().describe("New time budget in seconds."),
  budgetType: z.literal("month").optional().describe("Budget type."),
  visible: z.boolean().optional().describe("New visibility."),
  billable: z.boolean().optional().describe("New billable status."),
}).describe("Update an existing activity. Only provided fields are modified.")
```

---

### 32. kimai_delete_activity ⚠️

**Description:** Delete an activity. ⚠️ IRREVERSIBLE — may affect existing timesheet entries.

**Backing method:** `ActivityClient.delete()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the activity to delete."),
}).describe("Delete an activity. IRREVERSIBLE — existing timesheets referencing this activity may be orphaned.")
```

---

### 33. kimai_create_customer ⚠️

**Description:** Create a new customer. Requires `name`, `country`, `language`, `currency`, `timezone`.

**Backing method:** `CustomerClient.create()`

**Return:** `CustomerEntity` — the created customer with assigned `id`.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Customer name (required)."),
  number: z.string().optional().describe("Internal reference number."),
  comment: z.string().optional().describe("Notes about the customer."),
  company: z.string().optional().describe("Company name."),
  vatId: z.string().optional().describe("VAT/Tax ID."),
  contact: z.string().optional().describe("Contact person name."),
  addressLine1: z.string().optional().describe("Address line 1."),
  addressLine2: z.string().optional().describe("Address line 2."),
  addressLine3: z.string().optional().describe("Address line 3."),
  postCode: z.string().optional().describe("Postal code."),
  city: z.string().optional().describe("City."),
  country: z.string().describe("Country code (required, e.g., 'DE', 'US', 'GB')."),
  language: z.enum(["ar", "bg", "ca", "cs", "da", "de", "de_CH", "el", "en", "eo", "es", "eu", "fa", "fi", "fo", "fr", "he", "hr", "hu", "id", "it", "ja", "ko", "nb_NO", "nl", "pa", "pl", "pt", "pt_BR", "ro", "ru", "sk", "sl", "sv", "ta", "tr", "uk", "vi", "zh_CN", "zh_Hant", "zh_Hant_TW"]).describe("Language code (required)."),
  currency: z.string().describe("Currency code (required, e.g., 'EUR', 'USD', 'GBP')."),
  phone: z.string().optional().describe("Phone number."),
  email: z.string().optional().describe("Email address."),
  homepage: z.string().optional().describe("Website URL."),
  timezone: z.string().describe("Timezone (required, e.g., 'Europe/Berlin', 'America/New_York')."),
  invoiceEmail: z.string().optional().describe("Email for invoice delivery."),
  teams: z.array(z.number()).optional().describe("Team IDs to assign."),
  color: z.string().optional().describe("Color hex code."),
  budget: z.number().optional().describe("Budget amount."),
  timeBudget: z.string().optional().describe("Time budget in seconds."),
  budgetType: z.literal("month").optional().describe("Budget type."),
  visible: z.boolean().optional().describe("Whether visible. Default: true."),
  billable: z.boolean().optional().describe("Whether billable. Default: true."),
}).describe("Create a new customer. Requires name, country, language, currency, and timezone.")
```

---

### 34. kimai_update_customer ⚠️

**Description:** Update an existing customer. Only specified fields are modified.

**Backing method:** `CustomerClient.update()`

**Return:** `Customer` — the updated customer.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the customer to update."),
  name: z.string().optional().describe("New customer name."),
  number: z.string().optional().describe("New reference number."),
  comment: z.string().optional().describe("New notes."),
  company: z.string().optional().describe("New company name."),
  vatId: z.string().optional().describe("New VAT ID."),
  contact: z.string().optional().describe("New contact person."),
  addressLine1: z.string().optional().describe("New address line 1."),
  addressLine2: z.string().optional().describe("New address line 2."),
  addressLine3: z.string().optional().describe("New address line 3."),
  postCode: z.string().optional().describe("New postal code."),
  city: z.string().optional().describe("New city."),
  country: z.string().optional().describe("New country code."),
  language: z.enum(["en", "de", "fr", "es", "it", "nl", "pt", "pt_BR", "pl", "ru", "cs", "sk", "hu", "ro", "bg", "el", "da", "fi", "sv", "no"]).optional().describe("New language code."),
  currency: z.string().optional().describe("New currency code."),
  phone: z.string().optional().describe("New phone number."),
  email: z.string().optional().describe("New email."),
  homepage: z.string().optional().describe("New website."),
  timezone: z.string().optional().describe("New timezone."),
  invoiceEmail: z.string().optional().describe("New invoice email."),
  teams: z.array(z.number()).optional().describe("New team IDs."),
  color: z.string().optional().describe("New color."),
  visible: z.boolean().optional().describe("New visibility."),
  billable: z.boolean().optional().describe("New billable status."),
}).describe("Update an existing customer. Only provided fields are modified.")
```

---

### 35. kimai_delete_customer ⚠️

**Description:** Delete a customer. ⚠️ IRREVERSIBLE — affects all associated projects and timesheets.

**Backing method:** `CustomerClient.delete()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the customer to delete."),
}).describe("Delete a customer. IRREVERSIBLE — all associated projects and timesheets may be affected.")
```

---

### 36. kimai_create_project ⚠️

**Description:** Create a new project. Requires `name`.

**Backing method:** `ProjectClient.create()`

**Return:** `ProjectEntity` — the created project with assigned `id`.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Project name (required)."),
  number: z.string().optional().describe("Internal reference number."),
  comment: z.string().optional().describe("Description."),
  invoiceText: z.string().optional().describe("Text for invoices."),
  customer: z.number().optional().describe("Parent customer ID. Find via kimai_list_customers."),
  teams: z.array(z.number()).optional().describe("Team IDs to assign."),
  color: z.string().optional().describe("Color hex code."),
  budget: z.number().optional().describe("Budget amount."),
  timeBudget: z.string().optional().describe("Time budget in seconds."),
  budgetType: z.literal("month").optional().describe("Budget type."),
  visible: z.boolean().optional().describe("Whether visible. Default: true."),
  billable: z.boolean().optional().describe("Whether billable. Default: true."),
}).describe("Create a new project. Name is required. Optionally assign to a customer.")
```

---

### 37. kimai_update_project ⚠️

**Description:** Update an existing project. Only specified fields are modified.

**Backing method:** `ProjectClient.update()`

**Return:** `Project` — the updated project.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the project to update."),
  name: z.string().optional().describe("New project name."),
  number: z.string().optional().describe("New reference number."),
  comment: z.string().optional().describe("New description."),
  invoiceText: z.string().optional().describe("New invoice text."),
  customer: z.number().optional().describe("New parent customer ID."),
  teams: z.array(z.number()).optional().describe("New team IDs."),
  color: z.string().optional().describe("New color."),
  budget: z.number().optional().describe("New budget."),
  timeBudget: z.string().optional().describe("New time budget."),
  budgetType: z.literal("month").optional().describe("Budget type."),
  visible: z.boolean().optional().describe("New visibility."),
  billable: z.boolean().optional().describe("New billable status."),
}).describe("Update an existing project. Only provided fields are modified.")
```

---

### 38. kimai_delete_project ⚠️

**Description:** Delete a project. ⚠️ IRREVERSIBLE — affects all associated activities and timesheets.

**Backing method:** `ProjectClient.delete()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the project to delete."),
}).describe("Delete a project. IRREVERSIBLE — all associated activities and timesheets may be affected.")
```

---

### 39. kimai_create_tag ⚠️

**Description:** Create a new tag. Requires `name`.

**Backing method:** `TagClient.create()`

**Return:** `Tag` — the created tag with assigned `id`.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Tag name (required)."),
  color: z.string().optional().describe("Color hex code."),
  visible: z.boolean().optional().describe("Whether visible. Default: true."),
}).describe("Create a new tag. Name is required.")
```

---

### 40. kimai_delete_tag ⚠️

**Description:** Delete a tag by ID. ⚠️ IRREVERSIBLE.

**Backing method:** `TagClient.delete()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the tag to delete. Find via kimai_list_tags or kimai_find_tag."),
}).describe("Delete a tag. IRREVERSIBLE.")
```

---

### 41. kimai_create_team ⚠️

**Description:** Create a new team. Requires `name`.

**Backing method:** `TeamClient.create()`

**Return:** `Team` — the created team with assigned `id`.

**Input schema:**
```typescript
z.object({
  name: z.string().describe("Team name (required)."),
  color: z.string().optional().describe("Color hex code."),
}).describe("Create a new team. Name is required.")
```

---

### 42. kimai_update_team ⚠️

**Description:** Update an existing team. Only specified fields are modified.

**Backing method:** `TeamClient.update()`

**Return:** `Team` — the updated team.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the team to update."),
  name: z.string().optional().describe("New team name."),
  color: z.string().optional().describe("New color hex code."),
}).describe("Update an existing team. Only provided fields are modified.")
```

---

### 43. kimai_delete_team ⚠️

**Description:** Delete a team. ⚠️ IRREVERSIBLE — removes team membership for all members.

**Backing method:** `TeamClient.delete()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the team to delete."),
}).describe("Delete a team. IRREVERSIBLE — all team memberships are removed.")
```

---

### 44. kimai_create_user ⚠️

**Description:** Create a new user. Requires `username` and `email`. Admin-only.

**Backing method:** `UserClient.create()`

**Return:** `UserEntity` — the created user with assigned `id`.

**Input schema:**
```typescript
z.object({
  username: z.string().describe("Username (required, unique)."),
  email: z.string().describe("Email address (required)."),
  teams: z.array(z.number()).optional().describe("Team IDs to assign. Find via kimai_list_teams."),
}).describe("Create a new user. Requires username and email. Admin permission required.")
```

---

### 45. kimai_update_user ⚠️

**Description:** Update an existing user. Only specified fields are modified. Admin-only.

**Backing method:** `UserClient.update()`

**Return:** `User` — the updated user.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the user to update."),
  alias: z.string().optional().describe("Display alias."),
  title: z.string().optional().describe("Title (e.g., 'Mr.', 'Dr.')."),
  firstname: z.string().optional().describe("First name."),
  lastname: z.string().optional().describe("Last name."),
  email: z.string().optional().describe("Email address."),
  teams: z.array(z.number()).optional().describe("Team IDs to assign."),
  locale: z.string().optional().describe("Locale (e.g., 'en', 'de')."),
  timezone: z.string().optional().describe("Timezone (e.g., 'Europe/Berlin')."),
}).describe("Update an existing user. Admin permission required.")
```

---

### 46. kimai_add_team_member ⚠️

**Description:** Add a user to a team.

**Backing method:** `TeamClient.addMember()`

**Return:** `Team` — the updated team with new member.

**Input schema:**
```typescript
z.object({
  teamId: z.number().describe("Numeric ID of the team. Find via kimai_list_teams."),
  userId: z.number().describe("Numeric ID of the user to add. Find via kimai_list_users."),
}).describe("Add a user as a member of a team.")
```

---

### 47. kimai_remove_team_member ⚠️

**Description:** Remove a user from a team.

**Backing method:** `TeamClient.removeMember()`

**Return:** `void`

**Input schema:**
```typescript
z.object({
  teamId: z.number().describe("Numeric ID of the team."),
  userId: z.number().describe("Numeric ID of the user to remove."),
}).describe("Remove a user from a team.")
```

---

### 48. kimai_add_customer_comment ⚠️

**Description:** Add a comment to a customer. Requires `body`.

**Backing method:** `CustomerClient.createComment()`

**Return:** `Comment` — the created comment with `id`.

**Input schema:**
```typescript
z.object({
  customerId: z.number().describe("Numeric ID of the customer. Find via kimai_list_customers."),
  body: z.string().describe("Comment text (required)."),
}).describe("Add a comment to a customer record.")
```

---

### 49. kimai_add_project_comment ⚠️

**Description:** Add a comment to a project. Requires `body`.

**Backing method:** `ProjectClient.createComment()`

**Return:** `Comment` — the created comment with `id`.

**Input schema:**
```typescript
z.object({
  projectId: z.number().describe("Numeric ID of the project. Find via kimai_list_projects."),
  body: z.string().describe("Comment text (required)."),
}).describe("Add a comment to a project record.")
```

---

### 50. kimai_update_invoice_custom_fields ⚠️

**Description:** Update custom fields on an invoice.

**Backing method:** `InvoiceClient.updateCustomFields()`

**Return:** `Invoice` — the updated invoice.

**Input schema:**
```typescript
z.object({
  id: z.number().describe("Numeric ID of the invoice. Find via kimai_list_invoices."),
  fields: z.array(z.object({
    name: z.string().describe("Custom field name."),
    value: z.string().optional().describe("Custom field value."),
  })).describe("Array of custom field name/value pairs to set."),
}).describe("Update custom fields on an invoice. Pass an array of {name, value} objects.")
```

---

## APPROVAL WORKFLOW TOOLS (opt-in, admin-only)

Enable via `MCP_KIMAI_APPROVAL_TIER=true`.

### 51. kimai_submit_for_approval ⚠️

**Description:** Submit a week's timesheets for approval. Returns the approval URL.

**Backing method:** `ApprovalBundleClient.addToApprove()`

**Return:** `string` — URL of the submitted approval week.

**Input schema:**
```typescript
z.object({
  date: z.string().describe("Week date in ISO format (YYYY-MM-DD). The week containing this date is submitted."),
  user: z.number().optional().describe("User ID to submit for. Defaults to API key owner."),
}).describe("Submit a week's timesheets for approval. Returns the approval URL.")
```

---

### 52. kimai_get_week_status

**Description:** Get approval status for a specific week.

**Backing method:** `ApprovalBundleClient.weekStatus()`

**Return:** `ApprovalWeekStatus` — object with `user`, `date`, `approved`, `timesheets`, `duration`.

**Input schema:**
```typescript
z.object({
  date: z.string().describe("Week date in ISO format (YYYY-MM-DD)."),
  user: z.number().optional().describe("User ID to check. Defaults to API key owner."),
}).describe("Get the approval status for a specific week.")
```

---

### 53. kimai_get_next_week

**Description:** Get the next week requiring approval.

**Backing method:** `ApprovalBundleClient.nextWeek()`

**Return:** `ApprovalWeekStatus` — the next week's status.

**Input schema:**
```typescript
z.object({
  user: z.number().optional().describe("User ID to check. Defaults to API key owner."),
}).describe("Get the next week that needs approval.")
```

---

### 54. kimai_get_overtime_year

**Description:** Get yearly overtime summary for a user.

**Backing method:** `ApprovalBundleClient.overtimeYear()`

**Return:** `ApprovalOvertimeYear` — total overtime and per-week breakdown.

**Input schema:**
```typescript
z.object({
  date: z.string().describe("Date in ISO format (YYYY-MM-DD). The year of this date is queried."),
  user: z.number().optional().describe("User ID to check. Defaults to API key owner."),
}).describe("Get the yearly overtime summary for a user.")
```

---

### 55. kimai_get_weekly_overtime

**Description:** Get weekly overtime entries for a user.

**Backing method:** `ApprovalBundleClient.weeklyOvertime()`

**Return:** `ApprovalWeeklyOvertime[]` — array of weekly overtime entries.

**Input schema:**
```typescript
z.object({
  date: z.string().describe("Date in ISO format (YYYY-MM-DD)."),
  user: z.number().optional().describe("User ID to check. Defaults to API key owner."),
}).describe("Get weekly overtime entries for a user.")
```

---

## EXCLUDED ENDPOINTS (not exposed as tools)

| Endpoint | Reason |
|----------|--------|
| `GET /api/invoices/{id}/download` | Binary response — not suitable for MCP text tools |
| `GET /api/export` | Binary response — not implemented in SDK |
| `DELETE /api/export/{id}` | Export template deletion — too niche, low value |
| `GET /api/actions/{resource}/{id}/{view}/{locale}` | UI-specific actions — not useful for LLM automation |
| `PATCH /api/users/{id}/preferences` | Sensitive admin op — use Kimai UI directly |
| `DELETE /api/users/api-token/{id}` | Sensitive admin op — use Kimai UI directly |
| `PATCH /api/{resource}/{id}/meta` (all) | Bulk meta update — use resource-specific update tools |
| `GET /api/{resource}/{id}/rates` | Rate listing — low standalone value, embedded in resource |
| `POST /api/{resource}/{id}/rates` | Rate creation — low standalone value |
| `DELETE /api/{resource}/{id}/rates/{rateId}` | Rate deletion — low standalone value |
| `POST /api/{resource}/{id}/team` | Team assignment — covered by kimai_add_team_member pattern |
| `POST /api/teams/{id}/{resource}/{id}` | Team access grants — covered by kimai_add_team_member |
| `DELETE /api/teams/{id}/{resource}/{id}` | Team access revokes — covered by kimai_remove_team_member |
| `GET /api/customers/{id}/comments` | Comment listing — low standalone value |
| `DELETE /api/{resource}/{id}/comments/{comment}` | Comment deletion — low standalone value |
| `PATCH /api/{resource}/{id}/comments/{comment}/pin` | Comment pinning — low standalone value |
| `PATCH /api/timesheets/{id}/export` | Export toggle — niche operation |
| `PATCH /api/invoices/{id}/custom-fields` | Included in full tier as kimai_update_invoice_custom_fields |

---

## TOKEN BUDGET SUMMARY

- **Core tier:** 23 tools — ~4,500-6,000 tokens for `tools/list`
- **Full CRUD tier:** 27 additional tools — ~7,000-9,000 additional tokens
- **Approval tier:** 5 additional tools — ~1,000-1,500 additional tokens
- **Total (all tiers):** 55 tools — ~13,000-17,000 tokens

Recommendation: Ship core tier by default. Offer full CRUD as opt-in via environment flag.

---

## IMPLEMENTATION NOTES

1. **No `list` vs `getAll` split:** MCP tools use `getAll()` internally — it handles pagination automatically for paginated endpoints and is a single fetch for non-paginated ones.
2. **No `listPages` iterator:** Async generators cannot be returned via MCP text protocol.
3. **User-filter override:** `kimai_list_timesheets` defaults to `user=all` (all users) when no user is specified, matching SDK behavior.
4. **Error surfacing:** All tools catch SDK errors and return structured error content blocks with `code`, `status`, `message`, `request`.
5. **Non-overlapping names:** Each tool has a unique `<verb>_<scope>` pair. No `search_` vs `list_` collisions.
6. **Dangerous ops marked:** All delete/mutate tools carry ⚠️ and explicit "IRREVERSIBLE" warnings in descriptions.
