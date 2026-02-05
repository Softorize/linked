import { describe, it, expect, beforeEach } from "vitest";
import {
	getCurrentAccount,
	setCurrentAccount,
} from "../../src/lib/account-context.js";

describe("account-context", () => {
	beforeEach(() => {
		setCurrentAccount(undefined);
	});

	it("should return undefined by default", () => {
		expect(getCurrentAccount()).toBeUndefined();
	});

	it("should return the account name after setting it", () => {
		setCurrentAccount("foo");
		expect(getCurrentAccount()).toBe("foo");
	});

	it("should reset to undefined when set to undefined", () => {
		setCurrentAccount("bar");
		expect(getCurrentAccount()).toBe("bar");
		setCurrentAccount(undefined);
		expect(getCurrentAccount()).toBeUndefined();
	});
});
