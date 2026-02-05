import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the fs and child_process modules since browser extraction
// depends on OS-specific paths and python scripts
vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn(),
		readFileSync: actual.readFileSync,
		mkdirSync: actual.mkdirSync,
		writeFileSync: actual.writeFileSync,
		chmodSync: actual.chmodSync,
	};
});

describe("extractCookiesFromBrowser", () => {
	let existsSyncMock: ReturnType<typeof vi.fn>;
	let execSyncMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();
		const fs = await import("node:fs");
		const cp = await import("node:child_process");
		existsSyncMock = fs.existsSync as ReturnType<typeof vi.fn>;
		execSyncMock = cp.execSync as ReturnType<typeof vi.fn>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw for unknown browser source", async () => {
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() =>
			extractCookiesFromBrowser("opera" as "safari"),
		).toThrow(/Unknown browser source/);
	});

	it("should throw when specific browser has no cookies", async () => {
		existsSyncMock.mockReturnValue(false);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("safari")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});

	it("should throw when no browser has cookies (default order)", async () => {
		existsSyncMock.mockReturnValue(false);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser()).toThrow(
			/Could not find LinkedIn cookies in Safari, Chrome, or Firefox/,
		);
	});

	it("should skip env and config sources for browser extraction", async () => {
		existsSyncMock.mockReturnValue(false);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("env")).toThrow(
			/Could not find LinkedIn cookies/,
		);
		expect(() => extractCookiesFromBrowser("config")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});

	it("should extract cookies from Safari when available", async () => {
		existsSyncMock.mockReturnValue(true);
		execSyncMock.mockReturnValue(
			JSON.stringify({ li_at: "safari-token", JSESSIONID: "safari-session" }),
		);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		const result = extractCookiesFromBrowser("safari");
		expect(result).toEqual({
			li_at: "safari-token",
			jsessionid: "safari-session",
		});
	});

	it("should extract cookies from Chrome when Safari fails", async () => {
		let callCount = 0;
		existsSyncMock.mockImplementation(() => {
			callCount++;
			return callCount > 1;
		});
		execSyncMock.mockReturnValue(
			JSON.stringify({ li_at: "chrome-token", JSESSIONID: "chrome-session" }),
		);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		const result = extractCookiesFromBrowser();
		expect(result.li_at).toBe("chrome-token");
	});

	it("should handle execSync throwing an error", async () => {
		existsSyncMock.mockReturnValue(true);
		execSyncMock.mockImplementation(() => {
			throw new Error("Command failed");
		});
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("safari")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});

	it("should handle empty string from execSync", async () => {
		existsSyncMock.mockReturnValue(true);
		execSyncMock.mockReturnValue("");
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("chrome")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});

	it("should handle malformed JSON from execSync", async () => {
		existsSyncMock.mockReturnValue(true);
		execSyncMock.mockReturnValue("not json");
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("firefox")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});

	it("should handle JSON missing required cookies", async () => {
		existsSyncMock.mockReturnValue(true);
		execSyncMock.mockReturnValue(
			JSON.stringify({ li_at: "token" }), // missing JSESSIONID
		);
		const { extractCookiesFromBrowser } = await import(
			"../../src/lib/cookie-extract.js"
		);
		expect(() => extractCookiesFromBrowser("safari")).toThrow(
			/Could not find LinkedIn cookies/,
		);
	});
});
