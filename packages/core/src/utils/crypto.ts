import { argon2id } from "@noble/hashes/argon2.js";
import { randomBytes } from "@noble/hashes/utils.js";

/**
 * Hash password with Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = argon2id(password, salt, {
		m: 65536, // 64 MB
		t: 3, // 3 iterations
		p: 4, // 4 parallelism
	});

	// Combine salt + hash and encode as base64
	const combined = new Uint8Array(salt.length + hash.length);
	combined.set(salt);
	combined.set(hash, salt.length);

	return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
	password: string,
	hashedPassword: string,
): Promise<boolean> {
	try {
		const combined = Uint8Array.from(atob(hashedPassword), (c) =>
			c.charCodeAt(0),
		);
		const salt = combined.slice(0, 16);
		const storedHash = combined.slice(16);

		const hash = argon2id(password, salt, {
			m: 65536,
			t: 3,
			p: 4,
		});

		// Constant-time comparison
		if (hash.length !== storedHash.length) return false;
		let diff = 0;
		for (let i = 0; i < hash.length; i++) {
			diff |= (hash[i] ?? 0) ^ (storedHash[i] ?? 0);
		}
		return diff === 0;
	} catch {
		return false;
	}
}

/**
 * Encrypt data with AES-256-GCM
 */
export async function encrypt(data: string, keyHex: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		hexToBytes(keyHex) as BufferSource,
		{ name: "AES-GCM" },
		false,
		["encrypt"],
	);

	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(data);

	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encoded,
	);

	// Combine iv + encrypted and encode as base64
	const combined = new Uint8Array(iv.length + encrypted.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(encrypted), iv.length);

	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decrypt(
	encryptedData: string,
	keyHex: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		hexToBytes(keyHex) as BufferSource,
		{ name: "AES-GCM" },
		false,
		["decrypt"],
	);

	const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const encrypted = combined.slice(12);

	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		encrypted,
	);

	return new TextDecoder().decode(decrypted);
}

/**
 * Generate random ID
 */
export function generateId(prefix: string): string {
	const bytes = randomBytes(16);
	const hex = Array.from(bytes)
		.map((b: number) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${prefix}_${hex}`;
}

/**
 * Generate random token
 */
export function generateToken(): string {
	const bytes = randomBytes(32);
	return btoa(String.fromCharCode(...bytes));
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}
