import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LinkedInClient } from "../../src/lib/client.js";
import {
	AuthenticationError,
	RateLimitError,
	ChallengeError,
	NotFoundError,
	LinkedInError,
} from "../../src/lib/errors.js";

// Mock resolveCredentials to avoid needing real cookies
vi.mock("../../src/lib/auth.js", () => ({
	resolveCredentials: () => ({
		li_at: "test-token",
		jsessionid: "test-session",
	}),
}));

// Helper to create a mock fetch response
function mockFetchResponse(data: unknown, status = 200, headers?: Record<string, string>) {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : `Error ${status}`,
		headers: {
			get: (name: string) => {
				if (name === "content-type") return "application/json";
				if (headers && name in headers) return headers[name];
				return null;
			},
		},
		json: () => Promise.resolve(data),
		text: () => Promise.resolve(JSON.stringify(data)),
	};
}

describe("LinkedInClient HTTP error handling", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should throw AuthenticationError on 401", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}, 401) as Response);
		await expect(client.getMe()).rejects.toThrow(AuthenticationError);
	});

	it("should throw ChallengeError on 403 with challenge text", async () => {
		fetchSpy.mockResolvedValue({
			ok: false,
			status: 403,
			statusText: "Forbidden",
			headers: { get: () => "text/html" },
			text: () => Promise.resolve("challenge verification required"),
			json: () => Promise.reject(new Error("not json")),
		} as unknown as Response);
		await expect(client.getMe()).rejects.toThrow(ChallengeError);
	});

	it("should throw AuthenticationError on 403 without challenge", async () => {
		fetchSpy.mockResolvedValue({
			ok: false,
			status: 403,
			statusText: "Forbidden",
			headers: { get: () => "text/html" },
			text: () => Promise.resolve("access denied"),
			json: () => Promise.reject(new Error("not json")),
		} as unknown as Response);
		await expect(client.getMe()).rejects.toThrow(AuthenticationError);
	});

	it("should throw NotFoundError on 404", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}, 404) as Response);
		await expect(client.getMe()).rejects.toThrow(NotFoundError);
	});

	it(
		"should throw RateLimitError on 429 with retry-after header",
		async () => {
			fetchSpy.mockResolvedValue(
				mockFetchResponse({}, 429, { "retry-after": "1" }) as Response,
			);
			await expect(client.getMe()).rejects.toThrow(RateLimitError);
		},
		30000,
	);

	it(
		"should throw LinkedInError on 500 after retries",
		async () => {
			fetchSpy.mockResolvedValue(mockFetchResponse({}, 500) as Response);
			await expect(client.getMe()).rejects.toThrow(LinkedInError);
		},
		30000,
	);
});

describe("LinkedInClient.getMe() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse profile from /me response", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {
					firstName: "John",
					lastName: "Doe",
					publicIdentifier: "johndoe",
					headline: "Engineer",
					summary: "Hello",
					entityUrn: "urn:li:member:123",
				},
				included: [
					{
						$type: "com.linkedin.voyager.identity.shared.MiniProfile",
						firstName: "John",
						lastName: "Doe",
						publicIdentifier: "johndoe",
						headline: "Engineer",
						occupation: "Software Engineer at Corp",
						entityUrn: "urn:li:fs_miniProfile:ABC",
					},
				],
			}) as Response,
		);

		const profile = await client.getMe();
		expect(profile.firstName).toBe("John");
		expect(profile.lastName).toBe("Doe");
		expect(profile.publicIdentifier).toBe("johndoe");
	});

	it("should handle empty included array", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {
					firstName: "Jane",
					lastName: "Smith",
					publicIdentifier: "janesmith",
				},
				included: [],
			}) as Response,
		);

		const profile = await client.getMe();
		expect(profile.firstName).toBe("Jane");
		expect(profile.lastName).toBe("Smith");
	});

	it("should handle missing fields gracefully", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [],
			}) as Response,
		);

		const profile = await client.getMe();
		expect(profile.firstName).toBe("");
		expect(profile.connectionCount).toBe(0);
		expect(profile.experience).toEqual([]);
		expect(profile.education).toEqual([]);
	});
});

describe("LinkedInClient.getProfile() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse experience from included entities", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {
					publicIdentifier: "testuser",
					firstName: "Test",
					lastName: "User",
				},
				included: [
					{
						$type: "com.linkedin.voyager.identity.profile.Position",
						title: "Senior Engineer",
						companyName: "Tech Inc",
						companyUrn: "urn:li:company:123",
						locationName: "San Francisco",
						description: "Building things",
						timePeriod: {
							startDate: { year: 2020, month: 3 },
							endDate: null,
						},
					},
					{
						$type: "com.linkedin.voyager.identity.profile.Position",
						title: "Junior Engineer",
						companyName: "Startup",
						timePeriod: {
							startDate: { year: 2018, month: 1 },
							endDate: { year: 2020, month: 2 },
						},
					},
				],
			}) as Response,
		);

		const profile = await client.getProfile("testuser");
		expect(profile.experience).toHaveLength(2);
		expect(profile.experience[0]!.title).toBe("Senior Engineer");
		expect(profile.experience[0]!.current).toBe(true);
		expect(profile.experience[0]!.startDate).toEqual({ year: 2020, month: 3 });
		expect(profile.experience[1]!.title).toBe("Junior Engineer");
		expect(profile.experience[1]!.current).toBe(false);
		expect(profile.experience[1]!.endDate).toEqual({ year: 2020, month: 2 });
	});

	it("should parse education from included entities", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: { publicIdentifier: "testuser", firstName: "Test", lastName: "User" },
				included: [
					{
						$type: "com.linkedin.voyager.identity.profile.Education",
						schoolName: "MIT",
						degreeName: "BS",
						fieldOfStudy: "Computer Science",
						timePeriod: {
							startDate: { year: 2012 },
							endDate: { year: 2016 },
						},
					},
				],
			}) as Response,
		);

		const profile = await client.getProfile("testuser");
		expect(profile.education).toHaveLength(1);
		expect(profile.education[0]!.schoolName).toBe("MIT");
		expect(profile.education[0]!.degreeName).toBe("BS");
		expect(profile.education[0]!.fieldOfStudy).toBe("Computer Science");
	});
});

describe("LinkedInClient.getProfileContactInfo()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse contact info", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {
					emailAddress: "test@example.com",
					phoneNumbers: [{ number: "+1234567890", type: "MOBILE" }],
					websites: [
						{ url: "https://example.com", type: "PERSONAL", category: "PERSONAL" },
					],
					twitterHandles: [{ name: "testuser" }],
					address: "123 Main St",
				},
				included: [],
			}) as Response,
		);

		const info = await client.getProfileContactInfo("testuser");
		expect(info.emailAddress).toBe("test@example.com");
		expect(info.phoneNumbers).toHaveLength(1);
		expect(info.phoneNumbers[0]!.number).toBe("+1234567890");
		expect(info.websites).toHaveLength(1);
		expect(info.twitterHandles).toEqual(["testuser"]);
		expect(info.address).toBe("123 Main St");
	});

	it("should handle missing contact info fields", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({ data: {}, included: [] }) as Response,
		);

		const info = await client.getProfileContactInfo("testuser");
		expect(info.emailAddress).toBeNull();
		expect(info.phoneNumbers).toEqual([]);
		expect(info.websites).toEqual([]);
		expect(info.twitterHandles).toEqual([]);
		expect(info.address).toBeNull();
	});
});

describe("LinkedInClient.getFeed() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse feed updates from included", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.feed.render.UpdateV2",
						entityUrn: "urn:li:activity:123",
						actor: {
							name: { text: "Jane Doe" },
							description: { text: "CEO at Company" },
							navigationUrl: "https://linkedin.com/in/janedoe",
							urn: "urn:li:member:456",
						},
						commentary: {
							text: { text: "Hello world!" },
						},
						socialDetail: {
							totalSocialActivityCounts: {
								numLikes: 42,
								numComments: 7,
								numShares: 3,
							},
						},
						createdTime: 1700000000000,
					},
				],
			}) as Response,
		);

		const feed = await client.getFeed({ count: 5 });
		expect(feed).toHaveLength(1);
		expect(feed[0]!.authorName).toBe("Jane Doe");
		expect(feed[0]!.text).toBe("Hello world!");
		expect(feed[0]!.numLikes).toBe(42);
		expect(feed[0]!.numComments).toBe(7);
		expect(feed[0]!.urn).toBe("urn:li:activity:123");
	});

	it("should return empty array when no feed updates", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({ data: {}, included: [] }) as Response,
		);

		const feed = await client.getFeed();
		expect(feed).toEqual([]);
	});

	it("should skip items without URN", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.feed.render.UpdateV2",
						// no entityUrn
						actor: { name: { text: "Someone" } },
					},
				],
			}) as Response,
		);

		const feed = await client.getFeed();
		expect(feed).toEqual([]);
	});
});

describe("LinkedInClient.getPost()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should throw NotFoundError when no post found", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({ data: {}, included: [] }) as Response,
		);

		await expect(
			client.getPost("urn:li:activity:123"),
		).rejects.toThrow(NotFoundError);
	});
});

describe("LinkedInClient.createPost()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should create a post and return URN", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				value: { urn: "urn:li:activity:999" },
			}) as Response,
		);

		const result = await client.createPost("Hello world!");
		expect(result.urn).toBe("urn:li:activity:999");
		expect(result.url).toContain("urn:li:activity:999");
	});

	it("should handle visibility option", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({ value: { urn: "urn:li:activity:999" } }) as Response,
		);

		await client.createPost("Test", { visibility: "CONNECTIONS" });
		const callBody = JSON.parse(
			(fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(callBody.visibleToConnectionsOnly).toBe(true);
	});
});

describe("LinkedInClient.comment()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should post a comment and return result", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				value: { urn: "urn:li:comment:111" },
			}) as Response,
		);

		const result = await client.comment("urn:li:activity:123", "Great post!");
		expect(result.urn).toBe("urn:li:comment:111");
	});
});

describe("LinkedInClient.react() / unreact()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should send a like reaction", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.react("urn:li:activity:123", "LIKE");
		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should default to LIKE reaction", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.react("urn:li:activity:123");
		const body = JSON.parse(
			(fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.reactionType).toBe("LIKE");
	});

	it("should delete a reaction", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.unreact("urn:li:activity:123");
		expect((fetchSpy.mock.calls[0]![1] as RequestInit).method).toBe("DELETE");
	});
});

describe("LinkedInClient.search() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse search results", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.search.SearchHitV2",
						title: { text: "John Doe" },
						primarySubtitle: { text: "Software Engineer" },
						navigationUrl: "https://linkedin.com/in/johndoe",
						entityUrn: "urn:li:member:123",
					},
					{
						$type: "com.linkedin.voyager.search.SearchHitV2",
						title: { text: "Jane Smith" },
						primarySubtitle: { text: "Product Manager" },
						navigationUrl: "https://linkedin.com/in/janesmith",
						entityUrn: "urn:li:member:456",
					},
				],
				paging: { start: 0, count: 10, total: 2 },
			}) as Response,
		);

		const result = await client.search("engineer", "people", { count: 10 });
		expect(result.type).toBe("people");
		expect(result.items).toHaveLength(2);
		expect(result.items[0]!.title).toBe("John Doe");
		expect(result.items[1]!.title).toBe("Jane Smith");
		expect(result.total).toBe(2);
	});

	it("should handle empty search results", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [],
				paging: { start: 0, count: 10, total: 0 },
			}) as Response,
		);

		const result = await client.search("nonexistent");
		expect(result.items).toEqual([]);
	});
});

describe("LinkedInClient.getConnections() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse connections from MiniProfile entities", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.identity.shared.MiniProfile",
						publicIdentifier: "johndoe",
						firstName: "John",
						lastName: "Doe",
						occupation: "Engineer",
						entityUrn: "urn:li:fs_miniProfile:ABC",
					},
					{
						$type: "com.linkedin.voyager.identity.shared.MiniProfile",
						publicIdentifier: "janesmith",
						firstName: "Jane",
						lastName: "Smith",
						occupation: "Designer",
						entityUrn: "urn:li:fs_miniProfile:DEF",
					},
				],
			}) as Response,
		);

		const connections = await client.getConnections({ count: 10 });
		expect(connections).toHaveLength(2);
		expect(connections[0]!.publicIdentifier).toBe("johndoe");
		expect(connections[0]!.headline).toBe("Engineer");
		expect(connections[1]!.publicIdentifier).toBe("janesmith");
	});

	it("should filter out entities without publicIdentifier", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.identity.shared.MiniProfile",
						publicIdentifier: "johndoe",
						firstName: "John",
						lastName: "Doe",
						entityUrn: "urn:li:fs_miniProfile:ABC",
					},
					{
						$type: "com.linkedin.voyager.common.SomeOtherType",
						entityUrn: "urn:li:other:123",
					},
				],
			}) as Response,
		);

		const connections = await client.getConnections();
		expect(connections).toHaveLength(1);
	});
});

describe("LinkedInClient.sendConnectionRequest()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should send connection request without message", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.sendConnectionRequest("testuser");
		const body = JSON.parse(
			(fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.inviteeProfileUrn).toContain("testuser");
		expect(body.message).toBeUndefined();
	});

	it("should send connection request with message", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.sendConnectionRequest("testuser", "Hi there!");
		const body = JSON.parse(
			(fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.message).toBe("Hi there!");
	});
});

describe("LinkedInClient.getInvitations() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse received invitations", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.relationships.invitation.Invitation",
						entityUrn: "urn:li:invitation:123",
						id: "123",
						fromMember: {
							firstName: "John",
							lastName: "Doe",
							occupation: "Engineer",
							publicIdentifier: "johndoe",
						},
						message: "Let's connect!",
						sentTime: 1700000000000,
						invitationType: "CONNECTION",
					},
				],
			}) as Response,
		);

		const invitations = await client.getInvitations(false);
		expect(invitations).toHaveLength(1);
		expect(invitations[0]!.senderName).toBe("John Doe");
		expect(invitations[0]!.message).toBe("Let's connect!");
	});
});

describe("LinkedInClient.getConversations() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse conversations", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.messaging.Conversation",
						entityUrn: "urn:li:messagingConversation:123",
						lastActivityAt: 1700000000000,
						read: false,
						participants: [],
					},
				],
			}) as Response,
		);

		const conversations = await client.getConversations();
		expect(conversations).toHaveLength(1);
		expect(conversations[0]!.conversationId).toBe("123");
		expect(conversations[0]!.read).toBe(false);
	});
});

describe("LinkedInClient.getMessages() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse messages from conversation", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.messaging.event.MessageEvent",
						entityUrn: "urn:li:messagingMessage:456",
						body: { text: "Hello!" },
						from: {
							entityUrn: "urn:li:member:789",
							miniProfile: {
								firstName: "Jane",
								lastName: "Smith",
								entityUrn: "urn:li:fs_miniProfile:ABC",
							},
						},
						createdAt: 1700000000000,
					},
				],
			}) as Response,
		);

		const messages = await client.getMessages("123");
		expect(messages).toHaveLength(1);
		expect(messages[0]!.text).toBe("Hello!");
		expect(messages[0]!.senderName).toBe("Jane Smith");
		expect(messages[0]!.conversationId).toBe("123");
	});

	it("should filter out messages without text", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.messaging.event.MessageEvent",
						entityUrn: "urn:li:messagingMessage:456",
						body: { text: "" },
						createdAt: 1700000000000,
					},
				],
			}) as Response,
		);

		const messages = await client.getMessages("123");
		expect(messages).toEqual([]);
	});
});

describe("LinkedInClient.sendMessage()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should send message to existing conversation by ID", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.sendMessage("12345", "Hello!");
		const url = fetchSpy.mock.calls[0]![0] as string;
		expect(url).toContain("conversations/12345/events");
	});

	it("should start new conversation when sending to a username", async () => {
		fetchSpy.mockResolvedValue(mockFetchResponse({}) as Response);
		await client.sendMessage("johndoe", "Hello!");
		const url = fetchSpy.mock.calls[0]![0] as string;
		expect(url).toContain("messaging/conversations");
		const body = JSON.parse(
			(fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
		);
		expect(body.conversationCreate).toBeDefined();
	});
});

describe("LinkedInClient.getNotifications() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse notifications", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.notifications.NotificationCard",
						entityUrn: "urn:li:notification:123",
						headline: { text: "John liked your post" },
						subHeadline: { text: "Your post got engagement" },
						publishedAt: 1700000000000,
						read: true,
						navigationUrl: "https://linkedin.com/notifications",
					},
				],
			}) as Response,
		);

		const notifications = await client.getNotifications();
		expect(notifications).toHaveLength(1);
		expect(notifications[0]!.headline).toBe("John liked your post");
		expect(notifications[0]!.read).toBe(true);
	});

	it("should filter out notifications without headline", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.notifications.NotificationCard",
						entityUrn: "urn:li:notification:123",
					},
				],
			}) as Response,
		);

		const notifications = await client.getNotifications();
		expect(notifications).toEqual([]);
	});
});

describe("LinkedInClient.getCompany() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse company from included entities", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.organization.Company",
						entityUrn: "urn:li:company:123",
						universalName: "google",
						name: "Google",
						tagline: "Search company",
						description: "A technology company",
						companyPageUrl: "https://google.com",
						staffCount: 150000,
						headquarter: {
							city: "Mountain View",
							country: "US",
							geographicArea: "CA",
							line1: "1600 Amphitheatre",
							postalCode: "94043",
						},
						specialities: ["Search", "Cloud"],
						foundedOn: { year: 1998 },
					},
				],
			}) as Response,
		);

		const company = await client.getCompany("google");
		expect(company.name).toBe("Google");
		expect(company.universalName).toBe("google");
		expect(company.staffCount).toBe(150000);
		expect(company.headquarter!.city).toBe("Mountain View");
		expect(company.foundedYear).toBe(1998);
		expect(company.specialities).toEqual(["Search", "Cloud"]);
	});
});

describe("LinkedInClient.searchJobs() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse jobs from included entities", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.jobs.JobPosting",
						entityUrn: "urn:li:jobPosting:123",
						title: "Software Engineer",
						formattedLocation: "San Francisco, CA",
						workRemoteAllowed: true,
						applicantCount: 42,
						listedAt: 1700000000000,
					},
				],
			}) as Response,
		);

		const jobs = await client.searchJobs("engineer");
		expect(jobs).toHaveLength(1);
		expect(jobs[0]!.title).toBe("Software Engineer");
		expect(jobs[0]!.workRemoteAllowed).toBe(true);
		expect(jobs[0]!.applicantCount).toBe(42);
	});
});

describe("LinkedInClient.getJob()", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse a single job", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {
					entityUrn: "urn:li:jobPosting:123",
					title: "Senior Engineer",
					description: { text: "Build amazing things" },
					formattedLocation: "Remote",
					workRemoteAllowed: true,
					formattedExperienceLevel: "Mid-Senior",
					formattedEmploymentStatus: "Full-time",
				},
				included: [],
			}) as Response,
		);

		const job = await client.getJob("123");
		expect(job.title).toBe("Senior Engineer");
		expect(job.description).toBe("Build amazing things");
		expect(job.seniorityLevel).toBe("Mid-Senior");
		expect(job.employmentType).toBe("Full-time");
	});
});

describe("LinkedInClient.getProfileViews() parsing", () => {
	let client: LinkedInClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LinkedInClient();
		fetchSpy = vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	it("should parse profile views", async () => {
		fetchSpy.mockResolvedValue(
			mockFetchResponse({
				data: {},
				included: [
					{
						$type: "com.linkedin.voyager.identity.me.Viewer",
						viewer: {
							name: "Jane Smith",
							headline: "CEO",
							navigationUrl: "https://linkedin.com/in/janesmith",
						},
						viewedAt: 1700000000000,
						isAnonymous: false,
					},
					{
						$type: "com.linkedin.voyager.identity.me.Viewer",
						viewedAt: 1699999000000,
						isAnonymous: true,
					},
				],
			}) as Response,
		);

		const views = await client.getProfileViews();
		expect(views).toHaveLength(2);
		expect(views[0]!.viewerName).toBe("Jane Smith");
		expect(views[0]!.isAnonymous).toBe(false);
		expect(views[1]!.isAnonymous).toBe(true);
	});
});
