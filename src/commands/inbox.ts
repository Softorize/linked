import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatConversations, formatMessages } from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerInboxCommand(program: Command): void {
	program
		.command("inbox")
		.description("List conversations")
		.option("-n, --count <number>", "Number of conversations", "10")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (opts: {
				count: string;
				json?: boolean;
				jsonFull?: boolean;
				plain?: boolean;
			}) => {
				const mode: OutputMode = opts.jsonFull
					? "json-full"
					: opts.json
						? "json"
						: opts.plain
							? "plain"
							: "human";

				const client = new LinkedInClient();
				const count = Number.parseInt(opts.count, 10);
				const conversations = await client.getConversations({ count });

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(conversations, null, 2));
				} else {
					console.log(formatConversations(conversations));
				}
			},
		);

	program
		.command("messages")
		.argument("<conversation-id>", "Conversation ID")
		.description("Read messages in a conversation")
		.option("-n, --count <number>", "Number of messages", "20")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (
				conversationId: string,
				opts: {
					count: string;
					json?: boolean;
					jsonFull?: boolean;
					plain?: boolean;
				},
			) => {
				const mode: OutputMode = opts.jsonFull
					? "json-full"
					: opts.json
						? "json"
						: opts.plain
							? "plain"
							: "human";

				const client = new LinkedInClient();
				const count = Number.parseInt(opts.count, 10);
				const messages = await client.getMessages(conversationId, {
					count,
				});

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(messages, null, 2));
				} else {
					console.log(formatMessages(messages));
				}
			},
		);
}
