import type { Command } from "commander";
import { LinkedInClient } from "../lib/client.js";
import { formatJobs, formatJob } from "../lib/formatters.js";
import { extractJobId } from "../utils/url-parser.js";
import type { OutputMode } from "../lib/types.js";

export function registerJobsCommand(program: Command): void {
	program
		.command("jobs")
		.argument("[query]", "Job search query")
		.description("Search or view jobs")
		.option("--id <job-id>", "View a specific job by ID or URL")
		.option("-n, --count <number>", "Number of results", "10")
		.option("--json", "Output as JSON")
		.option("--json-full", "Output full API response")
		.option("--plain", "No colors or hyperlinks")
		.action(
			async (
				query: string | undefined,
				opts: {
					id?: string;
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

				const client = new LinkedInClient();

				if (opts.id) {
					const jobId = extractJobId(opts.id);
					const job = await client.getJob(jobId);
					if (mode === "json" || mode === "json-full") {
						console.log(JSON.stringify(job, null, 2));
					} else {
						console.log(formatJob(job));
					}
					return;
				}

				if (!query) {
					console.error("Please provide a search query or use --id to view a specific job.");
					process.exit(1);
				}

				const count = Number.parseInt(opts.count, 10);
				const jobs = await client.searchJobs(query, { count });

				if (mode === "json" || mode === "json-full") {
					console.log(JSON.stringify(jobs, null, 2));
				} else {
					console.log(formatJobs(jobs));
				}
			},
		);
}
