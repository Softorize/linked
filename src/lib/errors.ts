export class LinkedInError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public endpoint?: string,
	) {
		super(message);
		this.name = "LinkedInError";
	}
}

export class AuthenticationError extends LinkedInError {
	constructor(message?: string) {
		super(
			message ??
				'Authentication failed. Your cookies may be expired.\nRun "linked auth" or log into LinkedIn in your browser and try again.',
			401,
		);
		this.name = "AuthenticationError";
	}
}

export class RateLimitError extends LinkedInError {
	public retryAfter: number;

	constructor(retryAfter = 60) {
		super(
			`Rate limited by LinkedIn. Please wait ${retryAfter} seconds before retrying.`,
			429,
		);
		this.name = "RateLimitError";
		this.retryAfter = retryAfter;
	}
}

export class ChallengeError extends LinkedInError {
	constructor() {
		super(
			"LinkedIn requires a challenge/CAPTCHA verification.\nPlease log into LinkedIn in your browser, complete the challenge, then try again.",
			403,
		);
		this.name = "ChallengeError";
	}
}

export class NotFoundError extends LinkedInError {
	constructor(resource: string) {
		super(`${resource} not found.`, 404);
		this.name = "NotFoundError";
	}
}

export class CookieExtractionError extends LinkedInError {
	constructor(source: string, cause?: string) {
		super(
			`Failed to extract cookies from ${source}.${cause ? ` ${cause}` : ""}\nTry setting LINKEDIN_LI_AT and LINKEDIN_JSESSIONID environment variables instead.`,
		);
		this.name = "CookieExtractionError";
	}
}
