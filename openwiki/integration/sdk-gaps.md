---
type: gap-register
title: SDK Gap Register and Known Limitations
description: Tracks known gaps, vendor limitations, resolved issues, documented non-gaps, and the gap resolution policy
tags: [gaps, issues, limitations, vendor, resolution]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-16T19:15:11.316Z
sources:
  - id: openwiki-source-362e06c30ccfdafd87339cb0
    resource: repo://ARCHITECTURE.md
  - id: openwiki-source-ca6cb4b1a14fd7969dfae3ec
    resource: repo://CHANGELOG.md
  - id: openwiki-source-0b9425902eb6525d099366fe
    resource: repo://docs/sdk-gaps.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
generated: { by: "openwiki/0.9.0", at: "2026-11-16T19:15:11.316Z" }
---

# SDK Gap Register and Known Limitations

This register documents known gaps, vendor limitations, and resolved issues tracked during the development and deployment of the node-kimai SDK, particularly during the iit-mcp-kimai MCP server build (consumer of `^2.0.0`).

## Current Status

**SDK Version:** 2.0.2 (published 2026-10-12)

**All filed issues resolved:** G1, G4, G5, G8, G11, I-1 through I-11, and T-8 are FIXED in published versions 2.0.1 and 2.0.2.

## Gap Resolution Policy

The register follows these rules:

1. **No workarounds in MCP server** — gaps are filed upstream to the SDK and mitigated at the server boundary only through documented shells (timeout decorator, strict pre-dispatch validation, error serializer)
2. **OPEN rows** carry an issue link and require SDK changes
3. **Non-gap rows** are recorded vendor/contract observations that need no SDK change
4. **Fixed rows** document the resolution, affected versions, and mitigation path

## Resolved Issues

All issues listed here were resolved and published in versions 2.0.1 (2026-10-09) or 2.0.2 (2026-10-12).

### G1: Request Timeout / Cancellation Support

**Issue:** [#7](https://github.com/msoukhomlinov/node-kimai/issues/7)

**Severity:** HIGH — a hung Kimai hangs the MCP request indefinitely; network failures surface as untyped `fetch` errors, not `ApiError`

**Problem:** No request timeout, AbortSignal, or cancellation mechanism in the transport layer.

**Resolution:** Fixed on main and published in 2.0.1 (2026-10-09):
- Constructor `timeoutMs` option for default timeout
- Per-request `timeoutMs`/`signal` options
- Composed with an owned `AbortController` when both are active
- Deadline or caller abort → typed `ApiError` with category `timeout`, code `TIMEOUT`
- Network failure with no response → typed category `network`, code `NETWORK`
- Both failures: `status: 0`, `retryable: true`

**Server-side mitigation:** Injected transport wrapped in an `AbortSignal.timeout` decorator (default 30s). With 2.0.1 published, the workaround is optional (retiring it is the server's call). It composes with the native support without conflict — whichever deadline fires first wins, both reject with the same typed shape.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

### G4: Registry Pagination Metadata Incorrect

**Issue:** [#8](https://github.com/msoukhomlinov/node-kimai/issues/8)

**Severity:** MEDIUM

**Problem:** Registry pagination metadata wrong for 6 of 8 `*.list` operations — served tool text inherited a false vendor-paging claim (50/500) for single-batch resources.

**Resolution:** Fixed on main and published in 2.0.1 (2026-10-09):
- Registry `pagination.mode` is now derived per resource from the vendored spec
- Single-batch resources serve `mode: "none"`

**Server-side mitigation:** Affected list tools treated as single complete batches. The interim override text can be retired once the server consumes 2.0.1.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

### G5: Error Contract Request Field Documentation

**Issue:** [#9](https://github.com/msoukhomlinov/node-kimai/issues/9)

**Severity:** LOW — contract wording wrong; the query can carry user filter text

**Problem:** Error contract `request` field carries the full URL, but manifest says "PATH only".

**Resolution:** Fixed on main and published in 2.0.1 (2026-10-09):
- Manifest now states `request` is the full absolute URL, query string included

**Server-side mitigation:** Error serializer strips origin + query before serving. The workaround can be retired once the server consumes 2.0.1.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

### G8: Version 2.0.1 Not Published to npm

**Issue:** [#10](https://github.com/msoukhomlinov/node-kimai/issues/10)

**Severity:** HIGH — `^2.0.0` resolved to 2.0.0, whose weaker `pathId()` was the injection surface the fix closed

**Problem:** Path-id validation fix not available on npm; `^2.0.0` resolved to vulnerable 2.0.0.

**Resolution:** Published to npm on 2026-10-09 (npm `latest` since):
- Since the publish, `^2.0.0` resolves to 2.0.1
- Stricter path id validation prevents injection

**Server-side mitigation:** Server rejects non-integer path ids before dispatch. Pin `^2.0.1` (published 2026-10-09).

**Status:** FIXED (published 2.0.1)

### G11: timesheets.getActive User Scope

**Issue:** [#12](https://github.com/msoukhomlinov/node-kimai/issues/12)

**Severity:** MEDIUM

**Problem:** `timesheets.getActive` has no user scope — the vendor endpoint is caller-scoped (no user parameter).

**Resolution:** Fixed on main and published in 2.0.1 (2026-10-09):
- Caller-scope note documented on the client method
- Served MCP text keeps the `list`/`search` + `user:` guidance

**Server-side mitigation:** Tool guidance documents the `list`/`search` + `user:` path for per-user active timesheets.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

### T-8: ApiError Identity Guarantee

**Issue:** [#11](https://github.com/msoukhomlinov/node-kimai/issues/11)

**Severity:** HIGH — pre-fix, identity guards built on one copy rejected the other; production timeouts mapped to `INTERNAL_ERROR`

**Problem:** One `ApiError` identity shared by the root entry and the `./errors` subpath not guaranteed — pre-fix split (each entry inlining its own class) broke class identity and cross-subpath `instanceof` checks.

**Resolution:** Fixed on main by #17 and published in 2.0.1 (verified 2026-10-12 against published tarball):
- Every entry re-exports the single physical `dist/errors` module via the self-referencing `node-kimai/errors` external
- Class identity, cross-subpath `instanceof` (both directions), and the root `isKimaiError` guard hold in ESM and CJS
- Guarantee pinned by `test/errors-identity.test.ts`

**Server-side mitigation:** Server imports `ApiError` from the root only (pinned by a unit test). With 2.0.1 published, `./errors` imports are safe.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

**Verification:** Cross-entry identity guarantee pinned by `test/errors-identity.test.ts`

### I-1 through I-11: MCP Projection Text Defects

**Issues:** [I-1…I-11](https://github.com/msoukhomlinov/node-kimai/issues/13)

**Severity:** MEDIUM

**Problem:** MCP-projection curated-override text defects (clusters F1–F13), including:
- `mcp` subpath not embedding non-core overrides
- Duplicated mechanical bounds lines in served text
- Curated text not being single source

**Resolution:** Fixed on main and published in 2.0.1 (2026-10-09):
- Audited texts applied through the curation pipeline
- Curated text is the single source of served text (no duplicated line)
- `mcp` subpath exports the curated text of every overridden tool (`TOOL_TEXT_OVERRIDES`)
- Served-text composition rule exported (`SERVED_TEXT_RULE`)
- Served catalog rows and parameter descriptions carry audited guidance

**Server-side mitigation:** Interim server-side override table (71 entries, planHash-guarded). Can be retired with 2.0.1 consumption.

**Status:** FIXED (published 2.0.1; published 2.0.0 remains affected)

**Regression protection:** `test/mcp-served-text-single-source.test.ts` pins the served-text single-source rule (added in 2.0.2).

## Documented Non-Gaps

These are recorded vendor or contract observations that require no SDK changes.

### G2: No SDK-Side Retry/Backoff

**Observation:** The SDK transport never retries requests.

**Disposition:** Accepted by design. The transport never retries; the caller re-issues on 429/5xx. The registry documents `idempotencySupport: "none"` (the vendor has no idempotency keys). Only 23 of 108 operations carry the `idempotent` flag in their registry record—these are write operations safe to re-issue without side effects. The total count of safe-to-retry operations is higher when including all read operations (76 total: 53 reads + 23 idempotent writes). Surfaced `retryAfter` (parsed from `Retry-After` header) is honored by callers.

**Server/gateway decision:** Server or gateway layer decides the retry policy. File an SDK issue only if a retry helper is wanted SDK-side.

### G3: Deprecated Tags Endpoint Not Wrapped

**Observation:** `GET /api/tags` (deprecated string-list endpoint, `x-internal: true`) not wrapped by SDK.

**Disposition:** Intentional — the SDK uses the non-deprecated `GET /api/tags/find` for both `tags.find` and `tags.list`. No issue.

### G6: No Vendor Aggregate/Totals Endpoints

**Observation:** No vendor aggregate or totals endpoints (no per-project/per-user sums in API v1.1).

**Disposition:** Vendor limitation, not fixable in the SDK. "Totals" are client-side aggregation over bounded rows. Recorded as a vendor limitation.

### G7: No Batch Approval-Bundle Endpoints

**Observation:** Week status, overtime, and add-to-approve operations are per-user, not batch.

**Disposition:** Vendor limitation (approval plugin). Composites fan out N requests per call, capped, with partial coverage disclosed. Not an SDK defect.

### G9: Binary Export Outside MCP Surface

**Observation:** `invoices.download` binary export is outside the MCP surface by rule (ArrayBuffer is not an MCP text result; dispatch refuses it, so the rule is unbypassable).

**Disposition:** Vendor/protocol limitation — out-of-band download is a host concern. Recorded; no issue.

### G10: Approval-Bundle Date Contract Tightening

**Observation:** SDK contract tightens the vendor on approval-bundle `date` parameter (vendor: optional; SDK: required string).

**Disposition:** Deliberate contract — composites always compute the week's Monday. Documented in the composite descriptions so agents always pass `date`.

## Impact Summary by Version

### Version 2.0.0 (published 2026-10-02)
- **Affected by:** G1, G4, G5, G8, G11, T-8, I-1 through I-11
- **Status:** All issues remain unfixed in this version
- **Recommendation:** Upgrade to 2.0.1 or later

### Version 2.0.1 (published 2026-10-09)
- **Fixed:** G1, G4, G5, G8, G11, T-8, I-1 through I-11
- **Status:** All known issues resolved
- **Breaking changes:** None (additive fixes only)

### Version 2.0.2 (published 2026-10-12)
- **Added:** Regression protection for served-text single-source rule
- **Updated:** Gap register documentation
- **Status:** Current stable version

## Provenance and Verification

**Source audit:** iit-mcp-kimai build documentation:
- `.squad/recon.md` §13 (SDK gaps G1–G11)
- `.squad/recon.md` §3.4 (vendor observations)
- `.squad/description.md` §4 (SDK-projection audit, I-1…I-11)
- `.squad/testing.md` (T-8 identity guarantee)
- `.squad/security.md` (SEC-02, SEC-11)

**Verification baseline:** node-kimai 2.0.1 checkout (2026-10-02):
- `src/client.ts` (timeout/cancellation implementation)
- `capabilities.json` (pagination metadata)
- `MCP_TOOL_MANIFEST.md` (error contract documentation)
- `MCP_TOOL_OVERRIDES.json` (curated override texts)
- `src/mcp/catalog.generated.ts` (catalog generation)
- `tsup.config` (packaging configuration)
- `CHANGELOG.md` (version history)
- npm registry (published versions)

**Gap register location:** `docs/sdk-gaps.md`

## Related Documentation

- Timeout and cancellation implementation: `src/client.ts`
- Error hierarchy and structured errors: `src/errors.ts`, ARCHITECTURE.md §5
- Agent execution layer: ARCHITECTURE.md §15
- MCP server support surface: ARCHITECTURE.md §16
- Capability registry: `capabilities.json`
- Change history: `CHANGELOG.md`
