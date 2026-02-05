import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { extractProfileIdentifier } from "../utils/url-parser.js";
import { green } from "../utils/terminal.js";

export function registerSendCommand(program: Command): void {
	program
		.command("send")
		.argument("<username-or-url>", "LinkedIn username, profile URL, or conversation ID")
		.argument("<text>", "Message text")
		.description("Send a message")
		.option(
			"--conversation <id>",
			"Reply in an existing conversation by ID",
		)
		.action(
			async (
				input: string,
				text: string,
				opts: { conversation?: string },
			) => {
				const client = new LinkedInClient();

				if (opts.conversation) {
					await client.sendMessage(opts.conversation, text);
					console.log(green("Message sent to conversation!"));
				} else {
					const identifier = extractProfileIdentifier(input);
					await client.sendMessage(identifier, text);
					console.log(green("Message sent!"));
				}
			},
		);
}
