#!/usr/bin/env node

import { Command } from "commander";
import { registerAccountCommand } from "./commands/account.js";
import { registerCommentCommand } from "./commands/comment.js";
import { registerCompanyCommand } from "./commands/company.js";
import { registerConnectCommand } from "./commands/connect.js";
import { registerConnectionsCommand } from "./commands/connections.js";
import { registerFeedCommand } from "./commands/feed.js";
import { registerInboxCommand } from "./commands/inbox.js";
import { registerInvitationsCommand } from "./commands/invitations.js";
import { registerJobsCommand } from "./commands/jobs.js";
import { registerSendCommand } from "./commands/message.js";
import { registerNetworkCommand } from "./commands/network.js";
import { registerNotificationsCommand } from "./commands/notifications.js";
import { registerPostCommand } from "./commands/post.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerReactCommand } from "./commands/react.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerWhoamiCommand } from "./commands/whoami.js";
import { setCurrentAccount } from "./lib/account-context.js";
import { LinkedInError } from "./lib/errors.js";
import { dim, red } from "./utils/terminal.js";

const program = new Command();

program
	.name("linked")
	.description("Fast LinkedIn CLI — read, post, message, and network from your terminal")
	.version("0.1.0")
	.option("-a, --account <name>", "Use a specific named account");

// Register all commands
registerWhoamiCommand(program);
registerProfileCommand(program);
registerFeedCommand(program);
registerPostCommand(program);
registerCommentCommand(program);
registerReactCommand(program);
registerSearchCommand(program);
registerConnectionsCommand(program);
registerConnectCommand(program);
registerSendCommand(program);
registerInboxCommand(program);
registerNotificationsCommand(program);
registerCompanyCommand(program);
registerJobsCommand(program);
registerInvitationsCommand(program);
registerNetworkCommand(program);
registerAccountCommand(program);

// Global error handling and account context
program.hook("preAction", (thisCommand) => {
	// Set account context from global --account flag
	const rootOpts = program.opts<{ account?: string }>();
	if (rootOpts.account) {
		setCurrentAccount(rootOpts.account);
	}

	// Ensure unhandled rejections are caught
	process.on("unhandledRejection", (err) => {
		handleError(err);
	});
});

function handleError(err: unknown): void {
	if (err instanceof LinkedInError) {
		console.error(red(`Error: ${err.message}`));
		if (err.statusCode) {
			console.error(dim(`Status: ${err.statusCode}`));
		}
		if (err.endpoint) {
			console.error(dim(`Endpoint: ${err.endpoint}`));
		}
	} else if (err instanceof Error) {
		console.error(red(`Error: ${err.message}`));
		if (process.env.DEBUG) {
			console.error(dim(err.stack ?? ""));
		}
	} else {
		console.error(red(`Error: ${String(err)}`));
	}
	process.exit(1);
}

async function main(): Promise<void> {
	try {
		await program.parseAsync(process.argv);
	} catch (err) {
		handleError(err);
	}
}

main();
