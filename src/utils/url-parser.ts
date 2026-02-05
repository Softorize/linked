/**
 * Parse LinkedIn URLs and URNs to extract identifiers.
 */

export interface ParsedLinkedInUrl {
	type: "profile" | "post" | "company" | "job" | "activity" | "unknown";
	identifier: string;
	raw: string;
}

const LINKEDIN_URL_PATTERNS: Array<{
	regex: RegExp;
	type: ParsedLinkedInUrl["type"];
	group: number;
}> = [
	// Profile: https://www.linkedin.com/in/username
	{
		regex: /linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/,
		type: "profile",
		group: 1,
	},
	// Post/Activity: https://www.linkedin.com/feed/update/urn:li:activity:123456
	{
		regex: /linkedin\.com\/feed\/update\/(urn:li:activity:\d+)/,
		type: "activity",
		group: 1,
	},
	// Post (share): https://www.linkedin.com/posts/username_activity-123456
	{
		regex: /linkedin\.com\/posts\/[^/]+_activity-(\d+)/,
		type: "activity",
		group: 1,
	},
	// Company: https://www.linkedin.com/company/google/
	{
		regex: /linkedin\.com\/company\/([a-zA-Z0-9\-_%]+)/,
		type: "company",
		group: 1,
	},
	// Job: https://www.linkedin.com/jobs/view/123456/
	{
		regex: /linkedin\.com\/jobs\/view\/(\d+)/,
		type: "job",
		group: 1,
	},
];

export function parseLinkedInUrl(input: string): ParsedLinkedInUrl {
	const trimmed = input.trim();

	// Check if it's a URN
	if (trimmed.startsWith("urn:li:")) {
		return parseUrn(trimmed);
	}

	// Check if it's a URL
	if (trimmed.includes("linkedin.com")) {
		for (const pattern of LINKEDIN_URL_PATTERNS) {
			const match = trimmed.match(pattern.regex);
			if (match?.[pattern.group]) {
				let identifier = match[pattern.group]!;
				// For activity pattern from /posts/ URLs, convert to URN
				if (pattern.type === "activity" && !identifier.startsWith("urn:")) {
					identifier = `urn:li:activity:${identifier}`;
				}
				return {
					type: pattern.type,
					identifier: decodeURIComponent(identifier),
					raw: trimmed,
				};
			}
		}
		return { type: "unknown", identifier: trimmed, raw: trimmed };
	}

	// Bare identifier — heuristic detection
	if (/^\d+$/.test(trimmed)) {
		// Pure numeric — could be a job ID or activity ID
		return { type: "unknown", identifier: trimmed, raw: trimmed };
	}

	// Assume it's a profile identifier (username)
	return { type: "profile", identifier: trimmed, raw: trimmed };
}

function parseUrn(urn: string): ParsedLinkedInUrl {
	if (urn.startsWith("urn:li:activity:")) {
		return { type: "activity", identifier: urn, raw: urn };
	}
	if (urn.startsWith("urn:li:member:")) {
		return {
			type: "profile",
			identifier: urn.replace("urn:li:member:", ""),
			raw: urn,
		};
	}
	if (urn.startsWith("urn:li:company:") || urn.startsWith("urn:li:organization:")) {
		return {
			type: "company",
			identifier: urn.replace(/urn:li:(company|organization):/, ""),
			raw: urn,
		};
	}
	if (urn.startsWith("urn:li:jobPosting:")) {
		return {
			type: "job",
			identifier: urn.replace("urn:li:jobPosting:", ""),
			raw: urn,
		};
	}
	if (urn.startsWith("urn:li:share:") || urn.startsWith("urn:li:ugcPost:")) {
		return { type: "post", identifier: urn, raw: urn };
	}
	return { type: "unknown", identifier: urn, raw: urn };
}

/**
 * Extract the activity URN from various post URL/URN formats.
 */
export function extractPostUrn(input: string): string {
	const parsed = parseLinkedInUrl(input);
	if (parsed.type === "activity") {
		return parsed.identifier;
	}
	if (parsed.type === "post") {
		return parsed.identifier;
	}
	// If it looks like it could be an activity ID
	if (/^\d+$/.test(parsed.identifier)) {
		return `urn:li:activity:${parsed.identifier}`;
	}
	return parsed.identifier;
}

/**
 * Extract a public identifier from a profile URL or bare username.
 */
export function extractProfileIdentifier(input: string): string {
	const parsed = parseLinkedInUrl(input);
	return parsed.identifier;
}

/**
 * Extract a company slug from a company URL or bare slug.
 */
export function extractCompanySlug(input: string): string {
	const parsed = parseLinkedInUrl(input);
	return parsed.identifier;
}

/**
 * Extract a job ID from a job URL, URN, or bare ID.
 */
export function extractJobId(input: string): string {
	const parsed = parseLinkedInUrl(input);
	return parsed.identifier;
}
