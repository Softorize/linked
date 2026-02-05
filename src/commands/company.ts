import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatCompany } from "../lib/formatters.js";
import { extractCompanySlug } from "../utils/url-parser.js";
import type { OutputMode } from "../lib/types.js";

export function registerCompanyCommand(program: Command): void {
	program
		.command("company")
		.argument("<company-slug-or-url>", "Company slug or LinkedIn URL")
		.description("View company info")
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

				const slug = extractCompanySlug(input);
				const client = new LinkedInClient();
				const company = await client.getCompany(slug);

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(company, null, 2));
				} else {
					console.log(formatCompany(company));
				}
			},
		);
}
