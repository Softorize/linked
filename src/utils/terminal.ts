const isColorSupported =
	process.env["NO_COLOR"] === undefined &&
	process.env["TERM"] !== "dumb" &&
	process.stdout.isTTY === true;

const isHyperlinkSupported = isColorSupported;

// ── ANSI Color Codes ──

function code(open: number, close: number): (text: string) => string {
	if (!isColorSupported) return (text: string) => text;
	return (text: string) => `\x1b[${open}m${text}\x1b[${close}m`;
}

export const bold = code(1, 22);
export const dim = code(2, 22);
export const italic = code(3, 23);
export const underline = code(4, 24);
export const red = code(31, 39);
export const green = code(32, 39);
export const yellow = code(33, 39);
export const blue = code(34, 39);
export const magenta = code(35, 39);
export const cyan = code(36, 39);
export const gray = code(90, 39);
export const white = code(37, 39);

// ── Terminal Hyperlinks (OSC 8) ──

export function link(url: string, text: string): string {
	if (!isHyperlinkSupported) return text;
	return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

// ── Spinner ──

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
	private frame = 0;
	private interval: ReturnType<typeof setInterval> | null = null;
	private message: string;

	constructor(message: string) {
		this.message = message;
	}

	start(): void {
		if (!isColorSupported) {
			process.stderr.write(`${this.message}...\n`);
			return;
		}
		this.interval = setInterval(() => {
			const frame = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
			process.stderr.write(`\r${cyan(frame!)} ${this.message}`);
			this.frame++;
		}, 80);
	}

	stop(success = true): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		if (isColorSupported) {
			const icon = success ? green("✓") : red("✗");
			process.stderr.write(`\r${icon} ${this.message}\n`);
		}
	}

	update(message: string): void {
		this.message = message;
	}
}

// ── Misc ──

export function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

export function indent(text: string, spaces = 2): string {
	const pad = " ".repeat(spaces);
	return text
		.split("\n")
		.map((line) => `${pad}${line}`)
		.join("\n");
}

export function separator(char = "─", length = 60): string {
	return dim(char.repeat(length));
}

export function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	const years = Math.floor(months / 12);
	return `${years}y ago`;
}
