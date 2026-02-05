import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CookieExtractionError } from "./errors.js";
import type { CookieSet, CookieSource } from "./types.js";

/**
 * Extract LinkedIn cookies from a browser's cookie store.
 * Supports Safari, Chrome, and Firefox on macOS.
 */

interface CookieRow {
	name: string;
	value: string;
}

function extractFromSafari(): CookieSet | null {
	const cookieDb = join(homedir(), "Library/Cookies/Cookies.binarycookies");
	if (!existsSync(cookieDb)) return null;

	try {
		// Use sqlite3 on the Safari cookie jar (on newer macOS, may need Full Disk Access)
		// Safari stores cookies in a binary plist format. We use a python snippet to parse it.
		const script = `
import http.cookiejar
import sqlite3, os, json
db_path = os.path.expanduser("~/Library/Cookies/Cookies.binarycookies")
# Fallback: try the Safari Cookies.db sqlite approach
safari_db = os.path.expanduser("~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.db")
cookies = {}
for path in [safari_db]:
    if not os.path.exists(path):
        continue
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("SELECT name, value FROM cookies WHERE domain LIKE '%linkedin.com%' AND (name='li_at' OR name='JSESSIONID' OR name='li_mc' OR name='bcookie' OR name='bscookie')")
        for name, value in cur.fetchall():
            cookies[name] = value
        conn.close()
    except:
        pass
if cookies.get("li_at") and cookies.get("JSESSIONID"):
    print(json.dumps(cookies))
`;
		const result = execSync(`python3 -c '${script}'`, {
			encoding: "utf-8",
			timeout: 5000,
		}).trim();

		if (result) {
			const parsed = JSON.parse(result) as Record<string, string>;
			const li_at = parsed.li_at;
			const jsessionid = parsed.JSESSIONID;
			if (li_at && jsessionid) {
				return {
					li_at,
					jsessionid,
					li_mc: parsed.li_mc || undefined,
					bcookie: parsed.bcookie || undefined,
					bscookie: parsed.bscookie || undefined,
				};
			}
		}
	} catch {
		// Safari extraction failed
	}
	return null;
}

function extractFromChrome(): CookieSet | null {
	const cookieDb = join(homedir(), "Library/Application Support/Google/Chrome/Default/Cookies");
	if (!existsSync(cookieDb)) return null;

	try {
		// Chrome encrypts cookies on macOS using the Keychain.
		// We use a security command to get the safe storage key, then decrypt.
		const script = `
import sqlite3, os, json, subprocess, base64, struct

db_path = os.path.expanduser("~/Library/Application Support/Google/Chrome/Default/Cookies")
if not os.path.exists(db_path):
    exit(1)

# Get Chrome's encryption key from Keychain
try:
    key_bytes = subprocess.check_output(
        ["security", "find-generic-password", "-w", "-s", "Chrome Safe Storage", "-a", "Chrome"],
        stderr=subprocess.DEVNULL
    ).strip()
except:
    exit(1)

import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

encryption_key = hashlib.pbkdf2_hmac("sha1", key_bytes, b"saltysalt", 1003, dklen=16)

def decrypt_cookie(encrypted_value):
    if encrypted_value[:3] == b"v10":
        encrypted_value = encrypted_value[3:]
        iv = b" " * 16
        cipher = Cipher(algorithms.AES(encryption_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(encrypted_value) + decryptor.finalize()
        # Remove PKCS7 padding
        padding_len = decrypted[-1]
        return decrypted[:-padding_len].decode("utf-8")
    return encrypted_value.decode("utf-8")

# Copy database to avoid locking issues
import shutil, tempfile
tmp = tempfile.mktemp(suffix=".db")
shutil.copy2(db_path, tmp)

conn = sqlite3.connect(tmp)
cur = conn.cursor()
cur.execute("SELECT name, encrypted_value, value FROM cookies WHERE host_key LIKE '%linkedin.com%' AND (name='li_at' OR name='JSESSIONID' OR name='li_mc' OR name='bcookie' OR name='bscookie')")
cookies = {}
for name, enc_val, val in cur.fetchall():
    if val:
        cookies[name] = val
    elif enc_val:
        try:
            cookies[name] = decrypt_cookie(enc_val)
        except:
            pass
conn.close()
os.unlink(tmp)

if cookies.get("li_at") and cookies.get("JSESSIONID"):
    print(json.dumps(cookies))
`;
		const result = execSync(`python3 -c '${script}'`, {
			encoding: "utf-8",
			timeout: 10000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		if (result) {
			const parsed = JSON.parse(result) as Record<string, string>;
			const li_at = parsed.li_at;
			const jsessionid = parsed.JSESSIONID;
			if (li_at && jsessionid) {
				return {
					li_at,
					jsessionid,
					li_mc: parsed.li_mc || undefined,
					bcookie: parsed.bcookie || undefined,
					bscookie: parsed.bscookie || undefined,
				};
			}
		}
	} catch {
		// Chrome extraction failed
	}
	return null;
}

function extractFromFirefox(): CookieSet | null {
	const profilesDir = join(homedir(), "Library/Application Support/Firefox/Profiles");
	if (!existsSync(profilesDir)) return null;

	try {
		const script = `
import sqlite3, os, json, glob

profiles_dir = os.path.expanduser("~/Library/Application Support/Firefox/Profiles")
cookies = {}
for profile in glob.glob(os.path.join(profiles_dir, "*")):
    db_path = os.path.join(profile, "cookies.sqlite")
    if not os.path.exists(db_path):
        continue
    try:
        import shutil, tempfile
        tmp = tempfile.mktemp(suffix=".db")
        shutil.copy2(db_path, tmp)
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()
        cur.execute("SELECT name, value FROM moz_cookies WHERE baseDomain LIKE '%linkedin.com%' AND (name='li_at' OR name='JSESSIONID' OR name='li_mc' OR name='bcookie' OR name='bscookie')")
        for name, value in cur.fetchall():
            cookies[name] = value
        conn.close()
        os.unlink(tmp)
    except:
        pass
    if cookies.get("li_at") and cookies.get("JSESSIONID"):
        break

if cookies.get("li_at") and cookies.get("JSESSIONID"):
    print(json.dumps(cookies))
`;
		const result = execSync(`python3 -c '${script}'`, {
			encoding: "utf-8",
			timeout: 5000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		if (result) {
			const parsed = JSON.parse(result) as Record<string, string>;
			const li_at = parsed.li_at;
			const jsessionid = parsed.JSESSIONID;
			if (li_at && jsessionid) {
				return {
					li_at,
					jsessionid,
					li_mc: parsed.li_mc || undefined,
					bcookie: parsed.bcookie || undefined,
					bscookie: parsed.bscookie || undefined,
				};
			}
		}
	} catch {
		// Firefox extraction failed
	}
	return null;
}

const extractors: Record<string, () => CookieSet | null> = {
	safari: extractFromSafari,
	chrome: extractFromChrome,
	firefox: extractFromFirefox,
};

const defaultOrder: CookieSource[] = ["safari", "chrome", "firefox"];

export function extractCookiesFromBrowser(source?: CookieSource): CookieSet {
	if (source && source !== "env" && source !== "config") {
		const extractor = extractors[source];
		if (!extractor) {
			throw new CookieExtractionError(source, "Unknown browser source.");
		}
		const result = extractor();
		if (!result) {
			throw new CookieExtractionError(
				source,
				"Could not find LinkedIn cookies. Make sure you're logged into LinkedIn in that browser.",
			);
		}
		return result;
	}

	for (const browser of defaultOrder) {
		const extractor = extractors[browser];
		if (!extractor) continue;
		const result = extractor();
		if (result) return result;
	}

	throw new CookieExtractionError(
		"any browser",
		"Could not find LinkedIn cookies in Safari, Chrome, or Firefox.\nMake sure you're logged into LinkedIn in at least one browser.",
	);
}
