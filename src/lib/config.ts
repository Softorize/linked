import { readFileSync, existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import JSON5 from "json5";
import type { LinkedConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "linked");
const CONFIG_FILE = join(CONFIG_DIR, "config.json5");
const LOCAL_CONFIG_FILE = ".linkedrc.json5";

function loadConfigFile(path: string): LinkedConfig {
	if (!existsSync(path)) return {};
	try {
		const raw = readFileSync(path, "utf-8");
		return JSON5.parse(raw) as LinkedConfig;
	} catch {
		return {};
	}
}

export function loadConfig(): LinkedConfig {
	const global = loadConfigFile(CONFIG_FILE);
	const local = loadConfigFile(LOCAL_CONFIG_FILE);
	return { ...global, ...local };
}

export function saveConfig(config: LinkedConfig): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
	const content = JSON5.stringify(config, null, 2);
	writeFileSync(CONFIG_FILE, content, "utf-8");
	chmodSync(CONFIG_FILE, 0o600);
}

export function getConfigDir(): string {
	return CONFIG_DIR;
}

export function getConfigPath(): string {
	return CONFIG_FILE;
}
