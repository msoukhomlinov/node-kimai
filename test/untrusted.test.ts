// Untrusted-content markers (the ./untrusted subpath).
import { describe, it, expect } from 'vitest';
import {
  REDACTED_MARKER,
  UNTRUSTED_CLOSE,
  UNTRUSTED_CLOSE_NEUTRALISED,
  UNTRUSTED_OPEN,
  UNTRUSTED_OPEN_NEUTRALISED,
  deepMarkUntrusted,
  markUntrusted,
  stripUntrustedDeep,
  stripUntrustedWrapper,
  wrapUntrusted,
} from '../src/untrusted';

describe('wrapUntrusted', () => {
  it('wraps a non-empty string', () => {
    expect(wrapUntrusted('hello')).toBe(`${UNTRUSTED_OPEN}hello${UNTRUSTED_CLOSE}`);
  });

  it('leaves null, undefined, empty, non-string and redacted values alone', () => {
    for (const value of [null, undefined, '', 42, {}, [], REDACTED_MARKER]) expect(wrapUntrusted(value)).toBeUndefined();
  });

  it('is idempotent for an exactly wrapped value', () => {
    const wrapped = `${UNTRUSTED_OPEN}hello${UNTRUSTED_CLOSE}`;
    expect(wrapUntrusted(wrapped)).toBe(wrapped);
  });

  it('neutralises tags inside the text so a value cannot forge the boundary', () => {
    const forged = `pre ${UNTRUSTED_OPEN}injected${UNTRUSTED_CLOSE} post`;
    expect(wrapUntrusted(forged)).toBe(
      `${UNTRUSTED_OPEN}pre ${UNTRUSTED_OPEN_NEUTRALISED}injected${UNTRUSTED_CLOSE_NEUTRALISED} post${UNTRUSTED_CLOSE}`,
    );
  });

  it('pins the neutralised spellings', () => {
    expect(UNTRUSTED_OPEN).toBe('<untrusted_content>');
    expect(UNTRUSTED_CLOSE).toBe('</untrusted_content>');
    expect(UNTRUSTED_OPEN_NEUTRALISED).toBe('\\u003Cuntrusted_content\\u003E');
    expect(UNTRUSTED_CLOSE_NEUTRALISED).toBe('\\u003C\\/untrusted_content\\u003E');
    expect(REDACTED_MARKER).toBe('[REDACTED]');
  });
});

describe('markUntrusted', () => {
  it('wraps only the named fields, without mutating the input', () => {
    const record = { description: 'free text', id: 7, nested: { description: 'untouched here' } };
    const marked = markUntrusted(record, ['description', 'absent']);
    expect(marked.description).toBe(`${UNTRUSTED_OPEN}free text${UNTRUSTED_CLOSE}`);
    expect(marked.id).toBe(7);
    expect(marked.nested).toEqual({ description: 'untouched here' });
    expect(record.description).toBe('free text');
  });

  it('returns non-records unchanged', () => {
    expect(markUntrusted([1, 2] as unknown as Record<string, unknown>, ['a'])).toEqual([1, 2]);
    expect(markUntrusted(null as unknown as Record<string, unknown>, ['a'])).toBeNull();
  });
});

describe('deepMarkUntrusted', () => {
  it('walks arrays and nested records', () => {
    const value = { items: [{ name: 'a', other: 1 }, { name: '', other: 2 }], meta: { name: 'b' } };
    const marked = deepMarkUntrusted(value, ['name']) as typeof value;
    expect(marked.items[0]!.name).toBe(`${UNTRUSTED_OPEN}a${UNTRUSTED_CLOSE}`);
    expect(marked.items[0]!.other).toBe(1);
    expect(marked.items[1]!.name).toBe('');
    expect(marked.meta.name).toBe(`${UNTRUSTED_OPEN}b${UNTRUSTED_CLOSE}`);
    expect(value.items[0]!.name).toBe('a');
  });

  it('passes primitives and arrays through the same walk', () => {
    expect(deepMarkUntrusted('x', ['name'])).toBe('x');
    expect(deepMarkUntrusted([1, 'a'], ['name'])).toEqual([1, 'a']);
  });
});

describe('stripUntrustedWrapper / stripUntrustedDeep', () => {
  it('strips ONE exact outer wrapper and nothing else', () => {
    expect(stripUntrustedWrapper(`${UNTRUSTED_OPEN}hello${UNTRUSTED_CLOSE}`)).toBe('hello');
    expect(stripUntrustedWrapper(`${UNTRUSTED_OPEN}a${UNTRUSTED_CLOSE}${UNTRUSTED_CLOSE}`)).toBe(`a${UNTRUSTED_CLOSE}`);
    expect(stripUntrustedWrapper('plain')).toBe('plain');
    expect(stripUntrustedWrapper(7)).toBe(7);
  });

  it('deep-strips every string in an args tree without mutating the input', () => {
    const args = { description: `${UNTRUSTED_OPEN}free${UNTRUSTED_CLOSE}`, tags: [`${UNTRUSTED_OPEN}t${UNTRUSTED_CLOSE}`, 'plain'], deep: { note: `${UNTRUSTED_OPEN}n${UNTRUSTED_CLOSE}` }, id: 1 };
    const stripped = stripUntrustedDeep(args) as typeof args;
    expect(stripped.description).toBe('free');
    expect(stripped.tags).toEqual(['t', 'plain']);
    expect(stripped.deep.note).toBe('n');
    expect(stripped.id).toBe(1);
    expect(args.description).toContain(UNTRUSTED_OPEN);
  });

  it('round-trips a wrapped value through strip', () => {
    expect(stripUntrustedWrapper(wrapUntrusted('round trip'))).toBe('round trip');
  });
});
