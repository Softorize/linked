import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { green, bold, link } from "../utils/terminal.js";
import type { OutputMode } from "../lib/types.js";

export function registerPostCommand(program: Command): void {
	program
		.command("post")
		.argument("<text>", "Post text content")
		.description("Create a text post")
		.option("--visibility <type>", "PUBLIC or CONNECTIONS", "PUBLIC")
		.option("--json", "Output as JSON")
		.action(
			async (
				text: string,
				opts: {
					visibility: string;
					json?: boolean;
				},
			) => {
				const client = new LinkedInClient();
				const result = await client.createPost(text, {
					visibility: opts.visibility as "PUBLIC" | "CONNECTIONS",
				});

				if (opts.json) {
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.log(
						`${green("Post created!")} ${link(result.url, bold("View post"))}`,
					);
				}
			},
		);
}
