import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatInvitations } from "../lib/formatters.js";
import { green } from "../utils/terminal.js";
import type { OutputMode } from "../lib/types.js";

export function registerInvitationsCommand(program: Command): void {
	program
		.command("invitations")
		.description("List pending invitations")
		.option("--sent", "Show sent invitations instead of received")
		.option("-n, --count <number>", "Number of invitations", "10")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (opts: {
				sent?: boolean;
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
				const invitations = await client.getInvitations(
					opts.sent ?? false,
					{ count },
				);

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(invitations, null, 2));
				} else {
					console.log(formatInvitations(invitations));
				}
			},
		);

	program
		.command("accept")
		.argument("<invitation-id>", "Invitation ID")
		.description("Accept an invitation")
		.action(async (id: string) => {
			const client = new LinkedInClient();
			await client.respondToInvitation(id, true);
			console.log(green("Invitation accepted!"));
		});

	program
		.command("reject")
		.argument("<invitation-id>", "Invitation ID")
		.description("Reject an invitation")
		.action(async (id: string) => {
			const client = new LinkedInClient();
			await client.respondToInvitation(id, false);
			console.log(green("Invitation rejected."));
		});
}
