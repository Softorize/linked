import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatFeedUpdates } from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerFeedCommand(program: Command): void {
	program
		.command("feed")
		.description("Read home feed")
		.option("-n, --count <number>", "Number of items", "10")
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
				const updates = await client.getFeed({ count });

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(updates, null, 2));
				} else {
					console.log(formatFeedUpdates(updates));
				}
			},
		);

	// `linked read <post-url-or-urn>` — read a single post
	program
		.command("read")
		.argument("<post-url-or-urn>", "Post URL or URN")
		.description("Read a single post")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (
				input: string,
				opts: { json?: boolean; jsonFull?: boolean; plain?: boolean },
			) => {
				const mode: OutputMode = opts.jsonFull
					? "json-full"
					: opts.json
						? "json"
						: opts.plain
							? "plain"
							: "human";

				const { extractPostUrn } = await import("../utils/url-parser.js");
				const { formatFeedUpdate } = await import("../lib/formatters.js");
				const urn = extractPostUrn(input);
				const client = new LinkedInClient();
				const post = await client.getPost(urn);

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(post, null, 2));
				} else {
					console.log(formatFeedUpdate(post));
				}
			},
		);
}
