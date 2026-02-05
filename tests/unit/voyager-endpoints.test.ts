import { describe, it, expect } from "vitest";
import { endpoints } from "../../src/lib/voyager-endpoints.js";

const BASE = "https://www.linkedin.com/voyager/api";

describe("voyager endpoints", () => {
	it("should build me endpoint", () => {
		expect(endpoints.me()).toBe(`${BASE}/me`);
	});

	it("should build profile view endpoint", () => {
		expect(endpoints.profileView("satyanadella")).toBe(
			`${BASE}/identity/profiles/satyanadella/profileView`,
		);
	});

	it("should build profile contact info endpoint", () => {
		expect(endpoints.profileContactInfo("john-doe")).toBe(
			`${BASE}/identity/profiles/john-doe/profileContactInfo`,
		);
	});

	it("should build feed updates endpoint", () => {
		expect(endpoints.feedUpdates()).toBe(`${BASE}/feed/updates`);
	});

	it("should build feed update endpoint with encoded URN", () => {
		const urn = "urn:li:activity:123";
		expect(endpoints.feedUpdate(urn)).toBe(
			`${BASE}/feed/updates/${encodeURIComponent(urn)}`,
		);
	});

	it("should build create post endpoint", () => {
		expect(endpoints.createPost()).toBe(
			`${BASE}/contentcreation/normShares`,
		);
	});

	it("should build search clusters endpoint", () => {
		expect(endpoints.searchClusters()).toBe(
			`${BASE}/search/dash/clusters`,
		);
	});

	it("should build connections endpoint", () => {
		expect(endpoints.connections()).toBe(
			`${BASE}/relationships/dash/connections`,
		);
	});

	it("should build conversations endpoint", () => {
		expect(endpoints.conversations()).toBe(
			`${BASE}/messaging/conversations`,
		);
	});

	it("should build conversation events endpoint", () => {
		expect(endpoints.conversationEvents("conv123")).toBe(
			`${BASE}/messaging/conversations/conv123/events`,
		);
	});

	it("should build company by slug endpoint", () => {
		expect(endpoints.companyBySlug("google")).toBe(
			`${BASE}/organization/companies?q=universalName&universalName=google`,
		);
	});

	it("should build job posting endpoint", () => {
		expect(endpoints.jobPosting("12345")).toBe(
			`${BASE}/jobs/jobPostings/12345`,
		);
	});

	it("should build notifications endpoint", () => {
		expect(endpoints.notifications()).toBe(
			`${BASE}/voyagerNotificationsDashNotificationCards`,
		);
	});

	it("should build profile views endpoint", () => {
		expect(endpoints.profileViews()).toBe(
			`${BASE}/identity/wvmpCards`,
		);
	});

	it("should encode special characters in URNs", () => {
		const urn = "urn:li:fsd_profile:ABC+DEF";
		expect(endpoints.memberRelationship(urn)).toContain(
			encodeURIComponent(urn),
		);
	});
});
