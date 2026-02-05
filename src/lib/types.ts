// ── Cookie / Auth Types ──

export interface CookieSet {
	li_at: string;
	jsessionid: string;
}

export type CookieSource = "safari" | "chrome" | "firefox" | "env" | "config";

export interface AuthOptions {
	cookies?: CookieSet;
	cookieSource?: CookieSource;
	account?: string;
}

// ── Account Types ──

export interface AccountConfig {
	li_at?: string;
	jsessionid?: string;
	cookieSource?: CookieSource;
}

// ── LinkedIn Entity Types ──

export interface Profile {
	publicIdentifier: string;
	firstName: string;
	lastName: string;
	headline: string;
	summary: string;
	industryName: string;
	locationName: string;
	geoCountryName: string;
	profilePictureUrl: string;
	backgroundPictureUrl: string;
	connectionCount: number;
	followerCount: number;
	entityUrn: string;
	profileUrl: string;
	experience: Experience[];
	education: Education[];
}

export interface Experience {
	title: string;
	companyName: string;
	companyUrn: string;
	locationName: string;
	description: string;
	startDate: DateInfo;
	endDate: DateInfo | null;
	current: boolean;
}

export interface Education {
	schoolName: string;
	degreeName: string;
	fieldOfStudy: string;
	startDate: DateInfo;
	endDate: DateInfo | null;
}

export interface DateInfo {
	year: number;
	month?: number;
}

export interface ContactInfo {
	emailAddress: string | null;
	phoneNumbers: PhoneNumber[];
	websites: Website[];
	twitterHandles: string[];
	address: string | null;
	birthDay: DateInfo | null;
}

export interface PhoneNumber {
	number: string;
	type: string;
}

export interface Website {
	url: string;
	type: string;
	label: string;
}

// ── Feed Types ──

export interface FeedUpdate {
	urn: string;
	authorUrn: string;
	authorName: string;
	authorHeadline: string;
	authorProfileUrl: string;
	text: string;
	commentary: string;
	numLikes: number;
	numComments: number;
	numShares: number;
	createdAt: number;
	reactionTypeCounts: ReactionCount[];
	postUrl: string;
}

export interface ReactionCount {
	type: ReactionType;
	count: number;
}

export type ReactionType = "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "FUNNY";

export interface PostOptions {
	visibility?: "PUBLIC" | "CONNECTIONS";
	mediaUrns?: string[];
}

export interface PostResult {
	urn: string;
	url: string;
}

export interface CommentResult {
	urn: string;
}

// ── Search Types ──

export type SearchType = "people" | "posts" | "companies" | "jobs" | "groups";

export interface SearchResult {
	type: SearchType;
	total: number;
	items: SearchItem[];
	paging: PagingInfo;
}

export interface SearchItem {
	type: SearchType;
	title: string;
	subtitle: string;
	url: string;
	urn: string;
	imageUrl: string;
	snippets: string[];
}

// ── Connection Types ──

export interface Connection {
	publicIdentifier: string;
	firstName: string;
	lastName: string;
	headline: string;
	profilePictureUrl: string;
	entityUrn: string;
	createdAt: number;
	profileUrl: string;
}

export interface Invitation {
	id: string;
	entityUrn: string;
	senderName: string;
	senderHeadline: string;
	senderProfileUrl: string;
	message: string;
	sentTime: number;
	invitationType: string;
}

// ── Messaging Types ──

export interface Conversation {
	conversationId: string;
	entityUrn: string;
	lastActivityAt: number;
	read: boolean;
	participants: ConversationParticipant[];
	lastMessage: Message | null;
}

export interface ConversationParticipant {
	publicIdentifier: string;
	firstName: string;
	lastName: string;
	headline: string;
	profilePictureUrl: string;
}

export interface Message {
	messageId: string;
	entityUrn: string;
	senderName: string;
	senderUrn: string;
	text: string;
	createdAt: number;
	conversationId: string;
}

// ── Notification Types ──

export interface Notification {
	id: string;
	entityUrn: string;
	headline: string;
	subHeadline: string;
	additionalContent: string;
	createdAt: number;
	read: boolean;
	actionUrl: string;
}

// ── Company Types ──

export interface Company {
	entityUrn: string;
	universalName: string;
	name: string;
	tagline: string;
	description: string;
	website: string;
	industryName: string;
	staffCount: number;
	staffCountRange: string;
	headquarter: CompanyLocation | null;
	specialities: string[];
	logoUrl: string;
	coverImageUrl: string;
	foundedYear: number | null;
	companyUrl: string;
}

export interface CompanyLocation {
	city: string;
	country: string;
	geographicArea: string;
	line1: string;
	postalCode: string;
}

// ── Job Types ──

export interface Job {
	id: string;
	entityUrn: string;
	title: string;
	companyName: string;
	companyUrl: string;
	locationName: string;
	description: string;
	listedAt: number;
	expireAt: number;
	workRemoteAllowed: boolean;
	applicantCount: number;
	seniorityLevel: string;
	employmentType: string;
	jobFunctions: string[];
	industries: string[];
	jobUrl: string;
}

// ── Analytics Types ──

export interface ProfileView {
	viewerName: string;
	viewerHeadline: string;
	viewerProfileUrl: string;
	viewedAt: number;
	isAnonymous: boolean;
}

export interface NetworkStats {
	connectionCount: number;
	followerCount: number;
	profileViewCount: number;
	searchAppearances: number;
	postImpressions: number;
}

// ── Pagination ──

export interface PagingInfo {
	start: number;
	count: number;
	total: number;
}

export interface PaginationOptions {
	start?: number;
	count?: number;
}

// ── Output Mode ──

export type OutputMode = "human" | "json" | "json-full" | "plain";

// ── Config ──

export interface LinkedConfig {
	li_at?: string;
	jsessionid?: string;
	cookieSource?: CookieSource;
	timeoutMs?: number;
	defaultCount?: number;
	delayMs?: number;
	accounts?: Record<string, AccountConfig>;
	defaultAccount?: string;
}

// ── API Response wrappers ──

// biome-ignore lint/suspicious/noExplicitAny: Voyager API responses are dynamic
export interface VoyagerResponse<T = any> {
	data: T;
	included: VoyagerIncluded[];
	paging?: PagingInfo;
}

// biome-ignore lint/suspicious/noExplicitAny: Voyager API responses have deeply nested dynamic structures
export type VoyagerEntity = Record<string, any>;

export interface VoyagerIncluded extends VoyagerEntity {
	$type: string;
	entityUrn: string;
}
