import { getCurrentAccount } from "./account-context.js";
import { getAccountCredentials, loadConfig } from "./config.js";
import { extractCookiesFromBrowser } from "./cookie-extract.js";
import { AuthenticationError } from "./errors.js";
import type { AuthOptions, CookieSet, CookieSource } from "./types.js";

/**
 * Resolve LinkedIn credentials from multiple sources in priority order:
 * 1. Explicitly provided cookies
 * 2. Environment variables (LINKEDIN_LI_AT, LINKEDIN_JSESSIONID)
 * 3. Named account from config (--account flag → getCurrentAccount() → config.defaultAccount)
 * 4. Legacy flat config credentials
 * 5. Browser cookie extraction (Safari → Chrome → Firefox)
 */
export function resolveCredentials(options?: AuthOptions): CookieSet {
	// 1. Explicitly provided cookies
	if (options?.cookies?.li_at && options?.cookies?.jsessionid) {
		return options.cookies;
	}

	// 2. Environment variables
	const envLiAt = process.env.LINKEDIN_LI_AT;
	const envJsessionid = process.env.LINKEDIN_JSESSIONID;
	if (envLiAt && envJsessionid) {
		return { li_at: envLiAt, jsessionid: envJsessionid };
	}

	// 3. Named account from config
	const config = loadConfig();
	const accountName = options?.account ?? getCurrentAccount() ?? config.defaultAccount;

	if (accountName && config.accounts) {
		const creds = getAccountCredentials(config, accountName);
		if (creds) return creds;

		// Account specified but not found — provide helpful error
		if (!config.accounts[accountName]) {
			const available = Object.keys(config.accounts);
			throw new AuthenticationError(
				`Account "${accountName}" not found. Available accounts: ${available.join(", ") || "(none)"}`,
			);
		}

		// Account exists but has no direct credentials — try its cookieSource
		const account = config.accounts[accountName];
		if (account?.cookieSource) {
			try {
				return extractCookiesFromBrowser(account.cookieSource);
			} catch {
				// fall through
			}
		}
	}

	// 4. Legacy flat config credentials
	if (config.li_at && config.jsessionid) {
		return { li_at: config.li_at, jsessionid: config.jsessionid };
	}

	// 5. Browser cookie extraction
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
