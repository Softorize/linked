import type {
	Company,
	Connection,
	ContactInfo,
	Conversation,
	FeedUpdate,
	Invitation,
	Job,
	Message,
	NetworkStats,
	Notification,
	Profile,
	ProfileView,
	SearchResult,
} from "./types.js";
import {
	bold,
	blue,
	cyan,
	dim,
	gray,
	green,
	link,
	magenta,
	separator,
	timeAgo,
	truncate,
	yellow,
} from "../utils/terminal.js";

// ── Profile ──

export function formatProfile(p: Profile): string {
	const lines: string[] = [];
	const name = bold(`${p.firstName} ${p.lastName}`);
	const profileLink = link(p.profileUrl, cyan(p.publicIdentifier));

	lines.push(`${name}  ${profileLink}`);
	if (p.headline) lines.push(p.headline);
	if (p.locationName) lines.push(dim(`${p.locationName}${p.geoCountryName ? `, ${p.geoCountryName}` : ""}`));
	lines.push("");

	const stats: string[] = [];
	if (p.connectionCount) stats.push(`${bold(String(p.connectionCount))} connections`);
	if (p.followerCount) stats.push(`${bold(String(p.followerCount))} followers`);
	if (stats.length) lines.push(stats.join("  "));

	if (p.summary) {
		lines.push("");
		lines.push(dim("About:"));
		lines.push(p.summary);
	}

	if (p.experience.length > 0) {
		lines.push("");
		lines.push(dim("Experience:"));
		for (const exp of p.experience.slice(0, 5)) {
			const period = formatDateRange(exp.startDate, exp.endDate);
			lines.push(`  ${bold(exp.title)} at ${exp.companyName}${period ? `  ${dim(period)}` : ""}`);
			if (exp.locationName) lines.push(`  ${dim(exp.locationName)}`);
		}
	}

	if (p.education.length > 0) {
		lines.push("");
		lines.push(dim("Education:"));
		for (const edu of p.education.slice(0, 3)) {
			lines.push(`  ${bold(edu.schoolName)}${edu.degreeName ? ` — ${edu.degreeName}` : ""}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}`);
		}
	}

	return lines.join("\n");
}

export function formatContactInfo(c: ContactInfo): string {
	const lines: string[] = [];
	if (c.emailAddress) lines.push(`${dim("Email:")} ${c.emailAddress}`);
	for (const phone of c.phoneNumbers) {
		lines.push(`${dim(`Phone (${phone.type}):`)} ${phone.number}`);
	}
	for (const site of c.websites) {
		lines.push(`${dim(`Website (${site.label}):`)} ${link(site.url, site.url)}`);
	}
	for (const handle of c.twitterHandles) {
		lines.push(`${dim("Twitter:")} @${handle}`);
	}
	if (c.address) lines.push(`${dim("Address:")} ${c.address}`);
	return lines.join("\n") || dim("No contact info available.");
}

// ── Feed ──

export function formatFeedUpdate(update: FeedUpdate): string {
	const lines: string[] = [];
	const authorLink = update.authorProfileUrl
		? link(update.authorProfileUrl, bold(update.authorName))
		: bold(update.authorName);

	lines.push(`${authorLink}  ${dim(timeAgo(update.createdAt))}`);
	if (update.authorHeadline) lines.push(dim(truncate(update.authorHeadline, 80)));
	lines.push("");

	if (update.text) {
		lines.push(truncate(update.text, 500));
		lines.push("");
	}

	const engagement: string[] = [];
	if (update.numLikes) engagement.push(`${update.numLikes} likes`);
	if (update.numComments) engagement.push(`${update.numComments} comments`);
	if (update.numShares) engagement.push(`${update.numShares} shares`);
	if (engagement.length) lines.push(dim(engagement.join("  ")));

	lines.push(dim(link(update.postUrl, "View post")));
	return lines.join("\n");
}

export function formatFeedUpdates(updates: FeedUpdate[]): string {
	if (updates.length === 0) return dim("No feed updates found.");
	return updates.map(formatFeedUpdate).join(`\n${separator()}\n`);
}

// ── Search ──

export function formatSearchResults(result: SearchResult): string {
	if (result.items.length === 0)
		return dim(`No ${result.type} results found.`);

	const lines: string[] = [];
	lines.push(dim(`Found ${result.total} ${result.type} results:`));
	lines.push("");

	for (const item of result.items) {
		const titleLink = item.url
			? link(item.url, bold(item.title))
			: bold(item.title);
		lines.push(titleLink);
		if (item.subtitle) lines.push(`  ${dim(item.subtitle)}`);
		for (const snippet of item.snippets) {
			lines.push(`  ${gray(truncate(snippet, 100))}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

// ── Connections ──

export function formatConnections(connections: Connection[]): string {
	if (connections.length === 0) return dim("No connections found.");
	const lines: string[] = [];
	for (const c of connections) {
		const name = bold(`${c.firstName} ${c.lastName}`);
		const profileLink = link(c.profileUrl, cyan(c.publicIdentifier));
		lines.push(`${name}  ${profileLink}`);
		if (c.headline) lines.push(`  ${dim(truncate(c.headline, 80))}`);
	}
	return lines.join("\n");
}

// ── Invitations ──

export function formatInvitations(invitations: Invitation[]): string {
	if (invitations.length === 0) return dim("No pending invitations.");
	const lines: string[] = [];
	for (const inv of invitations) {
		const senderLink = inv.senderProfileUrl
			? link(inv.senderProfileUrl, bold(inv.senderName))
			: bold(inv.senderName);
		lines.push(`${senderLink}  ${dim(`ID: ${inv.id}`)}`);
		if (inv.senderHeadline) lines.push(`  ${dim(inv.senderHeadline)}`);
		if (inv.message) lines.push(`  ${yellow(`"${truncate(inv.message, 100)}"`)}`);
		lines.push(`  ${dim(timeAgo(inv.sentTime))}  ${dim(inv.invitationType)}`);
		lines.push("");
	}
	return lines.join("\n");
}

// ── Messaging ──

export function formatConversations(conversations: Conversation[]): string {
	if (conversations.length === 0) return dim("No conversations found.");
	const lines: string[] = [];
	for (const conv of conversations) {
		const names = conv.participants
			.map((p) => `${p.firstName} ${p.lastName}`)
			.join(", ");
		const readIndicator = conv.read ? "" : green(" [NEW]");
		lines.push(
			`${bold(names)}${readIndicator}  ${dim(`ID: ${conv.conversationId}`)}`,
		);
		lines.push(`  ${dim(timeAgo(conv.lastActivityAt))}`);
		if (conv.lastMessage) {
			lines.push(`  ${gray(truncate(conv.lastMessage.text, 80))}`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

export function formatMessages(messages: Message[]): string {
	if (messages.length === 0) return dim("No messages found.");
	const lines: string[] = [];
	for (const msg of messages) {
		lines.push(
			`${bold(msg.senderName)}  ${dim(timeAgo(msg.createdAt))}`,
		);
		lines.push(`  ${msg.text}`);
		lines.push("");
	}
	return lines.join("\n");
}

// ── Notifications ──

export function formatNotifications(notifications: Notification[]): string {
	if (notifications.length === 0) return dim("No notifications.");
	const lines: string[] = [];
	for (const n of notifications) {
		const readIndicator = n.read ? "" : green(" [NEW]");
		const headlineLink = n.actionUrl
			? link(n.actionUrl, n.headline)
			: n.headline;
		lines.push(`${headlineLink}${readIndicator}  ${dim(timeAgo(n.createdAt))}`);
		if (n.subHeadline) lines.push(`  ${dim(n.subHeadline)}`);
		lines.push("");
	}
	return lines.join("\n");
}

// ── Company ──

export function formatCompany(c: Company): string {
	const lines: string[] = [];
	lines.push(bold(c.name));
	if (c.tagline) lines.push(c.tagline);
	lines.push("");

	const info: string[] = [];
	if (c.industryName) info.push(`${dim("Industry:")} ${c.industryName}`);
	if (c.staffCount) info.push(`${dim("Employees:")} ${c.staffCountRange || c.staffCount}`);
	if (c.website) info.push(`${dim("Website:")} ${link(c.website, c.website)}`);
	if (c.foundedYear) info.push(`${dim("Founded:")} ${c.foundedYear}`);
	if (c.headquarter) {
		const loc = [c.headquarter.city, c.headquarter.geographicArea, c.headquarter.country]
			.filter(Boolean)
			.join(", ");
		info.push(`${dim("HQ:")} ${loc}`);
	}

	lines.push(info.join("\n"));

	if (c.description) {
		lines.push("");
		lines.push(dim("About:"));
		lines.push(truncate(c.description, 500));
	}

	if (c.specialities.length > 0) {
		lines.push("");
		lines.push(dim("Specialties:") + " " + c.specialities.join(", "));
	}

	lines.push("");
	lines.push(dim(link(c.companyUrl, "View on LinkedIn")));
	return lines.join("\n");
}

// ── Jobs ──

export function formatJobs(jobs: Job[]): string {
	if (jobs.length === 0) return dim("No jobs found.");
	const lines: string[] = [];
	for (const job of jobs) {
		lines.push(formatJob(job));
		lines.push(separator());
	}
	return lines.join("\n");
}

export function formatJob(job: Job): string {
	const lines: string[] = [];
	const titleLink = link(job.jobUrl, bold(job.title));
	lines.push(titleLink);
	lines.push(`  ${dim("at")} ${job.companyName}`);

	const details: string[] = [];
	if (job.locationName) details.push(job.locationName);
	if (job.workRemoteAllowed) details.push(green("Remote"));
	if (job.employmentType) details.push(job.employmentType);
	if (job.seniorityLevel) details.push(job.seniorityLevel);
	if (details.length) lines.push(`  ${dim(details.join(" | "))}`);

	if (job.listedAt) lines.push(`  ${dim(`Posted ${timeAgo(job.listedAt)}`)}`);
	if (job.applicantCount) lines.push(`  ${dim(`${job.applicantCount} applicants`)}`);

	if (job.description) {
		lines.push("");
		lines.push(truncate(job.description, 300));
	}

	return lines.join("\n");
}

// ── Analytics ──

export function formatProfileViews(views: ProfileView[]): string {
	if (views.length === 0) return dim("No profile views to show.");
	const lines: string[] = [];
	for (const v of views) {
		if (v.isAnonymous) {
			lines.push(`${dim("Anonymous viewer")}  ${dim(timeAgo(v.viewedAt))}`);
		} else {
			const viewerLink = v.viewerProfileUrl
				? link(v.viewerProfileUrl, bold(v.viewerName))
				: bold(v.viewerName);
			lines.push(`${viewerLink}  ${dim(timeAgo(v.viewedAt))}`);
			if (v.viewerHeadline) lines.push(`  ${dim(v.viewerHeadline)}`);
		}
	}
	return lines.join("\n");
}

export function formatNetworkStats(stats: NetworkStats): string {
	const lines: string[] = [];
	lines.push(bold("Network Stats"));
	lines.push(separator());
	lines.push(`${dim("Connections:")}    ${bold(String(stats.connectionCount))}`);
	lines.push(`${dim("Followers:")}      ${bold(String(stats.followerCount))}`);
	lines.push(`${dim("Profile views:")}  ${bold(String(stats.profileViewCount))}`);
	lines.push(`${dim("Search appears:")} ${bold(String(stats.searchAppearances))}`);
	lines.push(`${dim("Post impressions:")} ${bold(String(stats.postImpressions))}`);
	return lines.join("\n");
}

// ── Utility ──

function formatDateRange(
	start: { year: number; month?: number },
	end: { year: number; month?: number } | null,
): string {
	if (!start.year) return "";
	const startStr = start.month
		? `${monthName(start.month)} ${start.year}`
		: String(start.year);
	if (!end) return `(${startStr} — Present)`;
	const endStr = end.month
		? `${monthName(end.month)} ${end.year}`
		: String(end.year);
	return `(${startStr} — ${endStr})`;
}

function monthName(month: number): string {
	const months = [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
	];
	return months[month - 1] ?? "";
}
