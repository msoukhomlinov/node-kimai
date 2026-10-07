// Root guards: the typed-error predicate and the credential-shape check.
import { describe, it, expect } from 'vitest';
import {
  ApiError,
  KimaiConfigError,
  NotFoundError,
  ResolutionError,
} from '../src/errors';
import {
  CREDENTIAL_ENV_LOAD_ACTION,
  credentialShapeProblem,
  credentialValueShapeProblem,
  hasSurroundingQuotes,
  isKimaiError,
} from '../src/guards';

describe('isKimaiError', () => {
  it('narrows typed SDK errors', () => {
    expect(isKimaiError(new NotFoundError({ message: 'x' }))).toBe(true);
    expect(isKimaiError(new KimaiConfigError('bad'))).toBe(true);
    expect(isKimaiError(ResolutionError.ambiguous('many'))).toBe(true);
    expect(isKimaiError(new NotFoundError({ message: 'x' }).code)).toBe(false);
  });

  it('rejects non-SDK errors and primitives', () => {
    for (const value of [new Error('plain'), null, undefined, 'boom', 42, {}, { status: 404 }]) expect(isKimaiError(value)).toBe(false);
    const err: unknown = new NotFoundError({ message: 'x' });
    if (isKimaiError(err)) expect(err.httpStatus).toBe(404);
    expect(new NotFoundError({ message: 'x' })).toBeInstanceOf(ApiError);
  });
});

describe('credentialValueShapeProblem', () => {
  it('accepts a clean value', () => {
    expect(credentialValueShapeProblem('abc123def456')).toBeUndefined();
  });

  it('names each artifact without repeating the value', () => {
    expect(credentialValueShapeProblem(' secret')).toBe('leading whitespace');
    expect(credentialValueShapeProblem('secret ')).toBe('trailing whitespace');
    expect(credentialValueShapeProblem("'secret'")).toBe('single- or double-quote surrounding the value');
    expect(credentialValueShapeProblem('"secret"')).toBe('single- or double-quote surrounding the value');
    expect(credentialValueShapeProblem('sec\rret')).toBe('carriage return');
  });

  it('honours the skip options', () => {
    expect(credentialValueShapeProblem(' secret ', { skipEdgeWhitespace: true })).toBeUndefined();
    expect(credentialValueShapeProblem("'secret'", { skipSurroundingQuotes: true })).toBeUndefined();
  });
});

describe('hasSurroundingQuotes', () => {
  it('detects one matched shell-quote artifact', () => {
    expect(hasSurroundingQuotes("'a'")).toBe(true);
    expect(hasSurroundingQuotes('"a"')).toBe(true);
    expect(hasSurroundingQuotes("'a\"")).toBe(false);
    expect(hasSurroundingQuotes("'")).toBe(false);
    expect(hasSurroundingQuotes('a')).toBe(false);
  });
});

describe('credentialShapeProblem', () => {
  const clean = { baseUrl: 'https://kimai.example.com', token: 'abc123def456' };

  it('accepts a usable configuration', () => {
    expect(credentialShapeProblem(clean)).toBeNull();
    expect(credentialShapeProblem({ baseUrl: 'http://localhost:8001/', token: 'x' })).toBeNull();
  });

  it('names the field and the artifact, never the value', () => {
    expect(credentialShapeProblem(null as unknown as typeof clean)).toContain('object with `baseUrl` and `token`');
    expect(credentialShapeProblem({ baseUrl: '', token: 'x' })).toBe('baseUrl must be a non-empty string');
    expect(credentialShapeProblem({ baseUrl: 42, token: 'x' })).toBe('baseUrl must be a non-empty string');
    expect(credentialShapeProblem({ baseUrl: 'kimai.example.com', token: 'x' })).toBe('baseUrl must be an absolute http(s) URL');
    expect(credentialShapeProblem({ baseUrl: 'ftp://kimai.example.com', token: 'x' })).toBe('baseUrl must be an absolute http(s) URL');
    expect(credentialShapeProblem({ baseUrl: clean.baseUrl, token: '' })).toBe('token must be a non-empty string');
    expect(credentialShapeProblem({ baseUrl: clean.baseUrl, token: 7 })).toBe('token must be a non-empty string');
    const quoted = credentialShapeProblem({ baseUrl: clean.baseUrl, token: "'abc123def456'" });
    expect(quoted).toBe(`token has single- or double-quote surrounding the value: ${CREDENTIAL_ENV_LOAD_ACTION}`);
    expect(quoted).not.toContain('abc123def456');
    expect(credentialShapeProblem({ baseUrl: clean.baseUrl, token: 'abc\rdef' })).toContain('carriage return');
    expect(credentialShapeProblem({ baseUrl: clean.baseUrl, token: ' abc' })).toContain('leading whitespace');
  });
});
