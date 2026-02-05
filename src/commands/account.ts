import type { Command } from "commander";
import { resolveCredentials } from "../lib/auth.js";
import { LinkedInClient } from "../lib/client.js";
import {
	listAccounts,
	loadConfig,
	migrateLegacyCredentials,
	removeAccount,
	saveConfig,
	setAccount,
	setDefaultAccount,
} from "../lib/config.js";
import { formatProfile } from "../lib/formatters.js";
import type { AccountConfig } from "../lib/types.js";
import { bold, cyan, dim, green, yellow } from "../utils/terminal.js";

const ACCOUNT_NAME_RE = /^[a-zA-Z0-9_-]+$/;

function validateAccountName(name: string): void {
	if (!ACCOUNT_NAME_RE.test(name)) {
		throw new Error(
			`Invalid account name "${name}". Use only letters, numbers, hyphens, and underscores.`,
		);
	}
}

export function registerAccountCommand(program: Command): void {
	const account = program.command("account").description("Manage multiple LinkedIn accounts");

	account
		.command("list")
		.alias("ls")
		.description("List configured accounts")
		.action(() => {
			const config = loadConfig();
			const accounts = listAccounts(config);

			if (accounts.length === 0) {
				console.log(dim("No accounts configured."));
				console.log(
					dim('Run "linked account add <name> --li-at <token> --jsessionid <token>" to add one.'),
				);
				return;
			}

			for (const acct of accounts) {
				const marker = acct.isDefault ? green(" (default)") : "";
				const status = acct.hasCookies ? cyan("credentials set") : yellow("no credentials");
				const source = acct.cookieSource ? dim(` [${acct.cookieSource}]`) : "";
				console.log(`  ${bold(acct.name)}${marker} — ${status}${source}`);
			}
		});

	account
		.command("add")
		.argument("<name>", "Account name (letters, numbers, hyphens, underscores)")
		.option("--li-at <token>", "LinkedIn li_at cookie value")
		.option("--jsessionid <token>", "LinkedIn JSESSIONID cookie value")
		.option(
			"--cookie-source <browser>",
			"Browser to extract cookies from (safari, chrome, firefox)",
		)
		.option("--default", "Set as default account")
		.description("Add or update a named account")
		.action(
			(
				name: string,
				opts: {
					liAt?: string;
					jsessionid?: string;
					cookieSource?: string;
					default?: boolean;
				},
			) => {
				validateAccountName(name);
				const acctConfig: AccountConfig = {};
				if (opts.liAt) acctConfig.li_at = opts.liAt;
				if (opts.jsessionid) acctConfig.jsessionid = opts.jsessionid;
				if (opts.cookieSource)
					acctConfig.cookieSource = opts.cookieSource as AccountConfig["cookieSource"];

				let config = loadConfig();
				config = setAccount(config, name, acctConfig);
				if (opts.default) {
					config = setDefaultAccount(config, name);
				}
				saveConfig(config);
				console.log(green(`Account "${name}" saved.`));
			},
		);

	account
		.command("remove")
		.alias("rm")
		.argument("<name>", "Account name to remove")
		.description("Remove a named account")
		.action((name: string) => {
			let config = loadConfig();
			config = removeAccount(config, name);
			saveConfig(config);
			console.log(green(`Account "${name}" removed.`));
		});

	account
		.command("default")
		.argument("<name>", "Account name to set as default")
		.description("Set the default account")
		.action((name: string) => {
			let config = loadConfig();
			config = setDefaultAccount(config, name);
			saveConfig(config);
			console.log(green(`Default account set to "${name}".`));
		});

	account
		.command("migrate")
		.argument("[name]", "Account name for migrated credentials", "default")
		.description("Migrate legacy flat credentials to a named account")
		.action((name: string) => {
			validateAccountName(name);
			let config = loadConfig();
			config = migrateLegacyCredentials(config, name);
			saveConfig(config);
			console.log(green(`Legacy credentials migrated to account "${name}".`));
		});

	account
		.command("whoami")
		.description("Show which account is currently active and verify credentials")
		.option("--json", "Output as JSON")
		.action(async (opts: { json?: boolean }) => {
			const client = new LinkedInClient();
			const profile = await client.getMe();

			if (opts.json) {
				console.log(JSON.stringify(profile, null, 2));
			} else {
				console.log(formatProfile(profile));
			}
		});
}
