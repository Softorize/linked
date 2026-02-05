import { describe, it, expect } from "vitest";
import {
	formatProfile,
	formatFeedUpdates,
	formatConnections,
	formatInvitations,
	formatConversations,
	formatMessages,
	formatNotifications,
	formatCompany,
	formatJobs,
	formatJob,
	formatProfileViews,
	formatNetworkStats,
	formatSearchResults,
	formatContactInfo,
} from "../../src/lib/formatters.js";
import type {
	Profile,
	FeedUpdate,
	Connection,
	Invitation,
	Conversation,
	Message,
	Notification,
	Company,
	Job,
	ProfileView,
	NetworkStats,
	SearchResult,
	ContactInfo,
} from "../../src/lib/types.js";

const mockProfile: Profile = {
	publicIdentifier: "testuser",
	firstName: "John",
	lastName: "Doe",
	headline: "Software Engineer",
	summary: "Experienced developer",
	industryName: "Technology",
	locationName: "San Francisco",
	geoCountryName: "United States",
	profilePictureUrl: "",
	backgroundPictureUrl: "",
	connectionCount: 500,
	followerCount: 1000,
	entityUrn: "urn:li:member:12345",
	profileUrl: "https://www.linkedin.com/in/testuser",
	experience: [
		{
			title: "Senior Engineer",
			companyName: "Tech Corp",
			companyUrn: "urn:li:company:123",
			locationName: "SF",
			description: "Building stuff",
			startDate: { year: 2020, month: 1 },
			endDate: null,
			current: true,
		},
	],
	education: [
		{
			schoolName: "MIT",
			degreeName: "BS",
			fieldOfStudy: "Computer Science",
			startDate: { year: 2012 },
			endDate: { year: 2016 },
		},
	],
};

describe("formatProfile", () => {
	it("should include name", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("John");
		expect(output).toContain("Doe");
	});

	it("should include headline", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("Software Engineer");
	});

	it("should include location", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("San Francisco");
	});

	it("should include connection count", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("500");
	});

	it("should include experience", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("Senior Engineer");
		expect(output).toContain("Tech Corp");
	});

	it("should include education", () => {
		const output = formatProfile(mockProfile);
		expect(output).toContain("MIT");
	});
});

describe("formatContactInfo", () => {
	it("should format email", () => {
		const info: ContactInfo = {
			emailAddress: "test@example.com",
			phoneNumbers: [],
			websites: [],
			twitterHandles: [],
			address: null,
			birthDay: null,
		};
		const output = formatContactInfo(info);
		expect(output).toContain("test@example.com");
	});

	it("should show message when no info", () => {
		const info: ContactInfo = {
			emailAddress: null,
			phoneNumbers: [],
			websites: [],
			twitterHandles: [],
			address: null,
			birthDay: null,
		};
		const output = formatContactInfo(info);
		expect(output).toContain("No contact info");
	});
});

describe("formatFeedUpdates", () => {
	it("should handle empty feed", () => {
		const output = formatFeedUpdates([]);
		expect(output).toContain("No feed updates");
	});

	it("should format feed updates", () => {
		const updates: FeedUpdate[] = [
			{
				urn: "urn:li:activity:123",
				authorUrn: "urn:li:member:1",
				authorName: "Jane Smith",
				authorHeadline: "CEO",
				authorProfileUrl: "https://linkedin.com/in/janesmith",
				text: "Hello world!",
				commentary: "Hello world!",
				numLikes: 10,
				numComments: 5,
				numShares: 2,
				createdAt: Date.now() - 3600000,
				reactionTypeCounts: [],
				postUrl: "https://linkedin.com/feed/update/urn:li:activity:123",
			},
		];
		const output = formatFeedUpdates(updates);
		expect(output).toContain("Jane Smith");
		expect(output).toContain("Hello world!");
		expect(output).toContain("10 likes");
	});
});

describe("formatSearchResults", () => {
	it("should handle empty results", () => {
		const result: SearchResult = {
			type: "people",
			total: 0,
			items: [],
			paging: { start: 0, count: 10, total: 0 },
		};
		const output = formatSearchResults(result);
		expect(output).toContain("No people results");
	});

	it("should format search results", () => {
		const result: SearchResult = {
			type: "people",
			total: 1,
			items: [
				{
					type: "people",
					title: "John Doe",
					subtitle: "Engineer",
					url: "https://linkedin.com/in/johndoe",
					urn: "urn:li:member:1",
					imageUrl: "",
					snippets: ["Works at Company"],
				},
			],
			paging: { start: 0, count: 10, total: 1 },
		};
		const output = formatSearchResults(result);
		expect(output).toContain("John Doe");
		expect(output).toContain("Engineer");
	});
});

describe("formatConnections", () => {
	it("should handle empty connections", () => {
		expect(formatConnections([])).toContain("No connections");
	});
});

describe("formatInvitations", () => {
	it("should handle empty invitations", () => {
		expect(formatInvitations([])).toContain("No pending invitations");
	});
});

describe("formatConversations", () => {
	it("should handle empty conversations", () => {
		expect(formatConversations([])).toContain("No conversations");
	});
});

describe("formatMessages", () => {
	it("should handle empty messages", () => {
		expect(formatMessages([])).toContain("No messages");
	});
});

describe("formatNotifications", () => {
	it("should handle empty notifications", () => {
		expect(formatNotifications([])).toContain("No notifications");
	});
});

describe("formatCompany", () => {
	it("should format company info", () => {
		const company: Company = {
			entityUrn: "urn:li:company:123",
			universalName: "google",
			name: "Google",
			tagline: "Don't be evil",
			description: "A search engine company",
			website: "https://google.com",
			industryName: "Technology",
			staffCount: 150000,
			staffCountRange: "10001+",
			headquarter: {
				city: "Mountain View",
				country: "US",
				geographicArea: "CA",
				line1: "1600 Amphitheatre Parkway",
				postalCode: "94043",
			},
			specialities: ["Search", "Cloud", "AI"],
			logoUrl: "",
			coverImageUrl: "",
			foundedYear: 1998,
			companyUrl: "https://www.linkedin.com/company/google",
		};
		const output = formatCompany(company);
		expect(output).toContain("Google");
		expect(output).toContain("Technology");
		expect(output).toContain("1998");
		expect(output).toContain("Mountain View");
	});
});

describe("formatJobs", () => {
	it("should handle empty jobs", () => {
		expect(formatJobs([])).toContain("No jobs");
	});

	it("should format job listing", () => {
		const job: Job = {
			id: "123",
			entityUrn: "urn:li:jobPosting:123",
			title: "Software Engineer",
			companyName: "Google",
			companyUrl: "https://linkedin.com/company/google",
			locationName: "Mountain View, CA",
			description: "Build amazing stuff",
			listedAt: Date.now() - 86400000,
			expireAt: Date.now() + 86400000 * 30,
			workRemoteAllowed: true,
			applicantCount: 50,
			seniorityLevel: "Mid-Senior",
			employmentType: "Full-time",
			jobFunctions: ["Engineering"],
			industries: ["Technology"],
			jobUrl: "https://linkedin.com/jobs/view/123",
		};
		const output = formatJob(job);
		expect(output).toContain("Software Engineer");
		expect(output).toContain("Google");
		expect(output).toContain("Remote");
	});
});

describe("formatProfileViews", () => {
	it("should handle empty views", () => {
		expect(formatProfileViews([])).toContain("No profile views");
	});
});

describe("formatNetworkStats", () => {
	it("should format stats", () => {
		const stats: NetworkStats = {
			connectionCount: 500,
			followerCount: 1000,
			profileViewCount: 200,
			searchAppearances: 50,
			postImpressions: 5000,
		};
		const output = formatNetworkStats(stats);
		expect(output).toContain("500");
		expect(output).toContain("1000");
		expect(output).toContain("200");
	});
});
