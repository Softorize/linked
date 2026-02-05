import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { extractPostUrn } from "../utils/url-parser.js";
import { green } from "../utils/terminal.js";

export function registerCommentCommand(program: Command): void {
	program
		.command("comment")
		.argument("<post-url-or-urn>", "Post URL or URN")
		.argument("<text>", "Comment text")
		.description("Comment on a post")
		.option("--json", "Output as JSON")
		.action(
			async (
				input: string,
				text: string,
				opts: { json?: boolean },
			) => {
				const urn = extractPostUrn(input);
				const client = new LinkedInClient();
				const result = await client.comment(urn, text);

				if (opts.json) {
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.log(green("Comment posted!"));
				}
			},
		);
}
