import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatSearchResults } from "../lib/formatters.js";
import type { OutputMode, SearchType } from "../lib/types.js";

const VALID_TYPES = ["people", "posts", "companies", "jobs", "groups"];

export function registerSearchCommand(program: Command): void {
	program
		.command("search")
		.argument("<query>", "Search query")
		.description("Search people, posts, companies, jobs, or groups")
		.option(
			"--type <type>",
			"Search type: people, posts, companies, jobs, groups",
			"people",
		)
		.option("-n, --count <number>", "Number of results", "10")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (
				query: string,
				opts: {
					type: string;
					count: string;
					json?: boolean;
					jsonFull?: boolean;
					plain?: boolean;
				},
			) => {
				const mode: OutputMode = opts.jsonFull
					? "json-full"
					: opts.json
						? "json"
						: opts.plain
							? "plain"
							: "human";

				const searchType = opts.type.toLowerCase();
				if (!VALID_TYPES.includes(searchType)) {
					console.error(
						`Invalid search type: ${opts.type}\nValid types: ${VALID_TYPES.join(", ")}`,
					);
					process.exit(1);
				}

				const client = new LinkedInClient();
				const count = Number.parseInt(opts.count, 10);
				const result = await client.search(
					query,
					searchType as SearchType,
					{ count },
				);

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.log(formatSearchResults(result));
				}
			},
		);
}
