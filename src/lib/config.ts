import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import JSON5 from "json5";
import type { AccountConfig, CookieSet, LinkedConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "linked");
const CONFIG_FILE = join(CONFIG_DIR, "config.json5");
const LOCAL_CONFIG_FILE = ".linkedrc.json5";

function loadConfigFile(path: string): LinkedConfig {
	if (!existsSync(path)) return {};
	try {
		const raw = readFileSync(path, "utf-8");
		return JSON5.parse(raw) as LinkedConfig;
	} catch {
		return {};
	}
}

export function loadConfig(): LinkedConfig {
	const global = loadConfigFile(CONFIG_FILE);
	const local = loadConfigFile(LOCAL_CONFIG_FILE);
	return { ...global, ...local };
}

export function saveConfig(config: LinkedConfig): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
	const content = JSON5.stringify(config, null, 2);
	writeFileSync(CONFIG_FILE, content, "utf-8");
	chmodSync(CONFIG_FILE, 0o600);
}

export function getConfigDir(): string {
	return CONFIG_DIR;
}

export function getConfigPath(): string {
	return CONFIG_FILE;
}

export interface AccountInfo {
	name: string;
	isDefault: boolean;
	hasCookies: boolean;
	cookieSource?: string;
}

export function getAccountCredentials(config: LinkedConfig, name: string): CookieSet | undefined {
	const account = config.accounts?.[name];
	if (!account) return undefined;
	if (account.li_at && account.jsessionid) {
		return { li_at: account.li_at, jsessionid: account.jsessionid };
	}
	return undefined;
}

export function listAccounts(config: LinkedConfig): AccountInfo[] {
	const results: AccountInfo[] = [];

	if (config.accounts) {
		for (const [name, account] of Object.entries(config.accounts)) {
			results.push({
				name,
				isDefault: config.defaultAccount === name,
				hasCookies: Boolean(account.li_at && account.jsessionid),
				cookieSource: account.cookieSource,
			});
		}
	} else if (config.li_at && config.jsessionid) {
		results.push({
			name: "(legacy)",
			isDefault: true,
			hasCookies: true,
			cookieSource: config.cookieSource,
		});
	}

	return results;
}

export function setAccount(
	config: LinkedConfig,
	name: string,
	account: AccountConfig,
): LinkedConfig {
	const updated = { ...config };
	if (!updated.accounts) {
		updated.accounts = {};
	}
	updated.accounts = { ...updated.accounts, [name]: account };
	if (!updated.defaultAccount) {
		updated.defaultAccount = name;
	}
	return updated;
}

export function removeAccount(config: LinkedConfig, name: string): LinkedConfig {
	if (!config.accounts?.[name]) {
		throw new Error(`Account "${name}" does not exist.`);
	}
	const updated = { ...config };
	const accounts = updated.accounts ?? {};
	const { [name]: _, ...rest } = accounts;
	updated.accounts = rest;
	if (updated.defaultAccount === name) {
		const remaining = Object.keys(updated.accounts);
		updated.defaultAccount = remaining[0];
	}
	if (Object.keys(updated.accounts).length === 0) {
		updated.accounts = undefined;
		updated.defaultAccount = undefined;
	}
	return updated;
}

export function setDefaultAccount(config: LinkedConfig, name: string): LinkedConfig {
	if (!config.accounts?.[name]) {
		throw new Error(`Account "${name}" does not exist.`);
	}
	return { ...config, defaultAccount: name };
}

export function migrateLegacyCredentials(config: LinkedConfig, name: string): LinkedConfig {
	if (!config.li_at || !config.jsessionid) {
		throw new Error("No legacy credentials to migrate.");
	}
	const account: AccountConfig = {
		li_at: config.li_at,
		jsessionid: config.jsessionid,
	};
	if (config.cookieSource) {
		account.cookieSource = config.cookieSource;
	}
	const updated = { ...config };
	if (!updated.accounts) {
		updated.accounts = {};
	}
	updated.accounts = { ...updated.accounts, [name]: account };
	updated.defaultAccount = name;
	updated.li_at = undefined;
	updated.jsessionid = undefined;
	return updated;
}
