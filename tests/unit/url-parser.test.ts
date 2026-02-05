import { describe, it, expect } from "vitest";
import {
	parseLinkedInUrl,
	extractPostUrn,
	extractProfileIdentifier,
	extractCompanySlug,
	extractJobId,
} from "../../src/utils/url-parser.js";

describe("parseLinkedInUrl", () => {
	it("should parse profile URLs", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/in/satyanadella",
		);
		expect(result.type).toBe("profile");
		expect(result.identifier).toBe("satyanadella");
	});

	it("should parse profile URLs with trailing slashes", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/in/john-doe/",
		);
		expect(result.type).toBe("profile");
		expect(result.identifier).toBe("john-doe");
	});

	it("should parse activity URLs", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/feed/update/urn:li:activity:1234567890",
		);
		expect(result.type).toBe("activity");
		expect(result.identifier).toBe("urn:li:activity:1234567890");
	});

	it("should parse post URLs with activity ID", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/posts/username_activity-1234567890-xyz",
		);
		expect(result.type).toBe("activity");
		expect(result.identifier).toBe("urn:li:activity:1234567890");
	});

	it("should parse company URLs", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/company/google/",
		);
		expect(result.type).toBe("company");
		expect(result.identifier).toBe("google");
	});

	it("should parse job URLs", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/jobs/view/1234567890/",
		);
		expect(result.type).toBe("job");
		expect(result.identifier).toBe("1234567890");
	});

	it("should parse activity URNs", () => {
		const result = parseLinkedInUrl("urn:li:activity:1234567890");
		expect(result.type).toBe("activity");
		expect(result.identifier).toBe("urn:li:activity:1234567890");
	});

	it("should parse member URNs", () => {
		const result = parseLinkedInUrl("urn:li:member:12345");
		expect(result.type).toBe("profile");
		expect(result.identifier).toBe("12345");
	});

	it("should parse company URNs", () => {
		const result = parseLinkedInUrl("urn:li:company:12345");
		expect(result.type).toBe("company");
		expect(result.identifier).toBe("12345");
	});

	it("should parse organization URNs", () => {
		const result = parseLinkedInUrl("urn:li:organization:12345");
		expect(result.type).toBe("company");
		expect(result.identifier).toBe("12345");
	});

	it("should parse share URNs", () => {
		const result = parseLinkedInUrl("urn:li:share:12345");
		expect(result.type).toBe("post");
		expect(result.identifier).toBe("urn:li:share:12345");
	});

	it("should parse ugcPost URNs", () => {
		const result = parseLinkedInUrl("urn:li:ugcPost:12345");
		expect(result.type).toBe("post");
		expect(result.identifier).toBe("urn:li:ugcPost:12345");
	});

	it("should parse jobPosting URNs", () => {
		const result = parseLinkedInUrl("urn:li:jobPosting:12345");
		expect(result.type).toBe("job");
		expect(result.identifier).toBe("12345");
	});

	it("should treat bare strings as profile identifiers", () => {
		const result = parseLinkedInUrl("satyanadella");
		expect(result.type).toBe("profile");
		expect(result.identifier).toBe("satyanadella");
	});

	it("should detect pure numeric identifiers as unknown", () => {
		const result = parseLinkedInUrl("1234567890");
		expect(result.type).toBe("unknown");
		expect(result.identifier).toBe("1234567890");
	});

	it("should handle URL-encoded identifiers", () => {
		const result = parseLinkedInUrl(
			"https://www.linkedin.com/in/j%C3%B6rg-m%C3%BCller",
		);
		expect(result.type).toBe("profile");
		expect(result.identifier).toBe("j\u00F6rg-m\u00FCller");
	});
});

describe("extractPostUrn", () => {
	it("should extract URN from activity URL", () => {
		expect(
			extractPostUrn(
				"https://www.linkedin.com/feed/update/urn:li:activity:123",
			),
		).toBe("urn:li:activity:123");
	});

	it("should pass through URNs", () => {
		expect(extractPostUrn("urn:li:activity:123")).toBe(
			"urn:li:activity:123",
		);
	});

	it("should convert bare numeric to activity URN", () => {
		expect(extractPostUrn("123456")).toBe("urn:li:activity:123456");
	});
});

describe("extractProfileIdentifier", () => {
	it("should extract from URL", () => {
		expect(
			extractProfileIdentifier(
				"https://www.linkedin.com/in/satyanadella",
			),
		).toBe("satyanadella");
	});

	it("should pass through bare identifier", () => {
		expect(extractProfileIdentifier("satyanadella")).toBe("satyanadella");
	});
});

describe("extractCompanySlug", () => {
	it("should extract from URL", () => {
		expect(
			extractCompanySlug(
				"https://www.linkedin.com/company/google/",
			),
		).toBe("google");
	});

	it("should pass through bare slug", () => {
		expect(extractCompanySlug("google")).toBe("google");
	});
});

describe("extractJobId", () => {
	it("should extract from URL", () => {
		expect(
			extractJobId(
				"https://www.linkedin.com/jobs/view/1234567890/",
			),
		).toBe("1234567890");
	});

	it("should extract from URN", () => {
		expect(extractJobId("urn:li:jobPosting:12345")).toBe("12345");
	});
});
