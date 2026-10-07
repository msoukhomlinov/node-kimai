/**
 * Root guards: the two small predicates a consumer (an MCP host, a CLI, a doctor) needs before
 * it decides how to report a failure or whether a configuration is usable at all.
 *
 * Mirrors the sibling SDKs: `isKimaiError` is the node-kimai descendent of `isAutotaskError`;
 * `credentialShapeProblem` is the node-kimai adaptation of node-autotask's credential-shape
 * guard, changed from a string VALUE to this SDK's configuration object (baseUrl + token), which
 * is the only shape a caller has before a client exists.
 *
 * Both are VALUE-FREE by construction: the returned string names the artifact, never the value.
 */
import { ApiError, KimaiConfigError } from './errors.js';

/**
 * True when `err` is one of this SDK's typed errors (`ApiError` and its subclasses:
 * `BadRequestError`, `UnauthorizedError`, ... `KimaiConfigError`, `ResolutionError`). The guard
 * narrows to `ApiError`, so `err.code`, `err.category`, `err.retryable`, `err.suggestedAction`
 * and `err.httpStatus` are readable after it.
 */
export function isKimaiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** The configuration shape the guard inspects (a subset of `ApiClientOptions`). */
export interface CredentialShapeInput {
  baseUrl?: unknown;
  token?: unknown;
}

/**
 * The shape artifacts a loaded credential value can carry. A `.env` loader that preserves quotes
 * (most dotenv variants, a hand-rolled `split('=')`) hands a single-quoted secret over with its
 * quotes intact: the value is printable ASCII, passes every transport check, reaches Kimai and
 * comes back as an opaque 401 that looks like bad credentials. Interior CR/LF is a fetch
 * `TypeError` risk and a leak risk.
 */
export type CredentialShapeProblem =
  | 'leading whitespace'
  | 'trailing whitespace'
  | 'single- or double-quote surrounding the value'
  | 'carriage return';

/** Where the guards do not apply, because the caller normalizes that artifact itself. */
export interface CredentialShapeOptions {
  /** Skip the edge-whitespace check (call sites that refuse whitespace-only values). */
  skipEdgeWhitespace?: boolean;
  /** Skip the surrounding-quote check (call sites that normalize quotes themselves). */
  skipSurroundingQuotes?: boolean;
}

const QUOTE_CHARS = new Set(["'", '"']);

/** True when `value` starts AND ends with a quote character (one shell-quote artifact). */
export function hasSurroundingQuotes(value: string): boolean {
  if (value.length < 2) return false;
  const first = value[0] as string;
  return QUOTE_CHARS.has(first) && value[value.length - 1] === first;
}

/**
 * The FIRST shape problem in one credential VALUE, or `undefined` when its shape is clean.
 * Value-free by construction: the result is one of the fixed strings in
 * {@link CredentialShapeProblem}.
 */
export function credentialValueShapeProblem(value: string, options: CredentialShapeOptions = {}): CredentialShapeProblem | undefined {
  if (!options.skipEdgeWhitespace) {
    if (/^\s/.test(value)) return 'leading whitespace';
    if (/\s$/.test(value)) return 'trailing whitespace';
  }
  if (!options.skipSurroundingQuotes && hasSurroundingQuotes(value)) {
    return 'single- or double-quote surrounding the value';
  }
  if (value.includes('\r')) return 'carriage return';
  return undefined;
}

/** The env-load pitfall every shape rejection points at, without claiming which loader was used. */
export const CREDENTIAL_ENV_LOAD_ACTION =
  'value appears shell-quoted or line-break contaminated - check how your env file was loaded ' +
  '(single-quoted values must be shell-sourced, not parsed by a quote-preserving loader)';

/**
 * A value-free problem report for a whole configuration, or `null` when the configuration can be
 * used. Checks, in order: `baseUrl` is a non-empty absolute http(s) URL string; `token` is a
 * non-empty string whose shape is clean (see {@link credentialValueShapeProblem}). The message
 * names the FIELD and the artifact - it never repeats the value.
 */
export function credentialShapeProblem(config: CredentialShapeInput): string | null {
  if (config === null || typeof config !== 'object') return 'configuration must be an object with `baseUrl` and `token`';
  const baseUrl = config.baseUrl;
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') return 'baseUrl must be a non-empty string';
  let parsed: URL | null = null;
  try {
    parsed = new URL(baseUrl);
  } catch {
    parsed = null;
  }
  if (parsed === null || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
    return 'baseUrl must be an absolute http(s) URL';
  }
  const token = config.token;
  if (typeof token !== 'string' || token === '') return 'token must be a non-empty string';
  const shape = credentialValueShapeProblem(token);
  return shape === undefined ? null : `token has ${shape}: ${CREDENTIAL_ENV_LOAD_ACTION}`;
}

// ---------------------------------------------------------------------------
// Request path validation (internal: used by the client and the resource clients).
// ---------------------------------------------------------------------------

/**
 * One record identifier as a path segment: a safe positive integer, returned as its decimal
 * string. Anything else throws `KimaiConfigError` before a request is built.
 */
export function pathId(value: unknown, name = 'id'): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  throw new KimaiConfigError(`${name} must be a positive integer. No request was issued.`);
}

/** One free-text path segment (letters, digits, `_`, `-`), returned unchanged. */
export function pathToken(value: unknown, name: string): string {
  if (typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new KimaiConfigError(`${name} must contain only letters, digits, "_" or "-". No request was issued.`);
}

/** True when one form of a request path is not made of ordinary segments. */
function unsafePathForm(path: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (/[\\?#\u0000-\u001f\u007f]/.test(path)) return true;
  return path.replace(/^\//, '').split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
}

/**
 * Throw `KimaiConfigError` unless `path` is a plain relative request path made of ordinary
 * `/segment` parts, checked as given and after percent-decoding. Query parameters belong in
 * `query`, never in the path.
 */
export function assertSafeRequestPath(path: unknown): asserts path is string {
  let form = path;
  for (let round = 0; typeof form === 'string' && round < 4; round++) {
    if (unsafePathForm(form)) break;
    let decoded: string;
    try {
      decoded = decodeURIComponent(form);
    } catch {
      break;
    }
    if (decoded === form) return;
    form = decoded;
  }
  throw new KimaiConfigError('request path is not a plain relative API path. No request was issued.');
}
