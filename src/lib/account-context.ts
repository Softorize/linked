let currentAccount: string | undefined;

export function getCurrentAccount(): string | undefined {
	return currentAccount;
}

export function setCurrentAccount(name: string | undefined): void {
	currentAccount = name;
}
