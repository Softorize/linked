import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatProfile } from "../lib/formatters.js";
import type { OutputMode } from "../lib/types.js";

export function registerWhoamiCommand(program: Command): void {
	program
		.command("whoami")
		.description("Show logged-in account info")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(async (opts: { json?: boolean; jsonFull?: boolean; plain?: boolean }) => {
			const mode: OutputMode = opts.jsonFull
				? "json-full"
				: opts.json
					? "json"
					: opts.plain
						? "plain"
						: "human";

			const client = new LinkedInClient();
			const profile = await client.getMe();

			if (mode === "json" || mode === "json-full") {
				console.log(JSON.stringify(profile, null, 2));
			} else {
				console.log(formatProfile(profile));
			}
		});
}
