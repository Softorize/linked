import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
	getConfigDir,
	getConfigPath,
	loadConfig,
	saveConfig,
	listAccounts,
	setAccount,
	removeAccount,
	setDefaultAccount,
	migrateLegacyCredentials,
	getAccountCredentials,
} from "../../src/lib/config.js";
import type { LinkedConfig } from "../../src/lib/types.js";

const TEST_CONFIG_DIR = join(
	process.env["TMPDIR"] ?? "/tmp",
	"linked-test-config-" + Date.now(),
);

describe("config paths", () => {
	it("should return config dir under home directory", () => {
		const dir = getConfigDir();
		expect(dir).toBe(join(homedir(), ".config", "linked"));
	});

	it("should return config path under config dir", () => {
		const path = getConfigPath();
		expect(path).toBe(
			join(homedir(), ".config", "linked", "config.json5"),
		);
	});
});

describe("loadConfig", () => {
	it("should return empty object when no config files exist", () => {
		// loadConfig will try to read from default paths, which may or may not exist
		// but should not throw
		const config = loadConfig();
		expect(config).toBeDefined();
		expect(typeof config).toBe("object");
	});
});

describe("saveConfig", () => {
	afterEach(() => {
		// Cleanup
		try {
			rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
		} catch {
			// ignore
		}
	});

	it("should be a function", () => {
		expect(typeof saveConfig).toBe("function");
	});
});

describe("getAccountCredentials", () => {
	it("should return cookies for a valid account", () => {
		const config: LinkedConfig = {
			accounts: {
				personal: { li_at: "tok1", jsessionid: "sess1" },
			},
		};
		const result = getAccountCredentials(config, "personal");
		expect(result).toEqual({ li_at: "tok1", jsessionid: "sess1" });
	});

	it("should return undefined for non-existent account", () => {
		const config: LinkedConfig = { accounts: {} };
		expect(getAccountCredentials(config, "nope")).toBeUndefined();
	});

	it("should return undefined when account has no credentials", () => {
		const config: LinkedConfig = {
			accounts: { partial: { cookieSource: "safari" } },
		};
		expect(getAccountCredentials(config, "partial")).toBeUndefined();
	});

	it("should return undefined when no accounts map", () => {
		const config: LinkedConfig = {};
		expect(getAccountCredentials(config, "any")).toBeUndefined();
	});
});

describe("listAccounts", () => {
	it("should return empty array when no accounts and no legacy creds", () => {
		expect(listAccounts({})).toEqual([]);
	});

	it("should return legacy marker for flat-only config", () => {
		const config: LinkedConfig = { li_at: "tok", jsessionid: "sess" };
		const result = listAccounts(config);
		expect(result).toHaveLength(1);
		expect(result[0]!.name).toBe("(legacy)");
		expect(result[0]!.isDefault).toBe(true);
		expect(result[0]!.hasCookies).toBe(true);
	});

	it("should list all named accounts with default flag", () => {
		const config: LinkedConfig = {
			accounts: {
				personal: { li_at: "a", jsessionid: "b" },
				company: { cookieSource: "chrome" },
			},
			defaultAccount: "personal",
		};
		const result = listAccounts(config);
		expect(result).toHaveLength(2);

		const personal = result.find((a) => a.name === "personal");
		expect(personal?.isDefault).toBe(true);
		expect(personal?.hasCookies).toBe(true);

		const company = result.find((a) => a.name === "company");
		expect(company?.isDefault).toBe(false);
		expect(company?.hasCookies).toBe(false);
		expect(company?.cookieSource).toBe("chrome");
	});
});

describe("setAccount", () => {
	it("should create accounts map if missing", () => {
		const result = setAccount({}, "work", {
			li_at: "t",
			jsessionid: "s",
		});
		expect(result.accounts?.work).toEqual({
			li_at: "t",
			jsessionid: "s",
		});
	});

	it("should auto-set first account as default", () => {
		const result = setAccount({}, "first", { li_at: "a", jsessionid: "b" });
		expect(result.defaultAccount).toBe("first");
	});

	it("should not override existing default", () => {
		const config: LinkedConfig = {
			accounts: { existing: { li_at: "a", jsessionid: "b" } },
			defaultAccount: "existing",
		};
		const result = setAccount(config, "second", {
			li_at: "c",
			jsessionid: "d",
		});
		expect(result.defaultAccount).toBe("existing");
	});

	it("should update existing account", () => {
		const config: LinkedConfig = {
			accounts: { acct: { li_at: "old", jsessionid: "old" } },
			defaultAccount: "acct",
		};
		const result = setAccount(config, "acct", {
			li_at: "new",
			jsessionid: "new",
		});
		expect(result.accounts?.acct?.li_at).toBe("new");
	});
});

describe("removeAccount", () => {
	it("should remove an account", () => {
		const config: LinkedConfig = {
			accounts: {
				a: { li_at: "1", jsessionid: "1" },
				b: { li_at: "2", jsessionid: "2" },
			},
			defaultAccount: "b",
		};
		const result = removeAccount(config, "a");
		expect(result.accounts?.a).toBeUndefined();
		expect(result.accounts?.b).toBeDefined();
	});

	it("should reset default if removed account was default", () => {
		const config: LinkedConfig = {
			accounts: {
				a: { li_at: "1", jsessionid: "1" },
				b: { li_at: "2", jsessionid: "2" },
			},
			defaultAccount: "a",
		};
		const result = removeAccount(config, "a");
		expect(result.defaultAccount).toBe("b");
	});

	it("should clean up accounts map when last account removed", () => {
		const config: LinkedConfig = {
			accounts: { only: { li_at: "1", jsessionid: "1" } },
			defaultAccount: "only",
		};
		const result = removeAccount(config, "only");
		expect(result.accounts).toBeUndefined();
		expect(result.defaultAccount).toBeUndefined();
	});

	it("should throw on non-existent account", () => {
		const config: LinkedConfig = { accounts: {} };
		expect(() => removeAccount(config, "nope")).toThrow(
			'Account "nope" does not exist',
		);
	});
});

describe("setDefaultAccount", () => {
	it("should set the default account", () => {
		const config: LinkedConfig = {
			accounts: {
				a: { li_at: "1", jsessionid: "1" },
				b: { li_at: "2", jsessionid: "2" },
			},
			defaultAccount: "a",
		};
		const result = setDefaultAccount(config, "b");
		expect(result.defaultAccount).toBe("b");
	});

	it("should throw on non-existent account", () => {
		const config: LinkedConfig = { accounts: {} };
		expect(() => setDefaultAccount(config, "nope")).toThrow(
			'Account "nope" does not exist',
		);
	});
});

describe("migrateLegacyCredentials", () => {
	it("should move flat fields to named account", () => {
		const config: LinkedConfig = {
			li_at: "tok",
			jsessionid: "sess",
			cookieSource: "safari",
		};
		const result = migrateLegacyCredentials(config, "personal");
		expect(result.accounts?.personal).toEqual({
			li_at: "tok",
			jsessionid: "sess",
			cookieSource: "safari",
		});
		expect(result.defaultAccount).toBe("personal");
		expect(result.li_at).toBeUndefined();
		expect(result.jsessionid).toBeUndefined();
	});

	it("should set default to migrated account", () => {
		const config: LinkedConfig = { li_at: "t", jsessionid: "s" };
		const result = migrateLegacyCredentials(config, "main");
		expect(result.defaultAccount).toBe("main");
	});

	it("should throw when no legacy credentials", () => {
		expect(() => migrateLegacyCredentials({}, "x")).toThrow(
			"No legacy credentials to migrate",
		);
	});
});
