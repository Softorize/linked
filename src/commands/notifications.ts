import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatNotifications } from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerNotificationsCommand(program: Command): void {
	program
		.command("notifications")
		.description("List notifications")
		.option("-n, --count <number>", "Number of notifications", "10")
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
				const notifications = await client.getNotifications({ count });

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(notifications, null, 2));
				} else {
					console.log(formatNotifications(notifications));
				}
			},
		);
}
