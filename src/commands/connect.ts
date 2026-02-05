import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { extractProfileIdentifier } from "../utils/url-parser.js";
import { green } from "../utils/terminal.js";

export function registerConnectCommand(program: Command): void {
	program
		.command("connect")
		.argument("<username-or-url>", "LinkedIn username or profile URL")
		.argument("[message]", "Optional connection message")
		.description("Send a connection request")
		.option("--withdraw", "Withdraw a pending connection request")
		.action(
			async (
				input: string,
				message: string | undefined,
				opts: { withdraw?: boolean },
			) => {
				const identifier = extractProfileIdentifier(input);
				const client = new LinkedInClient();

				if (opts.withdraw) {
					await client.withdrawConnectionRequest(identifier);
					console.log(green("Connection request withdrawn."));
				} else {
					await client.sendConnectionRequest(identifier, message);
					console.log(green("Connection request sent!"));
				}
			},
		);
}
