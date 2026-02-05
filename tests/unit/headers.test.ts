import { describe, expect, it } from "vitest";
import { buildHeaders } from "../../src/lib/headers.js";

describe("buildHeaders", () => {
	it("should build correct headers with cookies", () => {
		const cookies = {
			li_at: "test-li-at-token",
			jsessionid: "test-jsessionid",
		};

		const headers = buildHeaders(cookies);

		expect(headers["csrf-token"]).toBe("ajax:test-jsessionid");
		expect(headers.cookie).toBe('li_at=test-li-at-token; JSESSIONID="test-jsessionid"');
		expect(headers.Accept).toBe("application/vnd.linkedin.normalized+json+2.1");
		expect(headers["x-li-lang"]).toBe("en_US");
		expect(headers["x-restli-protocol-version"]).toBe("2.0.0");
		expect(headers["User-Agent"]).toContain("Chrome/132.0.0.0");
		expect(headers["x-li-track"]).toBeTruthy();
	});

	it("should strip quotes from JSESSIONID for CSRF token", () => {
		const cookies = {
			li_at: "token",
			jsessionid: '"quoted-session-id"',
		};

		const headers = buildHeaders(cookies);

		expect(headers["csrf-token"]).toBe("ajax:quoted-session-id");
		expect(headers.cookie).toBe('li_at=token; JSESSIONID="quoted-session-id"');
	});

	it("should include valid x-li-track JSON", () => {
		const cookies = { li_at: "token", jsessionid: "session" };
		const headers = buildHeaders(cookies);
		const track = JSON.parse(headers["x-li-track"]!);

		expect(track.osName).toBe("web");
		expect(track.deviceFormFactor).toBe("DESKTOP");
		expect(track.mpName).toBe("voyager-web");
		expect(typeof track.clientVersion).toBe("string");
	});

	it("should include extended cookies when present", () => {
		const cookies = {
			li_at: "test-token",
			jsessionid: "test-session",
			li_mc: "mc-value",
			bcookie: "bc-value",
			bscookie: "bsc-value",
		};

		const headers = buildHeaders(cookies);

		expect(headers.cookie).toBe(
			'li_at=test-token; JSESSIONID="test-session"; li_mc=mc-value; bcookie=bc-value; bscookie=bsc-value',
		);
	});

	it("should omit extended cookies when not present", () => {
		const cookies = {
			li_at: "test-token",
			jsessionid: "test-session",
		};

		const headers = buildHeaders(cookies);

		expect(headers.cookie).toBe('li_at=test-token; JSESSIONID="test-session"');
		expect(headers.cookie).not.toContain("li_mc");
		expect(headers.cookie).not.toContain("bcookie");
		expect(headers.cookie).not.toContain("bscookie");
	});
});
