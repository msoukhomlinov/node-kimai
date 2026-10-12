// Served-text single-source pin (issue #21): the curated override text is the SINGLE source of
// the served description of an overridden tool. #20 made the generator stop re-appending the
// mechanical bounds sentence on top of a curated text, but nothing pinned it: re-introducing the
// duplication (removing the `tool.bounds = ''` handling in scripts/project-mcp-tools.mjs) was
// caught by no test, and only `mcp:project --check` reacted, via the stale manifest.
//
// This suite re-runs the ACTUAL composition from source: it spawns a real node process that
// imports `project` and `boundsSentence` from the generator script itself — the same code that
// renders the manifest — against the repo's own capabilities.json + MCP_TOOL_OVERRIDES.json, so
// a regression inside the generator reaches THIS test, not only the stale-manifest check. For a
// named sample of overridden tools spanning core and non-core it asserts that the served text
// contains the override line exactly once and no re-appended mechanical bounds line.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { SERVED_TEXT_RULE, TOOL_TEXT_OVERRIDES } from '../src/mcp/index';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GENERATOR = fileURLToPath(new URL('../scripts/project-mcp-tools.mjs', import.meta.url));

/**
 * The sample: a small deterministic set of overridden tools covering BOTH tiers and every
 * mechanical-bounds shape:
 *   core     kimai_search_timesheets          R4 workflow read — "Bounded: limit …, Compact …" line
 *            kimai_get_current_user           R2 identity — no mechanical line
 *            kimai_get_week_status            R4 stand-in (approvalBundle) — no mechanical line
 *   non-core kimai_search_invoices            "Bounded: limit …, Compact …" line
 *            kimai_list_teams                 "Returns all matching records (non-paginated)" line
 *            kimai_create_timesheet           "Dry-run first" line
 *            kimai_revoke_team_customer_access  "Irreversible. Requires confirmation" line
 */
const SAMPLE = [
  { name: 'kimai_search_timesheets', core: true },
  { name: 'kimai_get_current_user', core: true },
  { name: 'kimai_get_week_status', core: true },
  { name: 'kimai_search_invoices', core: false },
  { name: 'kimai_list_teams', core: false },
  { name: 'kimai_create_timesheet', core: false },
  { name: 'kimai_revoke_team_customer_access', core: false },
] as const;

type Served = { core: boolean; override: string; mech: string; served: string };

/**
 * The probe re-derives everything from source at run time — no expected strings copied out of
 * today's output:
 *   override — the curated text from MCP_TOOL_OVERRIDES.json itself (never re-read off the tool);
 *   mech     — the mechanical bounds line, computed by the generator's own `boundsSentence`;
 *   served   — the manifest's composition rule for a dedicated tool: the description, then the
 *              bounds line only when the generator kept one (`description + ' ' + bounds`);
 *   core     — the projection's computed CORE tier, so the sample's tier labels stay honest.
 */
const PROBE = `
import { project, boundsSentence } from ${JSON.stringify(GENERATOR)};
import { readFileSync } from 'node:fs';
const registry = JSON.parse(readFileSync(${JSON.stringify(ROOT + '/capabilities.json')}, 'utf8'));
const overrides = JSON.parse(readFileSync(${JSON.stringify(ROOT + '/MCP_TOOL_OVERRIDES.json')}, 'utf8'));
const curated = new Map(overrides.filter((o) => o.field === 'description').map((o) => [o.tool, o.newValue]));
const data = project(registry, overrides);
const recordById = new Map(Object.values(registry.groups).flatMap((g) => g.records).map((r) => [r.id, r]));
const names = ${JSON.stringify(SAMPLE.map((s) => s.name))};
const out = {};
for (const name of names) {
  const tool = data.tools.find((t) => t.name === name);
  if (!tool) { console.error('no projected tool named ' + name); process.exit(2); }
  out[name] = {
    core: data.coreNames.has(name),
    override: curated.get(name) ?? '',
    mech: boundsSentence(recordById.get(tool.backingOperation)),
    served: tool.description + (tool.bounds ? ' ' + tool.bounds : ''),
  };
}
console.log(JSON.stringify(out));
`;

let served: Record<string, Served> = {};

beforeAll(() => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  const parsed = JSON.parse(out) as Record<string, Served | undefined>;
  for (const { name } of SAMPLE) {
    expect(parsed[name], `${name}: the probe must report the projected tool`).toBeDefined();
  }
  served = parsed as Record<string, Served>;
});

/** Non-overlapping occurrences of needle in haystack (an empty needle is never "contained"). */
const countOf = (haystack: string, needle: string) => (needle === '' ? 0 : haystack.split(needle).length - 1);

describe('served-text single-source rule (issue #21 regression pin)', () => {
  it('the sample keeps the core membership it names (core R2/R4 reads + non-core tools)', () => {
    for (const { name, core } of SAMPLE) {
      expect(served[name]!.core, `${name}: core membership must stay as named in this sample`).toBe(core);
    }
  });

  it('serves the curated override line exactly once and no re-appended mechanical bounds line', () => {
    for (const { name } of SAMPLE) {
      const s = served[name]!;
      expect(s.override.length, `${name}: the sample tool must carry a curated description override`).toBeGreaterThan(0);
      expect(countOf(s.served, s.override), `${name}: the override line must appear exactly once in the served text`).toBe(1);
      if (s.mech !== '') {
        // The mechanical line may appear in the served text only as often as the curated text
        // itself carries it (zero today for every sampled override) — a re-appended sentence adds
        // one copy the curation data does not contain.
        expect(
          countOf(s.served, s.mech),
          `${name}: no mechanical bounds line may be re-appended on top of the curated text (tail of served: ${JSON.stringify(s.served.slice(-140))})`,
        ).toBe(countOf(s.override, s.mech));
      }
    }
  });

  it('the served text of an overridden tool IS the curated text (single source, nothing appended)', () => {
    for (const { name } of SAMPLE) {
      const s = served[name]!;
      expect(s.served, `${name}: the served text must be exactly the curated override text`).toBe(s.override);
    }
  });

  it('the mcp subpath mirrors the curated text of the sample and states the rule', () => {
    for (const { name } of SAMPLE) {
      expect(TOOL_TEXT_OVERRIDES[name], `${name}: the mcp subpath must export the curated text`).toBe(served[name]!.override);
    }
    expect(SERVED_TEXT_RULE).toContain('SINGLE source');
    expect(SERVED_TEXT_RULE).toContain('appends no mechanical bounds sentence');
  });
});
