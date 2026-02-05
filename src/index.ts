// Library entrypoint — exports LinkedInClient and utilities for programmatic use

export { LinkedInClient } from "./lib/client.js";
export { resolveCredentials } from "./lib/auth.js";
export { getCurrentAccount, setCurrentAccount } from "./lib/account-context.js";
export {
	loadConfig,
	saveConfig,
	getAccountCredentials,
	listAccounts,
	setAccount,
	removeAccount,
	setDefaultAccount,
	migrateLegacyCredentials,
} from "./lib/config.js";
export { extractCookiesFromBrowser } from "./lib/cookie-extract.js";
export { endpoints } from "./lib/voyager-endpoints.js";
export { buildHeaders } from "./lib/headers.js";
export {
	parseLinkedInUrl,
	extractPostUrn,
	extractProfileIdentifier,
	extractCompanySlug,
	extractJobId,
} from "./utils/url-parser.js";
export { withRetry, delayBetweenRequests } from "./utils/rate-limit.js";
export { buildPaginationParams, hasNextPage, nextPageStart } from "./lib/pagination.js";

// Re-export all types
export type {
	AccountConfig,
	AuthOptions,
	CookieSet,
	CookieSource,
	Profile,
	Experience,
	Education,
	DateInfo,
	ContactInfo,
	PhoneNumber,
	Website,
	FeedUpdate,
	ReactionType,
	ReactionCount,
	PostOptions,
	PostResult,
	CommentResult,
	SearchType,
	SearchResult,
	SearchItem,
	Connection,
	Invitation,
	Conversation,
	ConversationParticipant,
	Message,
	Notification,
	Company,
	CompanyLocation,
	Job,
	ProfileView,
	NetworkStats,
	PagingInfo,
	PaginationOptions,
	OutputMode,
	LinkedConfig,
	VoyagerResponse,
	VoyagerIncluded,
	VoyagerEntity,
} from "./lib/types.js";

// Re-export error types
export {
	LinkedInError,
	AuthenticationError,
	RateLimitError,
	ChallengeError,
	NotFoundError,
	CookieExtractionError,
} from "./lib/errors.js";

// Re-export formatters
export {
	formatProfile,
	formatContactInfo,
	formatFeedUpdate,
	formatFeedUpdates,
	formatSearchResults,
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
} from "./lib/formatters.js";
