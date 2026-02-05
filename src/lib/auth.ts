import type { AuthOptions, CookieSet, CookieSource } from "./types.js";
import { loadConfig } from "./config.js";
import { extractCookiesFromBrowser } from "./cookie-extract.js";
import { AuthenticationError } from "./errors.js";

/**
 * Resolve LinkedIn credentials from multiple sources in priority order:
 * 1. Explicitly provided cookies
 * 2. Environment variables (LINKEDIN_LI_AT, LINKEDIN_JSESSIONID)
 * 3. Config file (~/.config/linked/config.json5)
 * 4. Browser cookie extraction (Safari → Chrome → Firefox)
 */
export function resolveCredentials(options?: AuthOptions): CookieSet {
	// 1. Explicitly provided cookies
	if (options?.cookies?.li_at && options?.cookies?.jsessionid) {
		return options.cookies;
	}

	// 2. Environment variables
	const envLiAt = process.env["LINKEDIN_LI_AT"];
	const envJsessionid = process.env["LINKEDIN_JSESSIONID"];
	if (envLiAt && envJsessionid) {
		return { li_at: envLiAt, jsessionid: envJsessionid };
	}

	// 3. Config file
	const config = loadConfig();
	if (config.li_at && config.jsessionid) {
		return { li_at: config.li_at, jsessionid: config.jsessionid };
	}

	// 4. Browser cookie extraction
	const cookieSource: CookieSource | undefined =
		options?.cookieSource ?? (config.cookieSource as CookieSource | undefined);

	try {
		return extractCookiesFromBrowser(cookieSource);
	} catch (err) {
		throw new AuthenticationError(
			err instanceof Error ? err.message : "Failed to resolve LinkedIn credentials.",
		);
	}
}
