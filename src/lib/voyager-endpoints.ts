const BASE = "https://www.linkedin.com/voyager/api";

export const endpoints = {
	// Identity & Profile
	me: () => `${BASE}/me`,
	profileView: (id: string) => `${BASE}/identity/profiles/${id}/profileView`,
	profileContactInfo: (id: string) =>
		`${BASE}/identity/profiles/${id}/profileContactInfo`,
	profileNetworkInfo: (id: string) =>
		`${BASE}/identity/profiles/${id}/networkinfo`,
	profileSkills: (id: string) =>
		`${BASE}/identity/profiles/${id}/skillPage`,

	// Feed & Posts
	feedUpdates: () => `${BASE}/feed/updates`,
	feedUpdate: (urn: string) => `${BASE}/feed/updates/${encodeURIComponent(urn)}`,
	createPost: () => `${BASE}/contentcreation/normShares`,
	postComments: (urn: string) =>
		`${BASE}/feed/updates/${encodeURIComponent(urn)}/social-actions/comments`,
	postLikes: (urn: string) =>
		`${BASE}/feed/updates/${encodeURIComponent(urn)}/social-actions/likes`,
	reactions: () => `${BASE}/voyagerSocialDashReactions`,

	// Search
	searchClusters: () => `${BASE}/search/dash/clusters`,
	searchBlended: () => `${BASE}/search/blended`,
	typeahead: () => `${BASE}/typeahead/hitsV2`,

	// Connections & Network
	connections: () => `${BASE}/relationships/dash/connections`,
	memberRelationships: () =>
		`${BASE}/voyagerRelationshipsDashMemberRelationships`,
	memberRelationship: (id: string) =>
		`${BASE}/voyagerRelationshipsDashMemberRelationships/${encodeURIComponent(id)}`,
	sentInvitations: () => `${BASE}/relationships/sentInvitationViewsV2`,
	receivedInvitations: () =>
		`${BASE}/relationships/receivedInvitationViewsV2`,
	invitation: (id: string) => `${BASE}/relationships/invitations/${id}`,

	// Messaging
	conversations: () => `${BASE}/messaging/conversations`,
	conversation: (id: string) => `${BASE}/messaging/conversations/${id}`,
	conversationEvents: (id: string) =>
		`${BASE}/messaging/conversations/${id}/events`,

	// Notifications
	notifications: () =>
		`${BASE}/voyagerNotificationsDashNotificationCards`,

	// Companies
	companyBySlug: (slug: string) =>
		`${BASE}/organization/companies?q=universalName&universalName=${encodeURIComponent(slug)}`,
	companyById: (id: string) =>
		`${BASE}/voyagerOrganizationDashCompanies/${id}`,

	// Jobs
	jobCards: () => `${BASE}/voyagerJobsDashJobCards`,
	jobPosting: (id: string) => `${BASE}/jobs/jobPostings/${id}`,

	// Analytics
	profileViews: () => `${BASE}/identity/wvmpCards`,
	profileStatistics: () => `${BASE}/identity/profileStatistics`,
} as const;

export type EndpointName = keyof typeof endpoints;
