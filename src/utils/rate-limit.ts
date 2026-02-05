import { RateLimitError } from "../lib/errors.js";

const DEFAULT_INITIAL_DELAY = 1000;
const DEFAULT_MAX_DELAY = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MULTIPLIER = 2;

export interface RetryOptions {
	maxRetries?: number;
	initialDelay?: number;
	maxDelay?: number;
	multiplier?: number;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
	const initialDelay = options?.initialDelay ?? DEFAULT_INITIAL_DELAY;
	const maxDelay = options?.maxDelay ?? DEFAULT_MAX_DELAY;
	const multiplier = options?.multiplier ?? DEFAULT_MULTIPLIER;

	let lastError: Error | undefined;
	let delay = initialDelay;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));

			// Don't retry on non-retryable errors
			if (!isRetryable(lastError)) throw lastError;

			if (attempt === maxRetries) break;

			// Use retry-after header value if available
			if (lastError instanceof RateLimitError) {
				delay = lastError.retryAfter * 1000;
			}

			await sleep(Math.min(delay, maxDelay));
			delay *= multiplier;
		}
	}

	throw lastError!;
}

function isRetryable(error: Error): boolean {
	if (error instanceof RateLimitError) return true;

	// Retry on network errors
	if (error.message.includes("ECONNRESET")) return true;
	if (error.message.includes("ETIMEDOUT")) return true;
	if (error.message.includes("ECONNREFUSED")) return true;
	if (error.message.includes("fetch failed")) return true;

	// Retry on 5xx status codes (encoded in LinkedInError)
	if ("statusCode" in error) {
		const status = (error as { statusCode: number }).statusCode;
		return status >= 500 && status < 600;
	}

	return false;
}

/**
 * Simple delay helper for spacing out requests.
 */
export async function delayBetweenRequests(ms = 500): Promise<void> {
	await sleep(ms);
}
