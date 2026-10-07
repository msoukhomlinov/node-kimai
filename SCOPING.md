# SCOPING.md — node-kimai SDK

**CONFIRMED**

Generated: 2026-08-10

## A — Use case & orientation

- **Primary consumer:** (a) MCP server — expose Kimai data as tools
- **Secondary:** (d) SDK reusable by n8n community node (middleware/rebase)
- **Transport-injectable:** (a) Yes — design for non-MCP use (n8n compatibility)
- **MCP tool surface:** (a) Yes — MCP Toolsmith stage in scope; produces MCP_TOOL_MANIFEST.md

Design implications:
- Plain `T`/`T[]` returns (no wrapper leaks) for MCP
- Transport-injectable HTTP layer for n8n compatibility
- No runtime validation lib; zod stays consumer-side (MCP)

## B — Reference examples / prior art

- n8n node repo: `/Users/maxs/gitrepos/n8n/n8n-nodes-kimai-pro/` (87 operations, full API coverage)
- API spec: `/Users/maxs/gitrepos/n8n/n8n-nodes-kimai-pro/api-docs-v1.1.json`

Architect and implementers will read these for patterns but must NOT copy licensing or private configs.

## C — API spec source

- **Source:** (a) Local file: `/Users/maxs/gitrepos/n8n/n8n-nodes-kimai-pro/api-docs-v1.1.json`
- **Version:** (a) Highest/newest available (Kimai API v1.1)
- **Scope:** 66 paths, 52 schemas, 13 resources

Resources: activities, approval-bundle, config, customers, export, invoices, ping, plugins, projects, tags, teams, timesheets, users, version

## D — Coverage scope

- **Coverage:** (a) Full spec — every resource + endpoint
- **Cost ceiling:** (a) No explicit ceiling
- **Scope guard:** (b) Allow opportunistic extras (beyond approved scope if valuable)

## E — Package & publishing

- **Package name:** `node-kimai`
- **License:** MIT
- **Publish target:** npm
- **Module format:** Dual ESM+CJS (tsup)
- **Deep-import subpaths:** Yes (`./resources`, `./types`, `./errors`)

## F — Runtime & tooling

- **Target Node:** >=20
- **Runtime dependencies:** Zero-dep (native fetch only)
- **Test framework:** vitest
- **Build tool:** tsup (dual ESM/CJS + dts)

## G — Repo & delivery

- **Repo:** Existing: `/Users/maxs/gitrepos/node-kimai`
- **Remote:** `https://github.com/msoukhomlinov/node-kimai.git`
- **Visibility:** Public
- **Branch:** Commit to `main`, push
- **Docs:** Full (README + docs/API.md + examples)

## H — Model assignment (per-role)

Default: per_role

```json
{
  "architect": "llama-cpp-strix/qwen36-27b",
  "type_generator": "llama-cpp-strix/qwen36-27b",
  "core_client": "llama-cpp-strix/qwen36-27b",
  "resources": "llama-cpp-strix/qwen36-27b",
  "test": "llama-cpp-strix/qwen36-27b",
  "docs": "llama-cpp-strix/qwen36-27b",
  "reviewer": "omlx/Qwen3.5-122B-A10B-wMix58",
  "toolsmith": "llama-cpp-strix/qwen36-27b",
  "shipper": "llama-cpp-strix/qwen36-27b"
}
```

Concurrency notes:
- llama-cpp-strix is max_instances:1 → Architect/Types/Core/Resources/Tests/Docs/Toolsmith/Shipper run sequentially
- Reviewer (omlx) can run in parallel with strix-based roles

## I — Special endpoints & gotchas

1. **User-filter default override:** When operations offer filtering by user, if no user is specified the API defaults to the API key owner. The SDK must explicitly override this to return **all users** when no user filter is given.

2. **Approval bundle endpoints** (non-CRUD workflow):
   - `POST /api/approval-bundle/add_to_approve`
   - `GET /api/approval-bundle/next-week`
   - `GET /api/approval-bundle/overtime_year`
   - `GET /api/approval-bundle/week-status`
   - `GET /api/approval-bundle/weekly_overtime`

3. **Rate sub-endpoints** on activities:
   - `GET /api/activities/{id}/rates`
   - `POST /api/activities/{id}/rates`
   - `DELETE /api/activities/{id}/rates/{rateId}`

4. **Team membership endpoints:**
   - `POST /api/{resource}/{id}/team` (add to team)
   - `DELETE /api/{resource}/{id}/team/{userId}` (remove from team)
   - Applies to: activities, customers, projects

5. **Meta field updates via PATCH:**
   - `PATCH /api/{resource}/{id}/meta`
   - Applies to: activities, customers, projects, timesheets

6. **Export endpoint:**
   - `GET /api/export` — likely returns binary/file; needs special handling

7. **System/info endpoints:**
   - `GET /api/ping`
   - `GET /api/version`
   - `GET /api/plugins`

8. **Action endpoints** (locale/view-specific):
   - `GET /api/actions/{resource}/{id}/{view}/{locale}`
   - For: activity, customer, project, timesheet

