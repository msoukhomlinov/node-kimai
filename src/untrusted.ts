/**
 * Untrusted-content markers for the agent/MCP projection.
 *
 * Tool results that feed an LLM wrap externally-sourced free text (timesheet descriptions,
 * customer/project/activity names and comments, free-text tags, user comments) in
 * `<untrusted_content>...</untrusted_content>` markers, so the model treats the text as data,
 * never as instructions. Ported from the node-autotask line (src/untrusted.ts) so the sibling
 * MCP servers share one behaviour: the same neutralisation, the same idempotency rule, the same
 * strip-on-write rule.
 *
 * PROJECTION-LAYER ONLY: this module is a pure helper the MCP server applies AFTER an SDK call
 * returns. SDK primitives keep returning raw values (the client's response path is untouched).
 *
 * ZERO IMPORTS by design (the deep ./untrusted subpath entry must stand alone - the same rule as
 * the ./capabilities registry).
 *
 * Behaviour (normative):
 * - occurrences of the open or close tag inside the text are neutralised (escaped, so a value
 *   cannot forge the wrapper boundary);
 * - null, empty and non-string values are left alone;
 * - wrapping is idempotent (an exactly-wrapped value passes through);
 * - truncation happens BEFORE wrapping (this module never truncates - the caller truncates
 *   first, then wraps);
 * - the '[REDACTED]' marker is not wrapped.
 *
 * Echoed values on writes: the server strips ONE exact outer wrapper from string inputs on write
 * and filter args before the SDK call (`stripUntrustedDeep`) - inner text is left untouched.
 */

/** The fixed open tag. */
export const UNTRUSTED_OPEN = '<untrusted_content>';
/** The fixed close tag. */
export const UNTRUSTED_CLOSE = '</untrusted_content>';
/**
 * The neutralised forms of the tags: a value containing a literal tag gets the escaped spelling
 * instead, so the text cannot forge a wrapper boundary. The backslash-u sequences are literal
 * characters in the text (not escapes the model is expected to interpret).
 */
export const UNTRUSTED_OPEN_NEUTRALISED = '\\u003Cuntrusted_content\\u003E';
export const UNTRUSTED_CLOSE_NEUTRALISED = '\\u003C\\/untrusted_content\\u003E';

/**
 * The redaction marker a value-free projection carries. node-kimai has no logger module (it never
 * prints a credential), so this module is the marker's only definition; test/untrusted.test.ts
 * pins the literal. A redacted value is a stable shape marker, not externally-sourced free text,
 * so it is never wrapped.
 */
export const REDACTED_MARKER = '[REDACTED]';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Wrap one value in the untrusted-content tags. Returns the wrapped string, or `undefined` when
 * the value is left alone (null, undefined, empty string, non-string, an exactly-wrapped value -
 * idempotency, or the REDACTED marker). Occurrences of the open/close tags INSIDE the text are
 * neutralised first. Truncation happens before wrapping (the caller's job).
 */
export function wrapUntrusted(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === '') return undefined;
  if (value === REDACTED_MARKER) return undefined;
  if (value.startsWith(UNTRUSTED_OPEN) && value.endsWith(UNTRUSTED_CLOSE)) return value; // already wrapped
  const inner = value.split(UNTRUSTED_OPEN).join(UNTRUSTED_OPEN_NEUTRALISED)
    .split(UNTRUSTED_CLOSE).join(UNTRUSTED_CLOSE_NEUTRALISED);
  return `${UNTRUSTED_OPEN}${inner}${UNTRUSTED_CLOSE}`;
}

/**
 * Wrap the named fields of one record. Returns a shallow copy with the affected fields wrapped
 * (fields absent from the record, or whose value is left alone by `wrapUntrusted`, keep their
 * original value); nested objects and arrays are NOT walked (use `deepMarkUntrusted` for
 * envelope-shaped results). The input is never mutated.
 */
export function markUntrusted<T extends Record<string, unknown>>(record: T, fields: readonly string[]): T {
  if (!isPlainRecord(record)) return record;
  const fieldSet = new Set(fields);
  const out: Record<string, unknown> = { ...record };
  for (const key of Object.keys(record)) {
    if (!fieldSet.has(key)) continue;
    const wrapped = wrapUntrusted(record[key]);
    if (wrapped !== undefined) out[key] = wrapped;
  }
  return out as T;
}

/**
 * Recursively mark the named fields of an envelope-shaped result (records, arrays of records,
 * nested objects): every plain-record level gets its affected fields wrapped. The projection
 * layer uses this for dispatch results (paged envelopes with `items[]`, dry-run envelopes that
 * echo the submitted body). Returns a copy; the input is never mutated.
 */
export function deepMarkUntrusted(value: unknown, fields: readonly string[]): unknown {
  if (Array.isArray(value)) return value.map((entry) => deepMarkUntrusted(entry, fields));
  if (!isPlainRecord(value)) return value;
  const marked = markUntrusted(value, fields);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(marked)) {
    out[key] = deepMarkUntrusted(entry, fields);
  }
  return out;
}

/**
 * Strip ONE exact outer untrusted-content wrapper from a string (echoed values on writes): a
 * value that starts with the open tag and ends with the close tag yields its inner text (inner
 * text is left untouched, no further stripping); every other value passes through unchanged.
 * Non-strings pass through unchanged.
 */
export function stripUntrustedWrapper(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(UNTRUSTED_OPEN) || !value.endsWith(UNTRUSTED_CLOSE)) return value;
  const inner = value.slice(UNTRUSTED_OPEN.length, value.length - UNTRUSTED_CLOSE.length);
  return inner;
}

/**
 * Deep-strip ONE exact outer wrapper from every string in an args tree (the write and filter args
 * the server passes to the SDK call): strings in record values and array entries are stripped;
 * the structure is preserved (a copy is returned, the input is never mutated).
 */
export function stripUntrustedDeep(value: unknown): unknown {
  if (typeof value === 'string') return stripUntrustedWrapper(value);
  if (Array.isArray(value)) return value.map((entry) => stripUntrustedDeep(entry));
  if (!isPlainRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = stripUntrustedDeep(entry);
  }
  return out;
}
