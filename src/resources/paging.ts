// Shared paging helpers for the Kimai resource clients (node-hudu line).
//
// Kimai list endpoints answer with a BARE ARRAY and no totals, so a page's
// `hasMore` is derived from the requested size: hasMore = items.length === size.
// No total/totalPages is invented (the vendor does not provide one).
import type { Page } from '../types/common';
import { KimaiConfigError } from 'node-kimai/errors';

/** Fetch one page of records; Kimai returns a bare array. */
export type PageFetcher<T> = (page: number, size: number) => Promise<T[]>;

/** Default page size when the caller does not give one. */
const DEFAULT_PAGE_SIZE = 100;

/** Runaway-loop guard: refuse to walk past this many pages. */
const MAX_PAGES = 100_000;

/**
 * Resolve and validate the caller's `page`/`size` paging params. A non-integer
 * or non-positive value throws `KimaiConfigError` — it is never silently
 * clamped. `page` defaults to 1, `size` to 100.
 */
export function pageParams(params: { page?: number; size?: number } | undefined): { page: number; size: number } {
  const page = params?.page ?? 1;
  const size = params?.size ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(size) || size < 1) {
    throw new KimaiConfigError(`size must be a positive integer, got "${String(params?.size)}"`);
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new KimaiConfigError(`page must be a positive integer, got "${String(params?.page)}"`);
  }
  return { page, size };
}

/**
 * Yield whole pages until a short/empty page: each page carries the records,
 * the 1-based page number, the requested size, and `hasMore` = the page was
 * full (Kimai gives no total, so a full page is the only continuation signal).
 */
export async function* streamPages<T>(
  fetchPage: PageFetcher<T>,
  startPage: number,
  size: number,
): AsyncGenerator<Page<T>> {
  let page = startPage;
  let pages = 0;
  while (true) {
    if (pages >= MAX_PAGES) {
      throw new KimaiConfigError(`Pagination exceeded ${MAX_PAGES} pages; refusing to continue (possible runaway loop)`);
    }
    const items = await fetchPage(page, size);
    const rows = Array.isArray(items) ? items : [];
    yield { items: rows, page, size, hasMore: rows.length === size };
    pages++;
    if (rows.length < size) break;
    page++;
  }
}

/** Stream every record across pages. */
export async function* streamItems<T>(
  fetchPage: PageFetcher<T>,
  startPage: number,
  size: number,
): AsyncGenerator<T> {
  for await (const p of streamPages(fetchPage, startPage, size)) {
    for (const item of p.items) yield item;
  }
}

/** Collect every record across pages into one array. */
export async function collectPages<T>(
  fetchPage: PageFetcher<T>,
  startPage: number,
  size: number,
): Promise<T[]> {
  const out: T[] = [];
  for await (const item of streamItems(fetchPage, startPage, size)) out.push(item);
  return out;
}

/**
 * Yield each record of an already-fetched batch (a NON-paginated resource has
 * exactly one batch and never sends page/size).
 */
export async function* streamOnce<T>(fetch: () => Promise<T[]>): AsyncGenerator<T> {
  const items = await fetch();
  for (const item of Array.isArray(items) ? items : []) yield item;
}
