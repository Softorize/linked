import type { PagingInfo, PaginationOptions } from "./types.js";

export const DEFAULT_COUNT = 10;
export const MAX_COUNT = 100;

export function buildPaginationParams(
	options?: PaginationOptions,
): URLSearchParams {
	const params = new URLSearchParams();
	const start = options?.start ?? 0;
	const count = Math.min(options?.count ?? DEFAULT_COUNT, MAX_COUNT);
	params.set("start", String(start));
	params.set("count", String(count));
	return params;
}

export function hasNextPage(paging: PagingInfo): boolean {
	return paging.start + paging.count < paging.total;
}

export function nextPageStart(paging: PagingInfo): number {
	return paging.start + paging.count;
}

export interface FullPaginationOptions extends PaginationOptions {
	all?: boolean;
	maxPages?: number;
	delayMs?: number;
}
