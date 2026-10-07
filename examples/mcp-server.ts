/**
 * mcp-server.ts - reference MCP server surface backed by node-kimai.
 *
 * This file is what a SEPARATE MCP server package would write: it imports the published subpaths
 * exactly as an installed consumer does (`node-kimai`, `/capabilities`, `/mcp`, `/operations`,
 * `/untrusted`) and never reaches into `src/`. It is transport-agnostic on purpose - the tool
 * definitions below are the part a server owns; wire `handler` onto your JSON-RPC/MCP framework of
 * choice (`@modelcontextprotocol/server`, a gateway, an n8n node).
 *
 * What it demonstrates, tier by tier (references/mcp-server-surface.md):
 * - T1: the registry is the interface - `getCapability` lookup, and `CAPABILITY_NAMES` plus the
 *   effect-grouped `READ_OPERATIONS` / `WRITE_OPERATIONS` / `DESTRUCTIVE_OPERATIONS` constants.
 * - T2: the generated `node-kimai/mcp` catalog in its compiled shape, with EFFECT-SPLIT dispatch
 *   (`kimai_read` / `kimai_write` / `kimai_delete`) - never one effect-mixing god-tool.
 * - T3: ONE governance path - the dispatchers DELEGATE to `node-kimai/operations`; `planInvoke`
 *   is the dry-run/plan half. This file adds no second validator and no second write governor.
 * - T4: `node-kimai/untrusted` is USED on the result path, so vendor free text is marked before a
 *   model sees it. Root guards (`isKimaiError`, `credentialShapeProblem`) classify errors and
 *   malformed credentials before any wire call.
 *
 * Declared profile: the generated CORE set (`CORE_TOOLS`); every other reachable operation is
 * discovered through `kimai_catalog` + `kimai_describe` and invoked through the effect dispatchers.
 *
 * Run with:  KIMAI_URL=... KIMAI_TOKEN=... npx tsx examples/mcp-server.ts
 * The SDK stays MCP-import-free and dependency-free; this example adds no runtime dependency.
 */
import { ApiClient, isKimaiError, credentialShapeProblem } from 'node-kimai';
import {
  CAPABILITY_NAMES,
  DESTRUCTIVE_OPERATIONS,
  READ_OPERATIONS,
  WRITE_OPERATIONS,
  getCapability,
} from 'node-kimai/capabilities';
import {
  CORE_TOOLS,
  DISPATCH_OPERATIONS,
  META_TOOLS,
  catalogPage,
  configError,
  describeOperation,
  requireCatalogRow,
} from 'node-kimai/mcp';
import { dispatchOperation, type DispatchEffect } from 'node-kimai/mcp';
import { planInvoke, type InvokeOptions } from 'node-kimai/operations';
import { wrapUntrusted } from 'node-kimai/untrusted';

// --- the minimal tool contract a host framework consumes --------------------------------
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

// --- root guards: classify before and after the wire ------------------------------------
/** Classify a thrown value into the structured payload a model host can act on. */
export function errorContent(err: unknown): ToolResult {
  if (isKimaiError(err)) {
    const payload: Record<string, unknown> = {
      error: true,
      code: err.code ?? null,
      status: err.status ?? null,
      message: err.message,
    };
    return { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: true };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: true, message: err instanceof Error ? err.message : String(err) }) }],
    isError: true,
  };
}

/**
 * Refuse a malformed credential with the SDK's own verdict BEFORE any wire call (Tier 1 root
 * guard). Returns null when the shape looks usable.
 */
export function credentialGuard(baseUrl: string | undefined, token: string | undefined): Error | null {
  if (!baseUrl) return configError('server misconfigured: KIMAI_URL is required.');
  const problem = credentialShapeProblem({ token: token ?? '' });
  if (problem !== null) return configError(`server misconfigured: ${problem}`);
  return null;
}

// --- T4: untrusted marking on the RESULT path -------------------------------------------
/** Vendor free-text fields carrying content a model must treat as untrusted. */
const UNTRUSTED_TEXT_FIELDS = new Set(['description', 'comment', 'invoiceText', 'message']);

/** Mark (never silently drop) untrusted vendor free text anywhere in a result tree. */
export function sanitiseResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitiseResult);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
      if (UNTRUSTED_TEXT_FIELDS.has(key)) {
        out[key] = typeof field === 'string' ? wrapUntrusted(field) ?? field : sanitiseResult(field);
      } else {
        out[key] = sanitiseResult(field);
      }
    }
    return out;
  }
  return value;
}

function ok(text: string, structuredContent?: Record<string, unknown>): ToolResult {
  return structuredContent === undefined
    ? { content: [{ type: 'text', text }] }
    : { content: [{ type: 'text', text }], structuredContent: sanitiseResult(structuredContent) as Record<string, unknown> };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function metaDescription(name: string): string {
  const meta = META_TOOLS.find((tool) => tool.name === name);
  return meta?.description ?? `${name}: node-kimai operation dispatcher.`;
}

// --- the surface ------------------------------------------------------------------------
export function createToolSurface(client: ApiClient): ToolDefinition[] {
  /** The effect dispatchers: the effect boundary plus a DELEGATION to the ONE governance path. */
  const dispatcher = (effect: DispatchEffect, toolSuffix: string = effect): ToolDefinition => ({
    name: `kimai_${toolSuffix}`,
    description: metaDescription(`kimai_${toolSuffix}`),
    annotations: { readOnlyHint: effect === 'read', destructiveHint: effect === 'destructive' },
    handler: async (args) => {
      try {
        const operation = String(args.operation ?? '');
        const input = asRecord(args.input);
        if (!DISPATCH_OPERATIONS[effect].includes(operation)) {
          throw configError(
            `kimai_${toolSuffix}: "${operation}" is not a dispatchable ${effect} operation. Call kimai_catalog to find the right key.`,
          );
        }
        const options: InvokeOptions = {};
        if (typeof args.dry_run === 'boolean') options.dryRun = args.dry_run;
        if (typeof args.confirm === 'string') options.confirm = args.confirm;
        // The dispatch layer owns the effect boundary; validation, dry-run-first and the
        // confirmation gate are the SDK operations path's (never re-implemented here).
        const result = await dispatchOperation(client, effect, operation, input, options);
        const simulated = asRecord(result).simulated === true;
        return ok(simulated ? 'Dry-run preview; no write was issued.' : `${operation} completed.`, {
          operation,
          simulated,
          result,
        });
      } catch (err) {
        return errorContent(err);
      }
    },
  });

  return [
    {
      name: 'kimai_catalog',
      description: metaDescription('kimai_catalog'),
      annotations: { readOnlyHint: true, destructiveHint: false },
      handler: async (args) => {
        try {
          const page = catalogPage({
            ...(typeof args.limit === 'number' ? { limit: args.limit } : {}),
            ...(typeof args.offset === 'number' ? { offset: args.offset } : {}),
            ...(typeof args.effect === 'string' ? { effect: args.effect } : {}),
            ...(typeof args.resource === 'string' ? { resource: args.resource } : {}),
            ...(typeof args.unexposed_only === 'boolean' ? { unexposed_only: args.unexposed_only } : {}),
          });
          return ok(`${page.rows.length} of ${page.matched} matching operation(s).`, { ...page });
        } catch (err) {
          return errorContent(err);
        }
      },
    },
    {
      name: 'kimai_describe',
      description: metaDescription('kimai_describe'),
      annotations: { readOnlyHint: true, destructiveHint: false },
      handler: async (args) => {
        try {
          const operation = String(args.operation ?? '');
          // The catalog row is the reachability/refusal authority; the registry record is the
          // schema authority. Resolve both, and never pass an undefined record on.
          requireCatalogRow(operation);
          const record = getCapability(operation);
          if (record === undefined) {
            throw configError(`"${operation}" has a catalog row but no registry record - build inconsistency.`);
          }
          return ok(`${operation}: ${record.effect}`, { ...describeOperation(record) });
        } catch (err) {
          return errorContent(err);
        }
      },
    },
    // The dry-run/plan half of the governance path, exposed as its own read-only tool: no wire
    // call is ever made, so a host can preview a mutation or validate input first.
    {
      name: 'kimai_plan',
      description: 'Plan (do not execute) one registry operation: validates the input and reports the resolved target, effect and dry-run disposition without issuing any request. The plan half of node-kimai/operations.',
      annotations: { readOnlyHint: true, destructiveHint: false },
      handler: async (args) => {
        try {
          const operation = String(args.operation ?? '');
          const plan = planInvoke(client, operation, asRecord(args.input), {});
          return ok(`Planned ${operation}.`, { ...plan });
        } catch (err) {
          return errorContent(err);
        }
      },
    },
    dispatcher('read'),
    dispatcher('write'),
    dispatcher('destructive', 'delete'),
  ];
}

// --- boot -------------------------------------------------------------------------------
export function boot(): void {
  const baseUrl = process.env.KIMAI_URL;
  const token = process.env.KIMAI_TOKEN;
  const credentialProblem = credentialGuard(baseUrl, token);
  if (credentialProblem !== null) throw credentialProblem;

  const client = new ApiClient({ baseUrl: baseUrl ?? '', token: token ?? '' });
  const surface = createToolSurface(client);

  // Contract surface, not runtime wiring: the effect-grouped registry constants and the generated
  // CORE set a separate server package would advertise. Referenced so this file type-checks as a
  // complete consumer of the published surface.
  const registered = {
    core: CORE_TOOLS,
    total: CAPABILITY_NAMES.length,
    read: READ_OPERATIONS.length,
    write: WRITE_OPERATIONS.length,
    destructive: DESTRUCTIVE_OPERATIONS.length,
    tools: surface.map((tool) => tool.name),
  };
  process.stderr.write(`node-kimai reference MCP surface: ${JSON.stringify(registered)}\n`);
}

void boot;
