# SDK Gap Register

Known gaps, vendor limitations, and open upstream issues against `node-kimai`, recorded during the
**iit-mcp-kimai** MCP server build (consumer of `^2.0.0`; evidence verified against the 2.0.1 checkout, 2026-10-02).

Rules for this register:

- nothing here is "fixed" inside the MCP server by raw vendor calls — gaps are filed upstream and mitigated
  at the server boundary only (documented shells: timeout decorator, strict pre-dispatch validation, error serializer).
- **OPEN** rows carry an issue link; **non-gap** rows are recorded vendor/contract observations that need no SDK change.

## Filed issues (OPEN)

| ID | Title | Issue | Severity / impact | Server-side mitigation | Status |
|----|-------|-------|-------------------|------------------------|--------|
| G1 | No request timeout / AbortSignal / cancellation | [#7](https://github.com/msoukhomlinov/node-kimai/issues/7) | HIGH — a hung Kimai hangs the MCP request indefinitely; network failures surface as untyped `fetch` errors, not `ApiError` | injected transport wrapped in an `AbortSignal.timeout` decorator (default 30 s) | OPEN |
| G4 | Registry pagination metadata wrong for 6 of 8 `*.list` ops | [#8](https://github.com/msoukhomlinov/node-kimai/issues/8) | MEDIUM — served tool text inherits a false vendor-paging claim (50/500) for single-batch resources | affected list tools treated as single complete batches; interim override text | OPEN |
| G5 | Error contract: `request` carries the full URL, manifest says "PATH only" | [#9](https://github.com/msoukhomlinov/node-kimai/issues/9) | LOW — contract wording wrong; the query can carry user filter text | error serializer strips origin + query before serving | OPEN |
| G8 | 2.0.1 (path-id validation fix) not published to npm | [#10](https://github.com/msoukhomlinov/node-kimai/issues/10) | HIGH — `^2.0.0` resolves to 2.0.0, whose weaker `pathId()` is the injection surface the fix closed | server rejects non-integer path ids before dispatch; pin `^2.0.1` once published | OPEN |
| T-8 | Published 2.0.0: two `ApiError` identities (root bundle vs `./errors` subpath) | [#11](https://github.com/msoukhomlinov/node-kimai/issues/11) | HIGH — identity guards built on one copy reject the other; production timeouts mapped to `INTERNAL_ERROR` | server imports `ApiError` from the root only (pinned by a unit test) | OPEN |
| G11 | `timesheets.getActive` has no user scope | [#12](https://github.com/msoukhomlinov/node-kimai/issues/12) | MEDIUM — per-user "active now" needs the wider `list`/`search` path with the boolean `active` filter | tool guidance documents the `list`/`search` + `user:` path | OPEN |
| I-1…I-11 | MCP-projection curated-override text defects (clusters F1–F13), incl. `mcp` subpath not embedding non-core overrides | [I-1…I-11](https://github.com/msoukhomlinov/node-kimai/issues/13) | MEDIUM — served tool text duplicated, misleading, or missing guidance; published 2.0.0's `mcp` subpath embeds only the 10 core curated texts (the 10 curated non-core tools serve raw registry text), while unpublished 2.0.1 embeds the overrides with visible one-line duplication | interim server-side override table (71 entries, planHash-guarded) | OPEN |

## Documented non-gaps / observations

| ID | Observation | Disposition |
|----|-------------|-------------|
| G2 | No SDK-side retry/backoff — deliberate policy: the transport never retries; the caller re-issues on 429/5xx; `idempotencySupport: "none"` (the vendor has no idempotency keys) | Accepted by design. Server/gateway decides the retry policy; only the 76 of 108 `idempotent`-flagged ops are safe to re-issue; surfaced `retryAfter` is honoured. File an SDK issue only if a retry helper is wanted SDK-side. |
| G3 | `GET /api/tags` (deprecated string-list endpoint, `x-internal: true`) not wrapped | Intentional — the SDK uses the non-deprecated `GET /api/tags/find` for both `tags.find` and `tags.list`. No issue. |
| G6 | No vendor aggregate/totals endpoints (no per-project/per-user sums in API v1.1) | Vendor limitation, not fixable in the SDK — "totals" are client-side aggregation over bounded rows. Recorded as a vendor limitation. |
| G7 | No batch approval-bundle endpoints — week status / overtime / add-to-approve are per-user | Vendor limitation (approval plugin); composites fan out N requests per call, capped, with partial coverage disclosed. Not an SDK defect. |
| G9 | `invoices.download` binary export is outside the MCP surface by rule (ArrayBuffer is not an MCP text result; dispatch refuses it, so the rule is unbypassable) | Vendor/protocol limitation — out-of-band download is a host concern. Recorded; no issue. |
| G10 | SDK contract tightens the vendor on approval-bundle `date` (vendor: optional; SDK: required string) | Deliberate contract — composites always compute the week's Monday; documented in the composite descriptions so agents always pass `date`. |

## Provenance

- Source audit: iit-mcp-kimai build docs — `.squad/recon.md` §13 (SDK gaps G1–G11) and §3.4, `.squad/description.md` §4 (SDK-projection audit, I-1…I-11), `.squad/testing.md` (T-8), `.squad/security.md` (SEC-02, SEC-11).
- Verified against the node-kimai 2.0.1 checkout (2026-10-02): `src/client.ts`, `capabilities.json`, `MCP_TOOL_MANIFEST.md`, `MCP_TOOL_OVERRIDES.json`, `src/mcp/catalog.generated.ts`, `tsup.config`, `CHANGELOG.md`, npm registry.
