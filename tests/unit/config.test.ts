import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { getConfigDir, getConfigPath } from "../../src/lib/config.js";

describe("config", () => {
	it("should return config dir under home directory", () => {
		const dir = getConfigDir();
		expect(dir).toBe(join(homedir(), ".config", "linked"));
	});

	it("should return config path under config dir", () => {
		const path = getConfigPath();
		expect(path).toBe(
			join(homedir(), ".config", "linked", "config.json5"),
		);
	});
});
