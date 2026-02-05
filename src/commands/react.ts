import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { extractPostUrn } from "../utils/url-parser.js";
import { green } from "../utils/terminal.js";
import type { ReactionType } from "../lib/types.js";

const VALID_REACTIONS = ["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "FUNNY"];

export function registerReactCommand(program: Command): void {
	program
		.command("react")
		.argument("<post-url-or-urn>", "Post URL or URN")
		.description("React to a post")
		.option(
			"--type <reaction>",
			"Reaction type: LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY",
			"LIKE",
		)
		.action(async (input: string, opts: { type: string }) => {
			const reactionType = opts.type.toUpperCase();
			if (!VALID_REACTIONS.includes(reactionType)) {
				console.error(
					`Invalid reaction type: ${opts.type}\nValid types: ${VALID_REACTIONS.join(", ")}`,
				);
				process.exit(1);
			}

			const urn = extractPostUrn(input);
			const client = new LinkedInClient();
			await client.react(urn, reactionType as ReactionType);
			console.log(green(`Reacted with ${reactionType}!`));
		});

	program
		.command("unreact")
		.argument("<post-url-or-urn>", "Post URL or URN")
		.description("Remove reaction from a post")
		.action(async (input: string) => {
			const urn = extractPostUrn(input);
			const client = new LinkedInClient();
			await client.unreact(urn);
			console.log(green("Reaction removed!"));
		});
}
