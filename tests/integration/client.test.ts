import { describe, it, expect, beforeAll } from "vitest";
import { LinkedInClient } from "../../src/lib/client.js";

/**
 * Integration tests for LinkedInClient.
 *
 * These tests require valid LinkedIn credentials.
 * Set LINKEDIN_LI_AT and LINKEDIN_JSESSIONID environment variables.
 *
 * Run with: LINKEDIN_LI_AT=xxx LINKEDIN_JSESSIONID=yyy pnpm test -- tests/integration
 */

const hasCredentials =
	Boolean(process.env["LINKEDIN_LI_AT"]) &&
	Boolean(process.env["LINKEDIN_JSESSIONID"]);

describe.skipIf(!hasCredentials)("LinkedInClient integration", () => {
	let client: LinkedInClient;

	beforeAll(() => {
		client = new LinkedInClient();
	});

	it("should get current user profile", async () => {
		const profile = await client.getMe();
		expect(profile.firstName).toBeTruthy();
		expect(profile.lastName).toBeTruthy();
		expect(profile.publicIdentifier).toBeTruthy();
	});

	it("should get feed", async () => {
		const feed = await client.getFeed({ count: 5 });
		expect(Array.isArray(feed)).toBe(true);
	});

	it("should search people", async () => {
		const result = await client.search("software engineer", "people", {
			count: 5,
		});
		expect(result.type).toBe("people");
		expect(Array.isArray(result.items)).toBe(true);
	});

	it("should get connections", async () => {
		const connections = await client.getConnections({ count: 5 });
		expect(Array.isArray(connections)).toBe(true);
	});

	it("should get conversations", async () => {
		const conversations = await client.getConversations({ count: 5 });
		expect(Array.isArray(conversations)).toBe(true);
	});

	it("should get notifications", async () => {
		const notifications = await client.getNotifications({ count: 5 });
		expect(Array.isArray(notifications)).toBe(true);
	});
});
