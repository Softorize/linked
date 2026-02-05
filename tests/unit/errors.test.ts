import { describe, it, expect } from "vitest";
import {
	LinkedInError,
	AuthenticationError,
	RateLimitError,
	ChallengeError,
	NotFoundError,
	CookieExtractionError,
} from "../../src/lib/errors.js";

describe("LinkedInError", () => {
	it("should create with message", () => {
		const err = new LinkedInError("test error");
		expect(err.message).toBe("test error");
		expect(err.name).toBe("LinkedInError");
	});

	it("should include status code and endpoint", () => {
		const err = new LinkedInError("test", 500, "/api/test");
		expect(err.statusCode).toBe(500);
		expect(err.endpoint).toBe("/api/test");
	});
});

describe("AuthenticationError", () => {
	it("should have default message", () => {
		const err = new AuthenticationError();
		expect(err.message).toContain("Authentication failed");
		expect(err.statusCode).toBe(401);
		expect(err.name).toBe("AuthenticationError");
	});

	it("should accept custom message", () => {
		const err = new AuthenticationError("Custom auth error");
		expect(err.message).toBe("Custom auth error");
	});
});

describe("RateLimitError", () => {
	it("should have default retry after", () => {
		const err = new RateLimitError();
		expect(err.retryAfter).toBe(60);
		expect(err.statusCode).toBe(429);
		expect(err.name).toBe("RateLimitError");
	});

	it("should accept custom retry after", () => {
		const err = new RateLimitError(120);
		expect(err.retryAfter).toBe(120);
		expect(err.message).toContain("120");
	});
});

describe("ChallengeError", () => {
	it("should have correct properties", () => {
		const err = new ChallengeError();
		expect(err.message).toContain("challenge");
		expect(err.statusCode).toBe(403);
		expect(err.name).toBe("ChallengeError");
	});
});

describe("NotFoundError", () => {
	it("should include resource name", () => {
		const err = new NotFoundError("Profile");
		expect(err.message).toBe("Profile not found.");
		expect(err.statusCode).toBe(404);
		expect(err.name).toBe("NotFoundError");
	});
});

describe("CookieExtractionError", () => {
	it("should include source name", () => {
		const err = new CookieExtractionError("chrome");
		expect(err.message).toContain("chrome");
		expect(err.name).toBe("CookieExtractionError");
	});

	it("should include cause when provided", () => {
		const err = new CookieExtractionError("safari", "Permission denied");
		expect(err.message).toContain("safari");
		expect(err.message).toContain("Permission denied");
	});
});
