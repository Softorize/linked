import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveCredentials } from "../../src/lib/auth.js";

describe("resolveCredentials", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return explicitly provided cookies", () => {
		const cookies = {
			li_at: "explicit-token",
			jsessionid: "explicit-session",
		};
		const result = resolveCredentials({ cookies });
		expect(result).toEqual(cookies);
	});

	it("should use environment variables", () => {
		process.env["LINKEDIN_LI_AT"] = "env-token";
		process.env["LINKEDIN_JSESSIONID"] = "env-session";

		const result = resolveCredentials();
		expect(result).toEqual({
			li_at: "env-token",
			jsessionid: "env-session",
		});
	});

	it("should prefer explicit cookies over env vars", () => {
		process.env["LINKEDIN_LI_AT"] = "env-token";
		process.env["LINKEDIN_JSESSIONID"] = "env-session";

		const cookies = {
			li_at: "explicit-token",
			jsessionid: "explicit-session",
		};
		const result = resolveCredentials({ cookies });
		expect(result.li_at).toBe("explicit-token");
	});

	it("should throw when no credentials available", () => {
		delete process.env["LINKEDIN_LI_AT"];
		delete process.env["LINKEDIN_JSESSIONID"];

		expect(() => resolveCredentials()).toThrow();
	});

	it("should not use env vars if only one is set", () => {
		process.env["LINKEDIN_LI_AT"] = "token-only";
		delete process.env["LINKEDIN_JSESSIONID"];

		// Should fall through to config/browser extraction
		expect(() => resolveCredentials()).toThrow();
	});

	it("should not use explicit cookies if only li_at is provided", () => {
		process.env["LINKEDIN_LI_AT"] = "env-token";
		process.env["LINKEDIN_JSESSIONID"] = "env-session";

		// Only providing li_at, not jsessionid
		const result = resolveCredentials({
			cookies: { li_at: "partial", jsessionid: "" },
		});
		// Should fall through to env vars since jsessionid is empty
		expect(result.li_at).toBe("env-token");
	});

	it("should not use explicit cookies if only jsessionid is provided", () => {
		process.env["LINKEDIN_LI_AT"] = "env-token";
		process.env["LINKEDIN_JSESSIONID"] = "env-session";

		const result = resolveCredentials({
			cookies: { li_at: "", jsessionid: "partial" },
		});
		expect(result.li_at).toBe("env-token");
	});

	it("should handle cookieSource option", () => {
		delete process.env["LINKEDIN_LI_AT"];
		delete process.env["LINKEDIN_JSESSIONID"];

		// Should still throw because browser extraction will fail in test env
		expect(() =>
			resolveCredentials({ cookieSource: "chrome" }),
		).toThrow();
	});

	it("should propagate error message from extraction failure", () => {
		delete process.env["LINKEDIN_LI_AT"];
		delete process.env["LINKEDIN_JSESSIONID"];

		try {
			resolveCredentials();
			expect.unreachable("Should have thrown");
		} catch (err) {
			expect(err).toBeDefined();
			expect((err as Error).message).toBeTruthy();
		}
	});
});
