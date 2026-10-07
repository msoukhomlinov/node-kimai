// `node-kimai/mcp` catalog: the generated data surface and its runtime helpers.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  CATALOG_PLAN_HASH,
  CORE_RULE,
  CORE_TOOLS,
  DEFAULT_CATALOG_LIMIT,
  DISPATCH_OPERATIONS,
  EXPOSED,
  INPUT_CONTRACTS,
  MAX_CATALOG_LIMIT,
  META_TOOLS,
  REFUSALS,
  TOOL_DESCRIPTIONS,
  catalogPage,
  catalogRow,
  configError,
  describeOperation,
  inputFields,
  kimaiDispatchInputSchema,
  nearestKeys,
  requireCatalogRow,
} from '../src/mcp/index';
import { CAPABILITIES, CAPABILITY_PLAN_HASHES, getCapability } from '../src/capabilities';

const registry = JSON.parse(readFileSync(new URL('../capabilities.json', import.meta.url), 'utf8')) as {
  groups: Record<string, { planHash: string; records: Array<{ id: string; effect: string }> }>;
};
const registryRecords = Object.values(registry.groups).flatMap((g) => g.records);

describe('generated catalog data', () => {
  it('carries one row per registry operation and pins the plan hash', () => {
    expect(CATALOG).toHaveLength(registryRecords.length);
    expect(new Set(CATALOG.map((r) => r.op))).toEqual(new Set(registryRecords.map((r) => r.id)));
    expect(CATALOG_PLAN_HASH).toBe(Object.values(registry.groups)[0]!.planHash);
    expect(CAPABILITY_PLAN_HASHES[Object.keys(registry.groups)[0]!]).toBe(CATALOG_PLAN_HASH);
    expect(CATALOG).toEqual([...CATALOG].sort((a, b) => (a.op < b.op ? -1 : 1)));
  });

  it('marks every row reachable or refused with a reason, and exposes the dispatch tools', () => {
    for (const row of CATALOG) {
      if (!row.reachable) expect(row.reason).toBeTruthy();
      else if (row.tool === null) expect(typeof row.reason).toBe('string');
    }
    expect(REFUSALS['invoices.download']!.reachable).toBe(false);
    expect(REFUSALS['invoices.download']!.reason).toContain('binary/download');
    expect(DISPATCH_OPERATIONS.read).not.toContain('invoices.download');
  });

  it('splits the dispatch enums by registry effect', () => {
    for (const [effect, ops] of Object.entries(DISPATCH_OPERATIONS)) {
      expect(ops.length).toBeGreaterThan(0);
      for (const op of ops) expect(getCapability(op)?.effect).toBe(effect);
      expect(ops).toEqual([...ops].sort());
    }
  });

  it('publishes the core tier, the five META tools and their descriptions', () => {
    expect(CORE_TOOLS).toHaveLength(10);
    expect(META_TOOLS.map((m) => m.name)).toEqual(['kimai_catalog', 'kimai_describe', 'kimai_read', 'kimai_write', 'kimai_delete']);
    for (const name of ['kimai_catalog', 'kimai_describe', 'kimai_read', 'kimai_write', 'kimai_delete']) {
      expect(CORE_TOOLS).toContain(name);
      expect(TOOL_DESCRIPTIONS[name]?.length).toBeGreaterThan(40);
    }
    expect(CORE_RULE.threshold).toBe(10);
    expect(CORE_RULE.requirements.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
    const writeDispatcher = META_TOOLS.find((m) => m.name === 'kimai_write')!;
    expect(writeDispatcher.inputSchema.fields.find((f) => f.name === 'operation')?.enum).toEqual(DISPATCH_OPERATIONS.write);
  });

  it('exposes only registry-backed tool names', () => {
    for (const [op, tool] of Object.entries(EXPOSED)) {
      expect(getCapability(op)).toBeDefined();
      expect(tool.startsWith('kimai_')).toBe(true);
    }
    expect(EXPOSED['timesheets.search']).toBe('kimai_search_timesheets');
  });
});

describe('getCapability', () => {
  it('resolves a registry key and returns undefined for an unknown one', () => {
    expect(getCapability('timesheets.search')?.effect).toBe('read');
    expect(getCapability('nope.nothing')).toBeUndefined();
    expect(CAPABILITIES.length).toBe(registryRecords.length);
  });
});

describe('catalogRow / requireCatalogRow / nearestKeys', () => {
  it('finds a row by exact key', () => {
    expect(catalogRow('timesheets.stop')?.op).toBe('timesheets.stop');
    expect(catalogRow('timesheets.stop')?.confirm_required).toBe(false);
    expect(catalogRow('nope')).toBeNull();
  });

  it('requires a non-empty key', () => {
    expect(() => requireCatalogRow('')).toThrow(/non-empty canonical registry key/);
    expect(() => requireCatalogRow(1 as unknown as string)).toThrow(/non-empty/);
  });

  it('refuses an unknown key by naming the nearest ones', () => {
    expect(() => requireCatalogRow('timesheet.stop')).toThrow(/Nearest keys: timesheets\.stop/);
    expect(requireCatalogRow('timesheets.search').tool).toBe('kimai_search_timesheets');
  });

  it('scores nearest keys by resource and substring, honouring the limit', () => {
    expect(nearestKeys('timesheets.stop')).toContain('timesheets.stop');
    expect(nearestKeys('totally-unknown-key', 2)).toHaveLength(2);
    expect(nearestKeys('customers.s', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('catalogPage', () => {
  it('pages with defaults and counts the surface honestly', () => {
    const page = catalogPage();
    expect(page.total_operations).toBe(CATALOG.length);
    expect(page.limit).toBe(DEFAULT_CATALOG_LIMIT);
    expect(page.offset).toBe(0);
    expect(page.rows).toHaveLength(DEFAULT_CATALOG_LIMIT);
    expect(page.has_more).toBe(true);
    expect(page.reachable_operations + page.unreachable_operations).toBe(CATALOG.length);
  });

  it('ANDs the filters and answers the unexposed-only question', () => {
    const reads = catalogPage({ effect: 'read', resource: 'timesheets', limit: MAX_CATALOG_LIMIT });
    expect(reads.matched).toBeGreaterThan(0);
    for (const row of reads.rows) {
      expect(row.effect).toBe('read');
      expect(row.op.startsWith('timesheets.')).toBe(true);
    }
    const unexposed = catalogPage({ unexposed_only: true });
    expect(unexposed.matched).toBe(CATALOG.filter((r) => r.reachable && r.tool === null).length);
    for (const row of unexposed.rows) expect(row.tool).toBeNull();
    expect(catalogPage({ effect: 'read', resource: 'customers', unexposed_only: true }).rows.length).toBe(2);
  });

  it('refuses an out-of-range limit and offset instead of clamping', () => {
    expect(() => catalogPage({ limit: 0 })).toThrow(new RegExp(`limit must be an integer from 1 to ${MAX_CATALOG_LIMIT}`));
    expect(() => catalogPage({ limit: MAX_CATALOG_LIMIT + 1 })).toThrow(/limit must be an integer/);
    expect(() => catalogPage({ limit: 1.5 })).toThrow(/limit must be an integer/);
    expect(() => catalogPage({ offset: -1 })).toThrow(/offset must be an integer >= 0/);
    expect(() => catalogPage({ offset: 1.5 })).toThrow(/offset must be an integer/);
  });

  it('reports has_more false on the last page', () => {
    const offset = CATALOG.length - 1;
    expect(catalogPage({ offset, limit: 1 }).has_more).toBe(false);
  });
});

describe('inputFields', () => {
  it('reads the registry vocabulary in both declared shapes', () => {
    expect(inputFields(null)).toEqual([]);
    expect(inputFields(undefined)).toEqual([]);
    expect(inputFields([{ name: 'a', type: 'string', required: true }])).toHaveLength(1);
    expect(inputFields({ fields: [{ name: 'b', type: 'number', required: false }] })).toHaveLength(1);
    const rec = getCapability('timesheets.search')!;
    const names = inputFields(rec.inputSchema).map((f) => f.name);
    expect(names.length).toBeGreaterThan(0);
    // `type`/`name`/`fields` keys are never mistaken for fields.
    expect(inputFields({ type: 'object', name: 'x', fields: [{ name: 'c', type: 'string', required: true }] }).map((f) => f.name)).toEqual(['c']);
    expect(inputFields('not-an-object')).toEqual([]);
  });
});

describe('describeOperation', () => {
  it('describes a helper record from the registry it was handed', () => {
    const rec = getCapability('timesheets.search')!;
    const described = describeOperation(rec);
    expect(described.op).toBe('timesheets.search');
    expect(described.kind).toBe('helper');
    expect(described.effect).toBe('read');
    expect(described.requires).toEqual([]);
    expect(Object.keys(described.input_schema)).toContain('params');
    expect(described.exposed_tool).toBe('kimai_search_timesheets');
    expect(described.reachable).toBe(true);
    expect(described.why_not).toBeNull();
    expect(described.bounded_alternative).toBeNull();
    expect(described.input_contract?.closed).toBe(true);
    expect(described.example).toBeTruthy();
    expect(described.errors.length).toBeGreaterThan(0);
    expect(described.purpose).toBeTruthy();
    expect(Array.isArray(described.related)).toBe(true);
    expect(described.permissions).toBe('unknown');
    expect(described.pagination).toBeTruthy();
  });

  it('names why_not for an operation with no tool of its own', () => {
    const described = describeOperation(getCapability('timesheets.list')!);
    expect(described.exposed_tool).toBeNull();
    expect(described.why_not).toContain('no tool of its own');
  });

  it('refuses a record whose key is not in the catalog', () => {
    const rec = { ...getCapability('timesheets.search')!, id: 'not.in.the.catalog' };
    expect(() => describeOperation(rec)).toThrow(/Unknown operation/);
  });
});

describe('INPUT_CONTRACTS + kimaiDispatchInputSchema', () => {
  it('publishes a closed contract per dispatchable operation', () => {
    const dispatchable = Object.values(DISPATCH_OPERATIONS).flat();
    expect(Object.keys(INPUT_CONTRACTS).sort()).toEqual([...dispatchable].sort());
    for (const contract of Object.values(INPUT_CONTRACTS)) {
      expect(contract.closed).toBe(true);
      expect(contract.schema.additionalProperties).toBe(false);
      expect(contract.schema.properties?.dry_run).toBeUndefined();
      expect(contract.schema.properties?.confirm).toBeUndefined();
    }
  });

  it('projects the per-operation input schema with required fields', () => {
    const contract = INPUT_CONTRACTS['timesheets.search']!;
    expect(contract.effect).toBe('read');
    expect(contract.schema.properties?.params).toMatchObject({ type: 'object' });
    expect(Object.keys(contract.schema.properties ?? {})).toEqual(['params', 'limit', 'expand']);
    expect(contract.schema.required).toBeUndefined();
    expect(contract.note).toContain('unknown field is refused');
  });

  it('names the declared fields in the note and excludes the tool-level arguments', () => {
    for (const contract of Object.values(INPUT_CONTRACTS)) {
      expect(contract.note).toMatch(/unknown field is refused|takes no argument/);
      expect(contract.note).toContain('dry_run / confirm are the tool');
      for (const field of Object.keys(contract.schema.properties ?? {})) expect(contract.note).toContain(field);
    }
    expect(Object.values(INPUT_CONTRACTS).some((c) => c.note.includes('takes no argument'))).toBe(true);
    expect(describeOperation(getCapability('timesheets.list')!).pagination?.mode).toBe('page');
    const required = Object.values(INPUT_CONTRACTS).filter((c) => Array.isArray(c.schema.required) && c.schema.required.length > 0);
    expect(required.length).toBeGreaterThan(0);
  });

  it('serves one closed branch per operation for each dispatch effect', () => {
    for (const effect of ['read', 'write', 'destructive'] as const) {
      const schema = kimaiDispatchInputSchema(effect);
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(['operation']);
      expect(schema.properties?.operation?.enum).toEqual(DISPATCH_OPERATIONS[effect]);
      expect(schema.oneOf).toHaveLength(DISPATCH_OPERATIONS[effect].length);
      for (const branch of schema.oneOf!) expect(branch.properties?.input?.additionalProperties).toBe(false);
      if (effect === 'read') {
        expect(schema.properties?.dry_run).toBeUndefined();
        expect(schema.properties?.confirm).toBeUndefined();
      } else {
        expect(schema.properties?.dry_run?.type).toBe('boolean');
      }
      if (effect === 'destructive') expect(schema.properties?.confirm?.type).toBe('string');
    }
  });

  it('marks a branch required when its contract has required fields', () => {
    const schema = kimaiDispatchInputSchema('write');
    const withRequired = schema.oneOf!.filter((b) => b.required !== undefined);
    expect(withRequired.length).toBeGreaterThan(0);
    for (const branch of withRequired) expect(branch.required).toEqual(['operation', 'input']);
  });
});

describe('configError', () => {
  it('builds a ConfigError', () => {
    const err = configError('nope');
    expect(err.name).toBe('ConfigError');
    expect(err.message).toBe('nope');
  });
});
