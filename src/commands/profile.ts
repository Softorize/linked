import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatProfile, formatContactInfo } from "../lib/formatters.js";
import { extractProfileIdentifier } from "../utils/url-parser.js";
import type { OutputMode } from "../lib/types.js";

export function registerProfileCommand(program: Command): void {
	program
		.command("profile")
		.argument("<username-or-url>", "LinkedIn username or profile URL")
		.description("View a LinkedIn profile")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.option("--contact", "Show contact info")
		.option("--skills", "Show skills")
		.action(
			async (
				input: string,
				opts: {
					json?: boolean;
					jsonFull?: boolean;
					plain?: boolean;
					contact?: boolean;
					skills?: boolean;
				},
			) => {
				const mode: OutputMode = opts.jsonFull
					? "json-full"
					: opts.json
						? "json"
						: opts.plain
							? "plain"
							: "human";

				const identifier = extractProfileIdentifier(input);
				const client = new LinkedInClient();

				if (opts.contact) {
					const contactInfo = await client.getProfileContactInfo(identifier);
					if (mode === "json" || mode === "json-full") {
						console.log(JSON.stringify(contactInfo, null, 2));
					} else {
						console.log(formatContactInfo(contactInfo));
					}
					return;
				}

				const profile = await client.getProfile(identifier);

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(profile, null, 2));
				} else {
					console.log(formatProfile(profile));
				}
			},
		);
}
