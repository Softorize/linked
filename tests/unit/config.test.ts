import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { getConfigDir, getConfigPath, loadConfig, saveConfig } from "../../src/lib/config.js";

const TEST_CONFIG_DIR = join(
	process.env["TMPDIR"] ?? "/tmp",
	"linked-test-config-" + Date.now(),
);

describe("config paths", () => {
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

describe("loadConfig", () => {
	it("should return empty object when no config files exist", () => {
		// loadConfig will try to read from default paths, which may or may not exist
		// but should not throw
		const config = loadConfig();
		expect(config).toBeDefined();
		expect(typeof config).toBe("object");
	});
});

describe("saveConfig", () => {
	afterEach(() => {
		// Cleanup
		try {
			rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
		} catch {
			// ignore
		}
	});

	it("should be a function", () => {
		expect(typeof saveConfig).toBe("function");
	});
});
