// paging.ts validation + traversal guard branches (the standard traversal paths are
// covered by the resource tests; these are the refusal and degenerate-input branches).
import { describe, it, expect } from 'vitest';
import { collectPages, pageParams, streamItems, streamOnce, streamPages } from '../../src/resources/paging';
import { KimaiConfigError } from '../../src/errors';

describe('pageParams', () => {
  it('defaults page/size and passes valid values through', () => {
    expect(pageParams(undefined)).toEqual({ page: 1, size: 100 });
    expect(pageParams({})).toEqual({ page: 1, size: 100 });
    expect(pageParams({ page: 3, size: 25 })).toEqual({ page: 3, size: 25 });
  });

  it('refuses a non-positive or non-integer size instead of clamping', () => {
    expect(() => pageParams({ size: 0 })).toThrow(KimaiConfigError);
    expect(() => pageParams({ size: -5 })).toThrow(/size must be a positive integer/);
    expect(() => pageParams({ size: 2.5 })).toThrow(/size must be a positive integer/);
    expect(() => pageParams({ size: Number.NaN })).toThrow(/size must be a positive integer/);
  });

  it('refuses a non-positive or non-integer page instead of clamping', () => {
    expect(() => pageParams({ page: 0 })).toThrow(/page must be a positive integer/);
    expect(() => pageParams({ page: -1 })).toThrow(/page must be a positive integer/);
    expect(() => pageParams({ page: 1.5 })).toThrow(/page must be a positive integer/);
  });
});

describe('paging traversal', () => {
  const twoPages = async (page: number, size: number) => (page === 1 ? Array.from({ length: size }, (_, i) => i) : []);

  it('streams whole pages and stops on a short page', async () => {
    const pages = [];
    for await (const p of streamPages(twoPages, 1, 2)) pages.push(p);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ page: 1, size: 2, hasMore: true });
    expect(pages[1]).toMatchObject({ page: 2, hasMore: false });
    expect(pages[0]!.items).toEqual([0, 1]);
  });

  it('treats a non-array payload as an empty page (defensive)', async () => {
    const pages = [];
    for await (const p of streamPages((async () => null) as never, 1, 5)) pages.push(p);
    expect(pages).toEqual([{ items: [], page: 1, size: 5, hasMore: false }]);
  });

  it('streams items and collects them', async () => {
    const items = [];
    for await (const item of streamItems(twoPages, 1, 2)) items.push(item);
    expect(items).toEqual([0, 1]);
    expect(await collectPages(twoPages, 1, 2)).toEqual([0, 1]);
  });

  it('streams a single already-fetched batch and ignores a non-array one', async () => {
    const one = [];
    for await (const item of streamOnce(async () => [1, 2, 3])) one.push(item);
    expect(one).toEqual([1, 2, 3]);
    const none = [];
    for await (const item of streamOnce((async () => undefined) as never)) none.push(item);
    expect(none).toEqual([]);
  });
});
