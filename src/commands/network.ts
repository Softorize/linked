import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import {
	formatProfileViews,
	formatNetworkStats,
} from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerNetworkCommand(program: Command): void {
	program
		.command("views")
		.description("Who viewed my profile")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (opts: {
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
				const views = await client.getProfileViews();

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(views, null, 2));
				} else {
					console.log(formatProfileViews(views));
				}
			},
		);

	program
		.command("network")
		.description("Network stats")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (opts: {
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
				const stats = await client.getNetworkStats();

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(stats, null, 2));
				} else {
					console.log(formatNetworkStats(stats));
				}
			},
		);
}
