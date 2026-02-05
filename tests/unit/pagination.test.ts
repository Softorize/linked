import { describe, it, expect } from "vitest";
import {
	buildPaginationParams,
	hasNextPage,
	nextPageStart,
} from "../../src/lib/pagination.js";

describe("buildPaginationParams", () => {
	it("should use defaults when no options provided", () => {
		const params = buildPaginationParams();
		expect(params.get("start")).toBe("0");
		expect(params.get("count")).toBe("10");
	});

	it("should use provided values", () => {
		const params = buildPaginationParams({ start: 20, count: 50 });
		expect(params.get("start")).toBe("20");
		expect(params.get("count")).toBe("50");
	});

	it("should cap count at MAX_COUNT", () => {
		const params = buildPaginationParams({ count: 200 });
		expect(params.get("count")).toBe("100");
	});
});

describe("hasNextPage", () => {
	it("should return true when there are more pages", () => {
		expect(hasNextPage({ start: 0, count: 10, total: 50 })).toBe(true);
	});

	it("should return false when on last page", () => {
		expect(hasNextPage({ start: 40, count: 10, total: 50 })).toBe(false);
	});

	it("should return false when past total", () => {
		expect(hasNextPage({ start: 50, count: 10, total: 50 })).toBe(false);
	});
});

describe("nextPageStart", () => {
	it("should calculate correct next page start", () => {
		expect(nextPageStart({ start: 0, count: 10, total: 50 })).toBe(10);
		expect(nextPageStart({ start: 10, count: 10, total: 50 })).toBe(20);
	});
});
