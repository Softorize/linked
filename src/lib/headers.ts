import type { CookieSet } from "./types.js";

const DEFAULT_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

function buildXLiTrack(): string {
	return JSON.stringify({
		clientVersion: "1.13.8822",
		mpVersion: "1.13.8822",
		osName: "web",
		timezoneOffset: -new Date().getTimezoneOffset() / 60,
		deviceFormFactor: "DESKTOP",
		mpName: "voyager-web",
		displayDensity: 1,
		displayWidth: 1920,
		displayHeight: 1080,
	});
}

function buildCookieString(cookies: CookieSet): string {
	const parts = [`li_at=${cookies.li_at}`, `JSESSIONID="${cookies.jsessionid.replace(/"/g, "")}"`];
	if (cookies.li_mc) parts.push(`li_mc=${cookies.li_mc}`);
	if (cookies.bcookie) parts.push(`bcookie=${cookies.bcookie}`);
	if (cookies.bscookie) parts.push(`bscookie=${cookies.bscookie}`);
	return parts.join("; ");
}

export function buildHeaders(cookies: CookieSet): Record<string, string> {
	// JSESSIONID is stored with surrounding quotes; strip them for the CSRF token
	const csrfToken = `ajax:${cookies.jsessionid.replace(/"/g, "")}`;

	return {
		"User-Agent": DEFAULT_USER_AGENT,
		Accept: "application/vnd.linkedin.normalized+json+2.1",
		"x-li-lang": "en_US",
		"x-li-track": buildXLiTrack(),
		"x-restli-protocol-version": "2.0.0",
		"csrf-token": csrfToken,
		cookie: buildCookieString(cookies),
	};
}
