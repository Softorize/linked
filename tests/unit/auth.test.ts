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

		// This will attempt browser extraction which will fail in test environment
		expect(() => resolveCredentials()).toThrow();
	});
});
