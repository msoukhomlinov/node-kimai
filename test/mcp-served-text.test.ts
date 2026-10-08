// Served-text pins: the text this SDK serves to an MCP host must be TRUE against its sources.
//
// The node-hudu #70 failure class: a served contract/note claims ABSENCE or CLOSURE that the
// vendor spec contradicts (spec-required fields while the note says "exactly these fields", an
// object served open while claiming closed, a type the SDK never accepts). Each test below pins
// one property against a source of truth: the vendored `api-docs.json`, the generated
// `capabilities.json`, or the SDK source itself.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  DISPATCH_OPERATIONS,
  INPUT_CONTRACTS,
  META_TOOLS,
  kimaiDispatchInputSchema,
} from '../src/mcp/index';

const SPEC_PATH = new URL('../api-docs.json', import.meta.url);
const registry = JSON.parse(readFileSync(new URL('../capabilities.json', import.meta.url), 'utf8')) as {
  groups: Record<string, { records: Array<{ id: string; endpoint: string | null; effect: string; inputSchema: Record<string, { type?: string; required?: boolean; description?: string }> }> }>;
};
const records = Object.values(registry.groups).flatMap((g) => g.records);
const recordById = new Map(records.map((r) => [r.id, r]));

// The vendored spec is a source of truth: without it these pins cannot be evaluated, so its
// absence FAILS the suite rather than silently skipping the checks it exists for.
const specText = (() => {
  try {
    return readFileSync(SPEC_PATH, 'utf8');
  } catch {
    return null;
  }
})();
const spec = specText === null ? null : (JSON.parse(specText) as {
  paths: Record<string, Record<string, { parameters?: Array<{ name: string }>; requestBody?: { content?: Record<string, { schema?: Record<string, unknown> }> } }>>;
  components: { schemas: Record<string, Record<string, unknown>> };
});
const specByEndpoint = new Map<string, Record<string, unknown>>();
for (const [p, ops] of Object.entries(spec?.paths ?? {})) {
  for (const [method, op] of Object.entries(ops)) specByEndpoint.set(`${method.toUpperCase()} ${p}`, op as Record<string, unknown>);
}

type AnySchema = { type?: string | string[]; enum?: string[]; properties?: Record<string, AnySchema>; required?: string[]; items?: AnySchema; anyOf?: AnySchema[]; additionalProperties?: boolean };

/** Follow a local `$ref` (bounded), so a form is compared field-for-field and not by name. */
const resolve = (node: unknown, depth = 0): Record<string, unknown> => {
  const n = node as Record<string, unknown> | undefined;
  if (!n || typeof n !== 'object' || depth > 4) return {};
  if (typeof n.$ref === 'string') return resolve(spec?.components.schemas[n.$ref.split('/').pop() as string], depth + 1);
  return n;
};
const requestBody = (specOp: Record<string, unknown> | undefined) =>
  resolve(specOp?.requestBody ? ((specOp.requestBody as { content?: Record<string, { schema?: unknown }> }).content?.['application/json']?.schema) : undefined);
const AFFORDANCES = new Set(['limit', 'expand', 'resolution_details']);
/** The one served field that carries the vendor request body (mirrors the generator's rule). */
const servedBodyField = (op: string, specOp: Record<string, unknown> | undefined) => {
  const params = new Set(((specOp?.parameters ?? []) as Array<{ name: string }>).map((q) => q.name));
  const props = (INPUT_CONTRACTS[op]?.schema.properties ?? {}) as Record<string, AnySchema>;
  const candidates = Object.keys(props).filter((name) => {
    if (params.has(name) || AFFORDANCES.has(name) || name === 'opts') return false;
    const node = props[name] as AnySchema;
    return node.type === 'array' || node.properties !== undefined;
  });
  return candidates.length === 1 ? { name: candidates[0] as string, node: props[candidates[0] as string] as AnySchema } : null;
};

describe('served contracts against the vendored spec (source of truth)', () => {
  it('can evaluate its pins: api-docs.json is present and matches the served endpoints', () => {
    expect(specText, 'api-docs.json (the vendored vendor spec) is required by this suite').not.toBeNull();
    const matched = records.filter((r) => r.endpoint && specByEndpoint.has(r.endpoint)).length;
    expect(matched).toBeGreaterThan(50);
  });

  it('serves every vendor-required write field the spec declares', () => {
    let checked = 0;
    for (const op of Object.values(DISPATCH_OPERATIONS).flat()) {
      const rec = recordById.get(op);
      const specOp = rec?.endpoint ? specByEndpoint.get(rec.endpoint) : undefined;
      if (!specOp?.requestBody) continue;
      const body = requestBody(specOp);
      const served = servedBodyField(op, specOp);
      // The node-hudu #70 shape: the spec fills the body with required fields while the served
      // contract carries an opaque object - the note then claims closure it cannot honour.
      expect(served, `${op}: the vendor declares a request body but the served contract carries no body field`).not.toBeNull();
      checked += 1;
      if (Array.isArray(body.type) ? body.type.includes('array') : body.type === 'array') {
        expect(served!.node.type, `${op}: vendor body is an array`).toBe('array');
        continue;
      }
      expect(served!.node.required ?? [], `${op}: vendor-required write fields`).toEqual(body.required ?? []);
      const servedProps = Object.keys(served!.node.properties ?? {});
      for (const field of Object.keys(body.properties ?? {})) {
        expect(servedProps, `${op}: vendor write field ${field}`).toContain(field);
      }
    }
    expect(checked).toBeGreaterThan(15);
  });

  it('does not claim closure inside a vendor body the spec leaves open', () => {
    for (const op of Object.values(DISPATCH_OPERATIONS).flat()) {
      const rec = recordById.get(op);
      const specOp = rec?.endpoint ? specByEndpoint.get(rec.endpoint) : undefined;
      if (!specOp?.requestBody) continue;
      const body = requestBody(specOp);
      const served = servedBodyField(op, specOp)!;
      if (body.additionalProperties === false) continue;
      expect(served.node.additionalProperties, `${op}: the served body must not be closed when the spec is not`).toBeUndefined();
      if (served.node.type !== 'array') {
        expect(INPUT_CONTRACTS[op]!.note, `${op}: the note must admit the body is not closed`).toContain('passed through, never refused');
      }
      expect(INPUT_CONTRACTS[op]!.note, `${op}: the note states the closure boundary`).toContain('unknown field is refused');
    }
  });

  it('serves the SDK type, not a catch-all object, for a union or array argument', () => {
    // `actions.getActions.resource` is an SDK string union interpolated into the path; the
    // registry types it 'object', so the served schema must be corrected from the SDK source.
    const sdkSource = readFileSync(new URL('../src/resources/ActionsClient.ts', import.meta.url), 'utf8');
    const union = /export type ActionResource = ((?:\s*'[^']*'\s*\|?)+);/.exec(sdkSource);
    expect(union, 'ActionsClient must export the ActionResource union').not.toBeNull();
    const values = [...union![1]!.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const resource = (INPUT_CONTRACTS['actions.getActions']!.schema.properties ?? {}).resource as AnySchema;
    expect(resource.type).toBe('string');
    expect(resource.enum ?? []).toEqual(values);

    // A union argument is served as the union, never collapsed to 'object'.
    const identifier = (INPUT_CONTRACTS['timesheets.resolve']!.schema.properties ?? {}).identifier as AnySchema;
    expect(identifier.type).toBeUndefined();
    expect((identifier.anyOf ?? []).map((n) => n.type)).toEqual(['number', 'string', 'object']);

    // An array body argument is served as an array with its item schema.
    for (const [op, field] of [['users.updatePreferences', 'prefs'], ['invoices.updateCustomFields', 'fields']] as const) {
      const node = (INPUT_CONTRACTS[op]!.schema.properties ?? {})[field] as AnySchema;
      expect(node.type, `${op}.${field}`).toBe('array');
      expect((node.items?.properties ?? {}).name, `${op}.${field} items`).toBeTruthy();
    }
  });

  it('pins every list op registry pagination mode to the vendored spec', () => {
    // The #8 failure class: the registry (and every text projected from it) may
    // claim vendor paging only where the spec declares page/size params.
    const listRecords = records.filter((r) => r.id.endsWith('.list') && r.endpoint !== null);
    expect(listRecords.length, 'eight *.list ops on the SDK surface').toBe(8);
    let paginated = 0;
    for (const rec of listRecords) {
      const specOp = specByEndpoint.get(rec.endpoint as string);
      const names = (((specOp?.parameters ?? []) as Array<{ name?: string; in?: string }>) ?? [])
        .filter((p) => p.in === 'query')
        .map((p) => p.name ?? '');
      const specPaginated = names.includes('page') || names.includes('size');
      const pg = (rec as { pagination?: { mode?: string; vendorDefaultPageSize?: number; vendorMaxPageSize?: number } }).pagination;
      expect(pg?.mode, `${rec.id}: the registry pagination mode must match the spec`).toBe(specPaginated ? 'page' : 'none');
      if (specPaginated) {
        paginated += 1;
        expect(pg?.vendorDefaultPageSize, `${rec.id} default page size`).toBe(50);
        expect(pg?.vendorMaxPageSize, `${rec.id} max page size`).toBe(500);
      }
    }
    // invoices + timesheets paginate in the spec; the six single-batch resources must be 'none'.
    expect(paginated, 'spec-paginated list resources').toBe(2);
  });
});

describe('served surfaces agree about confirmation', () => {
  it('declares the confirm argument on the write dispatcher for every approval-gated write', () => {
    const gatedWrites = records.filter((r) => r.effect === 'write' && ((r as { flags?: string[] }).flags ?? []).includes('requiresApproval')).map((r) => r.id);
    expect(gatedWrites.length).toBeGreaterThan(0);
    const confirmField = META_TOOLS.find((m) => m.name === 'kimai_write')!.inputSchema.fields.find((f) => f.name === 'confirm');
    expect(confirmField, 'kimai_write must declare the confirm argument').toBeTruthy();
    for (const op of gatedWrites) expect(confirmField!.description, `${op} must be named in the confirm description`).toContain(op);

    // Every catalog row that serves `confirm_required: true` must have a branch that REQUIRES it.
    const writeBranches = kimaiDispatchInputSchema('write').oneOf ?? [];
    const destructiveBranches = kimaiDispatchInputSchema('destructive').oneOf ?? [];
    for (const row of CATALOG) {
      if (!row.confirm_required) continue;
      const branches = row.effect === 'write' ? writeBranches : destructiveBranches;
      const branch = branches.find((b) => b.properties?.operation?.const === row.op);
      expect(branch, `${row.op}: no ${row.effect} dispatch branch`).toBeTruthy();
      expect(branch!.properties?.confirm?.const, `${row.op}: the branch must require confirm === the key`).toBe(row.op);
      expect(branch!.required, `${row.op}: confirm is required`).toContain('confirm');
    }
    // And the converse: no branch requires a confirmation the catalog does not serve.
    for (const branch of [...writeBranches, ...destructiveBranches]) {
      if (!(branch.required ?? []).includes('confirm')) continue;
      const op = branch.properties?.operation?.const as string;
      expect(CATALOG.find((r) => r.op === op)?.confirm_required, `${op}: branch requires confirm but the catalog says otherwise`).toBe(true);
    }
  });
});
