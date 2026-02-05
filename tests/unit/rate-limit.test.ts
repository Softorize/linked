import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../../src/utils/rate-limit.js";
import { RateLimitError, LinkedInError } from "../../src/lib/errors.js";

describe("withRetry", () => {
	it("should return result on first success", async () => {
		const fn = vi.fn().mockResolvedValue("success");
		const result = await withRetry(fn);
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should retry on RateLimitError", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new RateLimitError(1))
			.mockResolvedValue("success");

		const result = await withRetry(fn, {
			maxRetries: 2,
			initialDelay: 10,
		});
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should not retry on non-retryable errors", async () => {
		const fn = vi
			.fn()
			.mockRejectedValue(new LinkedInError("Not found", 404));

		await expect(
			withRetry(fn, { maxRetries: 3, initialDelay: 10 }),
		).rejects.toThrow("Not found");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should retry on 500 errors", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new LinkedInError("Server error", 500))
			.mockResolvedValue("success");

		const result = await withRetry(fn, {
			maxRetries: 2,
			initialDelay: 10,
		});
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should throw after max retries", async () => {
		const fn = vi.fn().mockRejectedValue(new RateLimitError(1));

		await expect(
			withRetry(fn, { maxRetries: 2, initialDelay: 10 }),
		).rejects.toThrow(RateLimitError);
		expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
	});

	it("should retry on network errors", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("fetch failed"))
			.mockResolvedValue("success");

		const result = await withRetry(fn, {
			maxRetries: 2,
			initialDelay: 10,
		});
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
