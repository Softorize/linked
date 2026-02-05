import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatConnections } from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerConnectionsCommand(program: Command): void {
	program
		.command("connections")
		.description("List connections")
		.option("-n, --count <number>", "Number of connections", "20")
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
				const connections = await client.getConnections({ count });

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(connections, null, 2));
				} else {
					console.log(formatConnections(connections));
				}
			},
		);
}
