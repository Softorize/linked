import { withRetry } from "../utils/rate-limit.js";
import { resolveCredentials } from "./auth.js";
import { loadConfig } from "./config.js";
import {
	AuthenticationError,
	ChallengeError,
	LinkedInError,
	NotFoundError,
	RateLimitError,
} from "./errors.js";
import { buildHeaders } from "./headers.js";
import { buildPaginationParams } from "./pagination.js";
import type {
	AuthOptions,
	CommentResult,
	Company,
	Connection,
	ContactInfo,
	Conversation,
	ConversationParticipant,
	CookieSet,
	FeedUpdate,
	Invitation,
	Job,
	Message,
	NetworkStats,
	Notification,
	PaginationOptions,
	PostOptions,
	PostResult,
	Profile,
	ProfileView,
	ReactionType,
	SearchItem,
	SearchResult,
	SearchType,
	VoyagerEntity,
	VoyagerResponse,
} from "./types.js";
import { endpoints } from "./voyager-endpoints.js";

// biome-ignore lint/suspicious/noExplicitAny: Voyager API responses have dynamic structures
type AnyRecord = Record<string, any>;

export class LinkedInClient {
	private cookies: CookieSet;
	private headers: Record<string, string>;
	private timeoutMs: number;
	private delayMs: number;

	constructor(options?: AuthOptions & { timeoutMs?: number; delayMs?: number }) {
		this.cookies = resolveCredentials(options);
		this.headers = buildHeaders(this.cookies);
		const config = loadConfig();
		this.timeoutMs = options?.timeoutMs ?? config.timeoutMs ?? 30000;
		this.delayMs = options?.delayMs ?? config.delayMs ?? 0;
	}

	// ── HTTP helpers ──

	private async request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
		if (this.delayMs > 0) {
			const jitter = Math.floor(Math.random() * this.delayMs);
			await new Promise((resolve) => setTimeout(resolve, this.delayMs + jitter));
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await fetch(url, {
				...init,
				headers: { ...this.headers, ...(init?.headers as Record<string, string>) },
				signal: controller.signal,
			});

			if (response.status === 401) throw new AuthenticationError();
			if (response.status === 403) {
				const text = await response.text();
				if (text.includes("challenge") || text.includes("captcha")) {
					throw new ChallengeError();
				}
				throw new AuthenticationError("Access forbidden. Your session may be restricted.");
			}
			if (response.status === 404) throw new NotFoundError("Resource");
			if (response.status === 429) {
				const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "60", 10);
				throw new RateLimitError(retryAfter);
			}
			if (!response.ok) {
				throw new LinkedInError(
					`LinkedIn API error: ${response.status} ${response.statusText}`,
					response.status,
					url,
				);
			}

			const contentType = response.headers.get("content-type") ?? "";
			if (contentType.includes("json")) {
				return (await response.json()) as T;
			}
			return (await response.text()) as unknown as T;
		} finally {
			clearTimeout(timeout);
		}
	}

	private async get<T = unknown>(url: string, params?: URLSearchParams): Promise<T> {
		const fullUrl = params ? `${url}?${params.toString()}` : url;
		return withRetry(() => this.request<T>(fullUrl));
	}

	private async post<T = unknown>(url: string, body?: unknown): Promise<T> {
		return withRetry(() =>
			this.request<T>(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: body ? JSON.stringify(body) : undefined,
			}),
		);
	}

	private async put<T = unknown>(url: string, body?: unknown): Promise<T> {
		return withRetry(() =>
			this.request<T>(url, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: body ? JSON.stringify(body) : undefined,
			}),
		);
	}

	private async delete(url: string): Promise<void> {
		await withRetry(() => this.request<void>(url, { method: "DELETE" }));
	}

	private async patch<T = unknown>(url: string, body?: unknown): Promise<T> {
		return withRetry(() =>
			this.request<T>(url, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: body ? JSON.stringify(body) : undefined,
			}),
		);
	}

	// ── Helper: extract included entities ──

	private findIncluded(response: VoyagerResponse, type: string): VoyagerEntity[] {
		return (response.included ?? []).filter(
			(item) =>
				(item.$type as string)?.includes(type) || (item.entityUrn as string)?.includes(type),
		) as VoyagerEntity[];
	}

	// ── Profile ──

	async getMe(): Promise<Profile> {
		const data = await this.get<VoyagerResponse>(endpoints.me());
		return this.parseProfile(data);
	}

	async getProfile(identifier: string): Promise<Profile> {
		const data = await this.get<VoyagerResponse>(endpoints.profileView(identifier));
		return this.parseProfile(data);
	}

	async getProfileContactInfo(identifier: string): Promise<ContactInfo> {
		const data = await this.get<VoyagerResponse>(endpoints.profileContactInfo(identifier));
		return this.parseContactInfo(data);
	}

	// ── Feed ──

	async getFeed(options?: PaginationOptions): Promise<FeedUpdate[]> {
		const params = buildPaginationParams(options);
		const data = await this.get<VoyagerResponse>(endpoints.feedUpdates(), params);
		return this.parseFeedUpdates(data);
	}

	async getPost(urn: string): Promise<FeedUpdate> {
		const data = await this.get<VoyagerResponse>(endpoints.feedUpdate(urn));
		const updates = this.parseFeedUpdates(data);
		if (updates.length === 0) throw new NotFoundError("Post");
		return updates[0]!;
	}

	// ── Create Content ──

	async createPost(text: string, options?: PostOptions): Promise<PostResult> {
		const visibility = options?.visibility ?? "PUBLIC";
		const body = {
			visibleToConnectionsOnly: visibility === "CONNECTIONS",
			externalAudienceProviders: [],
			commentaryV2: {
				text,
				attributes: [],
			},
			origin: "FEED",
			allowedCommentersScope: "ALL",
			postState: "PUBLISHED",
		};

		const data = await this.post<{ value?: { urn?: string } }>(endpoints.createPost(), body);
		const urn = data?.value?.urn ?? "unknown";

		return {
			urn,
			url: `https://www.linkedin.com/feed/update/${urn}`,
		};
	}

	async comment(postUrn: string, text: string): Promise<CommentResult> {
		const body = {
			actor: "",
			object: postUrn,
			message: {
				attributes: [],
				text,
			},
		};

		const data = await this.post<{ value?: { urn?: string } }>(
			endpoints.postComments(postUrn),
			body,
		);

		return { urn: data?.value?.urn ?? "unknown" };
	}

	async react(postUrn: string, type: ReactionType = "LIKE"): Promise<void> {
		const body = {
			reactionType: type,
		};
		await this.post(endpoints.postLikes(postUrn), body);
	}

	async unreact(postUrn: string): Promise<void> {
		await this.delete(endpoints.postLikes(postUrn));
	}

	// ── Search ──

	async search(
		query: string,
		type?: SearchType,
		options?: PaginationOptions,
	): Promise<SearchResult> {
		const params = buildPaginationParams(options);
		params.set("q", "all");
		params.set("keywords", query);
		params.set("queryContext", "List(spellCorrectionEnabled->true,relatedSearchesEnabled->true)");

		if (type) {
			const filterMap: Record<SearchType, string> = {
				people: "PEOPLE",
				posts: "CONTENT",
				companies: "COMPANIES",
				jobs: "JOBS",
				groups: "GROUPS",
			};
			params.set("filters", `List(resultType->${filterMap[type]})`);
		}

		const data = await this.get<VoyagerResponse>(endpoints.searchClusters(), params);

		return this.parseSearchResults(data, type ?? "people");
	}

	// ── Connections ──

	async getConnections(options?: PaginationOptions): Promise<Connection[]> {
		const params = buildPaginationParams(options);
		params.set("q", "search");
		params.set("sortType", "RECENTLY_ADDED");

		const data = await this.get<VoyagerResponse>(endpoints.connections(), params);

		return this.parseConnections(data);
	}

	async sendConnectionRequest(identifier: string, message?: string): Promise<void> {
		const body: AnyRecord = {
			inviteeProfileUrn: `urn:li:fsd_profile:${identifier}`,
			trackingId: this.generateTrackingId(),
		};
		if (message) {
			body.message = message;
		}
		await this.post(endpoints.memberRelationships(), body);
	}

	async withdrawConnectionRequest(identifier: string): Promise<void> {
		await this.delete(endpoints.memberRelationship(`urn:li:fsd_profile:${identifier}`));
	}

	async getInvitations(sent = false, options?: PaginationOptions): Promise<Invitation[]> {
		const params = buildPaginationParams(options);
		const endpoint = sent ? endpoints.sentInvitations() : endpoints.receivedInvitations();

		const data = await this.get<VoyagerResponse>(endpoint, params);
		return this.parseInvitations(data);
	}

	async respondToInvitation(id: string, accept: boolean): Promise<void> {
		const body = {
			action: accept ? "ACCEPT" : "IGNORE",
		};
		await this.put(endpoints.invitation(id), body);
	}

	// ── Messaging ──

	async getConversations(options?: PaginationOptions): Promise<Conversation[]> {
		const params = buildPaginationParams(options);
		params.set("q", "search");

		const data = await this.get<VoyagerResponse>(endpoints.conversations(), params);

		return this.parseConversations(data);
	}

	async getMessages(conversationId: string, options?: PaginationOptions): Promise<Message[]> {
		const params = buildPaginationParams(options);

		const data = await this.get<VoyagerResponse>(
			endpoints.conversationEvents(conversationId),
			params,
		);

		return this.parseMessages(data, conversationId);
	}

	async sendMessage(recipientOrConversation: string, text: string): Promise<void> {
		// If it looks like a conversation ID, send to existing conversation
		if (recipientOrConversation.includes(",") || /^\d+$/.test(recipientOrConversation)) {
			await this.post(endpoints.conversationEvents(recipientOrConversation), {
				eventCreate: {
					value: {
						"com.linkedin.voyager.messaging.create.MessageCreate": {
							attributedBody: { text, attributes: [] },
							attachments: [],
						},
					},
				},
			});
		} else {
			// Start new conversation with a user
			const body = {
				conversationCreate: {
					recipients: [`urn:li:fsd_profile:${recipientOrConversation}`],
					eventCreate: {
						value: {
							"com.linkedin.voyager.messaging.create.MessageCreate": {
								attributedBody: { text, attributes: [] },
								attachments: [],
							},
						},
					},
					subtype: "MEMBER_TO_MEMBER",
				},
			};
			await this.post(endpoints.conversations(), body);
		}
	}

	// ── Notifications ──

	async getNotifications(options?: PaginationOptions): Promise<Notification[]> {
		const params = buildPaginationParams(options);
		const data = await this.get<VoyagerResponse>(endpoints.notifications(), params);
		return this.parseNotifications(data);
	}

	// ── Companies ──

	async getCompany(identifier: string): Promise<Company> {
		const data = await this.get<VoyagerResponse>(endpoints.companyBySlug(identifier));
		return this.parseCompany(data);
	}

	// ── Jobs ──

	async searchJobs(query: string, options?: PaginationOptions): Promise<Job[]> {
		const params = buildPaginationParams(options);
		params.set("q", "search");
		params.set("keywords", query);

		const data = await this.get<VoyagerResponse>(endpoints.jobCards(), params);

		return this.parseJobs(data);
	}

	async getJob(id: string): Promise<Job> {
		const data = await this.get<VoyagerResponse>(endpoints.jobPosting(id));
		return this.parseSingleJob(data);
	}

	// ── Analytics ──

	async getProfileViews(): Promise<ProfileView[]> {
		const data = await this.get<VoyagerResponse>(endpoints.profileViews());
		return this.parseProfileViews(data);
	}

	async getNetworkStats(): Promise<NetworkStats> {
		const me = await this.getMe();
		const stats = await this.get<VoyagerResponse>(endpoints.profileStatistics());
		return {
			connectionCount: me.connectionCount,
			followerCount: me.followerCount,
			profileViewCount: this.extractNumber(stats, "numProfileViews"),
			searchAppearances: this.extractNumber(stats, "numSearchAppearances"),
			postImpressions: this.extractNumber(stats, "numImpressions"),
		};
	}

	// ── Response Parsers ──

	private parseProfile(data: VoyagerResponse): Profile {
		const d = data.data as AnyRecord;
		const included = data.included ?? [];

		// Find the miniProfile or profile entity
		const profileEntity =
			included.find(
				(item) =>
					item.$type?.toString().includes("Profile") ||
					item.$type?.toString().includes("MiniProfile"),
			) ?? d;

		const p = (profileEntity ?? d) as AnyRecord;

		return {
			publicIdentifier: str(
				p.publicIdentifier ?? p.miniProfile?.publicIdentifier ?? d.publicIdentifier,
			),
			firstName: str(p.firstName ?? d.firstName),
			lastName: str(p.lastName ?? d.lastName),
			headline: str(p.headline ?? d.headline),
			summary: str(p.summary ?? d.summary),
			industryName: str(p.industryName ?? d.industryName),
			locationName: str(p.locationName ?? d.locationName ?? p.geoLocationName),
			geoCountryName: str(p.geoCountryName ?? d.geoCountryName),
			profilePictureUrl: this.extractImageUrl(p.profilePicture ?? p.picture ?? d.profilePicture),
			backgroundPictureUrl: this.extractImageUrl(p.backgroundImage ?? d.backgroundImage),
			connectionCount: num(p.connectionCount ?? d.connectionCount),
			followerCount: num(p.followerCount ?? d.followerCount),
			entityUrn: str(p.entityUrn ?? d.entityUrn),
			profileUrl: `https://www.linkedin.com/in/${str(p.publicIdentifier ?? d.publicIdentifier)}`,
			experience: this.parseExperience(included),
			education: this.parseEducation(included),
		};
	}

	private parseExperience(included: VoyagerEntity[]): Profile["experience"] {
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("Position") ||
					item.$type?.toString().includes("position"),
			)
			.map((item) => ({
				title: str(item.title),
				companyName: str(item.companyName ?? item.company?.name),
				companyUrn: str(item.companyUrn),
				locationName: str(item.locationName),
				description: str(item.description),
				startDate: this.parseDate(item.timePeriod?.startDate ?? item.startDate),
				endDate:
					item.timePeriod?.endDate || item.endDate
						? this.parseDate(item.timePeriod?.endDate ?? item.endDate)
						: null,
				current: !item.timePeriod?.endDate && !item.endDate,
			}));
	}

	private parseEducation(included: VoyagerEntity[]): Profile["education"] {
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("Education") ||
					item.$type?.toString().includes("education"),
			)
			.map((item) => ({
				schoolName: str(item.schoolName ?? item.school?.name),
				degreeName: str(item.degreeName),
				fieldOfStudy: str(item.fieldOfStudy),
				startDate: this.parseDate(item.timePeriod?.startDate ?? item.startDate),
				endDate:
					item.timePeriod?.endDate || item.endDate
						? this.parseDate(item.timePeriod?.endDate ?? item.endDate)
						: null,
			}));
	}

	private parseDate(d: unknown): { year: number; month?: number } {
		if (!d || typeof d !== "object") return { year: 0 };
		const obj = d as AnyRecord;
		return {
			year: num(obj.year),
			month: obj.month != null ? num(obj.month) : undefined,
		};
	}

	private parseContactInfo(data: VoyagerResponse): ContactInfo {
		const d = data.data as AnyRecord;
		return {
			emailAddress: d.emailAddress ? str(d.emailAddress) : null,
			phoneNumbers: Array.isArray(d.phoneNumbers)
				? d.phoneNumbers.map((p: AnyRecord) => ({
						number: str(p.number),
						type: str(p.type),
					}))
				: [],
			websites: Array.isArray(d.websites)
				? d.websites.map((w: AnyRecord) => ({
						url: str(w.url),
						type: str(w.type ?? w.category),
						label: str(w.label ?? w.type ?? w.category),
					}))
				: [],
			twitterHandles: Array.isArray(d.twitterHandles)
				? d.twitterHandles.map((h: AnyRecord) => str(h.name))
				: [],
			address: d.address ? str(d.address) : null,
			birthDay: d.birthDay ? this.parseDate(d.birthDay) : null,
		};
	}

	private parseFeedUpdates(data: VoyagerResponse): FeedUpdate[] {
		const included = data.included ?? [];
		const updates: FeedUpdate[] = [];

		for (const item of included) {
			if (
				!item.$type?.toString().includes("Update") &&
				!item.entityUrn?.toString().includes("update")
			) {
				continue;
			}

			const actorObj = item.actor as AnyRecord | undefined;
			const socialDetail = item.socialDetail as AnyRecord | undefined;
			const commentary = item.commentary as AnyRecord | undefined;

			const urn = str(item.entityUrn ?? item.urn);
			if (!urn) continue;

			updates.push({
				urn,
				authorUrn: str(actorObj?.urn ?? actorObj?.entityUrn),
				authorName: str(actorObj?.name?.text ?? actorObj?.name),
				authorHeadline: str(actorObj?.description?.text ?? actorObj?.description),
				authorProfileUrl: str(actorObj?.navigationUrl),
				text: str(commentary?.text?.text ?? commentary?.text),
				commentary: str(commentary?.text?.text ?? commentary?.text),
				numLikes: num(socialDetail?.totalSocialActivityCounts?.numLikes ?? socialDetail?.likes),
				numComments: num(
					socialDetail?.totalSocialActivityCounts?.numComments ?? socialDetail?.comments,
				),
				numShares: num(socialDetail?.totalSocialActivityCounts?.numShares ?? socialDetail?.shares),
				createdAt: num(item.createdTime ?? item.publishedAt),
				reactionTypeCounts: [],
				postUrl: `https://www.linkedin.com/feed/update/${urn}`,
			});
		}

		return updates;
	}

	private parseSearchResults(data: VoyagerResponse, type: SearchType): SearchResult {
		const included = data.included ?? [];
		const items: SearchItem[] = [];

		for (const item of included) {
			const title = str(item.title?.text ?? item.title ?? item.name);
			if (!title) continue;

			items.push({
				type,
				title,
				subtitle: str(item.primarySubtitle?.text ?? item.headline ?? item.subtitle?.text),
				url: str(item.navigationUrl ?? item.url),
				urn: str(item.entityUrn ?? item.targetUrn),
				imageUrl: this.extractImageUrl(item.image),
				snippets: Array.isArray(item.summary?.textItems)
					? item.summary.textItems.map((t: AnyRecord) => str(t.text))
					: item.summary?.text
						? [str(item.summary.text)]
						: [],
			});
		}

		return {
			type,
			total: data.paging?.total ?? items.length,
			items,
			paging: data.paging ?? {
				start: 0,
				count: items.length,
				total: items.length,
			},
		};
	}

	private parseConnections(data: VoyagerResponse): Connection[] {
		const included = data.included ?? [];
		return included
			.filter((item) => item.$type?.toString().includes("MiniProfile") || item.publicIdentifier)
			.map((item) => ({
				publicIdentifier: str(item.publicIdentifier),
				firstName: str(item.firstName),
				lastName: str(item.lastName),
				headline: str(item.occupation ?? item.headline),
				profilePictureUrl: this.extractImageUrl(item.picture),
				entityUrn: str(item.entityUrn),
				createdAt: num(item.createdAt),
				profileUrl: `https://www.linkedin.com/in/${str(item.publicIdentifier)}`,
			}))
			.filter((c) => c.publicIdentifier);
	}

	private parseInvitations(data: VoyagerResponse): Invitation[] {
		const included = data.included ?? [];
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("Invitation") ||
					item.entityUrn?.toString().includes("invitation"),
			)
			.map((item) => {
				const fromMember = item.fromMember as AnyRecord | undefined;
				return {
					id: str(item.id ?? this.extractIdFromUrn(str(item.entityUrn))),
					entityUrn: str(item.entityUrn),
					senderName: str(
						fromMember
							? `${fromMember.firstName ?? ""} ${fromMember.lastName ?? ""}`.trim()
							: item.senderName,
					),
					senderHeadline: str(fromMember?.occupation ?? item.senderHeadline),
					senderProfileUrl: fromMember?.publicIdentifier
						? `https://www.linkedin.com/in/${fromMember.publicIdentifier}`
						: "",
					message: str(item.message),
					sentTime: num(item.sentTime),
					invitationType: str(item.invitationType),
				};
			})
			.filter((i) => i.entityUrn);
	}

	private parseConversations(data: VoyagerResponse): Conversation[] {
		const included = data.included ?? [];
		const conversations: Conversation[] = [];

		const convEntities = included.filter(
			(item) =>
				item.$type?.toString().includes("Conversation") ||
				item.entityUrn?.toString().includes("conversation"),
		);

		const miniProfiles = new Map<string, ConversationParticipant>();
		for (const item of included) {
			if (
				item.$type?.toString().includes("MiniProfile") ||
				(item.publicIdentifier && item.firstName)
			) {
				miniProfiles.set(str(item.entityUrn), {
					publicIdentifier: str(item.publicIdentifier),
					firstName: str(item.firstName),
					lastName: str(item.lastName),
					headline: str(item.occupation ?? item.headline),
					profilePictureUrl: this.extractImageUrl(item.picture),
				});
			}
		}

		for (const conv of convEntities) {
			const conversationId = str(conv.entityUrn).split(":").pop() ?? "";
			if (!conversationId) continue;

			const participantUrns = Array.isArray(conv.participants)
				? conv.participants.map((p: unknown) => {
						if (typeof p === "string") return p;
						if (typeof p === "object" && p !== null) {
							return str((p as AnyRecord).entityUrn ?? (p as AnyRecord)["*miniProfile"]);
						}
						return "";
					})
				: [];

			const participants: ConversationParticipant[] = participantUrns
				.map((urn: string) => miniProfiles.get(urn))
				.filter((p): p is ConversationParticipant => p != null);

			conversations.push({
				conversationId,
				entityUrn: str(conv.entityUrn),
				lastActivityAt: num(conv.lastActivityAt),
				read: Boolean(conv.read),
				participants,
				lastMessage: null,
			});
		}

		return conversations;
	}

	private parseMessages(data: VoyagerResponse, conversationId: string): Message[] {
		const included = data.included ?? [];
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("MessageEvent") ||
					item.$type?.toString().includes("Event") ||
					item.body?.text,
			)
			.map((item) => {
				const from = item.from as AnyRecord | undefined;
				const participant = from?.miniProfile as AnyRecord | undefined;
				return {
					messageId: str(item.entityUrn).split(":").pop() ?? "",
					entityUrn: str(item.entityUrn),
					senderName: participant
						? `${participant.firstName ?? ""} ${participant.lastName ?? ""}`.trim()
						: str(item.senderName),
					senderUrn: str(from?.entityUrn ?? participant?.entityUrn),
					text: str(item.body?.text ?? item.eventContent?.attributedBody?.text ?? item.body),
					createdAt: num(item.createdAt),
					conversationId,
				};
			})
			.filter((m) => m.text);
	}

	private parseNotifications(data: VoyagerResponse): Notification[] {
		const included = data.included ?? [];
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("Notification") ||
					item.$type?.toString().includes("Card"),
			)
			.map((item) => ({
				id: str(item.entityUrn).split(":").pop() ?? "",
				entityUrn: str(item.entityUrn),
				headline: str(item.headline?.text ?? item.headline),
				subHeadline: str(item.subHeadline?.text ?? item.subHeadline),
				additionalContent: str(item.additionalContent?.text ?? item.additionalContent),
				createdAt: num(item.publishedAt ?? item.createdAt),
				read: Boolean(item.read),
				actionUrl: str(item.navigationUrl ?? item.actionUrl),
			}))
			.filter((n) => n.headline);
	}

	private parseCompany(data: VoyagerResponse): Company {
		const included = data.included ?? [];
		const d = (data.data as AnyRecord) ?? {};

		const entity =
			included.find(
				(item) =>
					item.$type?.toString().includes("Company") ||
					item.$type?.toString().includes("Organization"),
			) ?? d;

		const e = entity as AnyRecord;
		const hq = e.headquarter as AnyRecord | undefined;

		return {
			entityUrn: str(e.entityUrn),
			universalName: str(e.universalName),
			name: str(e.name),
			tagline: str(e.tagline),
			description: str(e.description),
			website: str(e.companyPageUrl ?? e.website),
			industryName: str(e.companyIndustries?.[0]?.localizedName ?? e.industryName),
			staffCount: num(e.staffCount),
			staffCountRange: str(
				e.staffCountRange?.start
					? `${e.staffCountRange.start}-${e.staffCountRange.end}`
					: e.staffCountRange,
			),
			headquarter: hq
				? {
						city: str(hq.city),
						country: str(hq.country),
						geographicArea: str(hq.geographicArea),
						line1: str(hq.line1),
						postalCode: str(hq.postalCode),
					}
				: null,
			specialities: Array.isArray(e.specialities) ? e.specialities.map(String) : [],
			logoUrl: this.extractImageUrl(e.logo),
			coverImageUrl: this.extractImageUrl(e.backgroundCoverImage),
			foundedYear: e.foundedOn ? num((e.foundedOn as AnyRecord).year) : null,
			companyUrl: `https://www.linkedin.com/company/${str(e.universalName)}`,
		};
	}

	private parseJobs(data: VoyagerResponse): Job[] {
		const included = data.included ?? [];
		return included
			.filter((item) => item.$type?.toString().includes("Job") || item.title)
			.map((item) => this.mapJobEntity(item as AnyRecord))
			.filter((j) => j.title);
	}

	private parseSingleJob(data: VoyagerResponse): Job {
		const d = data.data as AnyRecord;
		return this.mapJobEntity(d);
	}

	private mapJobEntity(item: AnyRecord): Job {
		return {
			id: str(item.entityUrn).split(":").pop() ?? str(item.id),
			entityUrn: str(item.entityUrn),
			title: str(item.title),
			companyName: str(item.companyDetails?.company?.name ?? item.companyName),
			companyUrl: str(item.companyDetails?.company?.url),
			locationName: str(item.formattedLocation ?? item.locationName),
			description: str(item.description?.text ?? item.description),
			listedAt: num(item.listedAt),
			expireAt: num(item.expireAt),
			workRemoteAllowed: Boolean(item.workRemoteAllowed),
			applicantCount: num(item.applicantCount),
			seniorityLevel: str(item.formattedExperienceLevel),
			employmentType: str(item.formattedEmploymentStatus ?? item.employmentType),
			jobFunctions: Array.isArray(item.jobFunctions) ? item.jobFunctions.map(String) : [],
			industries: Array.isArray(item.industries) ? item.industries.map(String) : [],
			jobUrl: `https://www.linkedin.com/jobs/view/${str(item.entityUrn).split(":").pop() ?? str(item.id)}`,
		};
	}

	private parseProfileViews(data: VoyagerResponse): ProfileView[] {
		const included = data.included ?? [];
		return included
			.filter(
				(item) =>
					item.$type?.toString().includes("Viewer") || item.$type?.toString().includes("WvmpCard"),
			)
			.map((item) => {
				const viewer = item.viewer as AnyRecord | undefined;
				return {
					viewerName: str(viewer?.name ?? item.name),
					viewerHeadline: str(viewer?.headline ?? item.headline),
					viewerProfileUrl: str(viewer?.navigationUrl ?? item.navigationUrl),
					viewedAt: num(item.viewedAt ?? item.createdAt),
					isAnonymous: Boolean(item.isAnonymous ?? !viewer),
				};
			});
	}

	// ── Utility Methods ──

	private extractImageUrl(imageData: unknown): string {
		if (!imageData) return "";
		if (typeof imageData === "string") return imageData;
		if (typeof imageData !== "object") return "";

		const obj = imageData as AnyRecord;

		// rootUrl + artifacts pattern
		if (obj.rootUrl && Array.isArray(obj.artifacts)) {
			const largest = obj.artifacts.at(-1) as AnyRecord | undefined;
			if (largest?.fileIdentifyingUrlPathSegment) {
				return `${obj.rootUrl}${largest.fileIdentifyingUrlPathSegment}`;
			}
		}

		// displayImageReference pattern
		if (obj.displayImageReference?.vectorImage) {
			return this.extractImageUrl(obj.displayImageReference.vectorImage);
		}

		// com.linkedin.common.VectorImage pattern
		const vectorImage = obj["com.linkedin.common.VectorImage"] as AnyRecord | undefined;
		if (vectorImage) {
			return this.extractImageUrl(vectorImage);
		}

		return "";
	}

	private extractNumber(data: VoyagerResponse, field: string): number {
		const d = data.data as AnyRecord;
		return num(d[field]);
	}

	private extractIdFromUrn(urn: string): string {
		return urn.split(":").pop() ?? urn;
	}

	private generateTrackingId(): string {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		return Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}
}

// ── Helper functions ──

function str(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (typeof value === "object" && "text" in (value as AnyRecord)) {
		return str((value as AnyRecord).text);
	}
	return String(value);
}

function num(value: unknown): number {
	if (value == null) return 0;
	const n = Number(value);
	return Number.isNaN(n) ? 0 : n;
}
