import { describe, it, expect } from "vitest";
import { truncate, indent, timeAgo } from "../../src/utils/terminal.js";

describe("truncate", () => {
	it("should not truncate short strings", () => {
		expect(truncate("hello", 10)).toBe("hello");
	});

	it("should truncate long strings with ellipsis", () => {
		expect(truncate("hello world", 8)).toBe("hello w\u2026");
	});

	it("should handle exact length", () => {
		expect(truncate("hello", 5)).toBe("hello");
	});
});

describe("indent", () => {
	it("should indent by default 2 spaces", () => {
		expect(indent("hello")).toBe("  hello");
	});

	it("should indent multi-line text", () => {
		expect(indent("line1\nline2")).toBe("  line1\n  line2");
	});

	it("should indent by custom spaces", () => {
		expect(indent("hello", 4)).toBe("    hello");
	});
});

describe("timeAgo", () => {
	it("should return 'just now' for recent timestamps", () => {
		expect(timeAgo(Date.now())).toBe("just now");
	});

	it("should return minutes ago", () => {
		expect(timeAgo(Date.now() - 5 * 60 * 1000)).toBe("5m ago");
	});

	it("should return hours ago", () => {
		expect(timeAgo(Date.now() - 3 * 60 * 60 * 1000)).toBe("3h ago");
	});

	it("should return days ago", () => {
		expect(timeAgo(Date.now() - 7 * 24 * 60 * 60 * 1000)).toBe("7d ago");
	});

	it("should return months ago", () => {
		expect(timeAgo(Date.now() - 90 * 24 * 60 * 60 * 1000)).toBe("3mo ago");
	});

	it("should return years ago", () => {
		expect(timeAgo(Date.now() - 400 * 24 * 60 * 60 * 1000)).toBe("1y ago");
	});
});
