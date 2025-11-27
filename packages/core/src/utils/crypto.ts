// @ts-nocheck
import { argon2id } from "@noble/hashes/argon2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import type {CryptoKey} from "jose";

/**
 * Hash password with Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
	const salt: Uint8Array<ArrayBufferLike> = randomBytes(16);
	const hash: Uint8Array<ArrayBufferLike> = argon2id(password, salt, {
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
		const combined: Uint8Array<ArrayBuffer> = Uint8Array.from(atob(hashedPassword), (c: string): number =>
			c.charCodeAt(0),
		);
		const salt: Uint8Array<ArrayBuffer> = combined.slice(0, 16);
		const storedHash: Uint8Array<ArrayBuffer> = combined.slice(16);

		const hash: Uint8Array<ArrayBufferLike> = argon2id(password, salt, {
			m: 65536,
			t: 3,
			p: 4,
		});

		// Constant-time comparison
		if (hash.length !== storedHash.length) return false;
		let diff: number = 0;
		for (let i: number = 0; i < hash.length; i++) {
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
	const key: CryptoKey = await crypto.subtle.importKey(
		"raw",
		hexToBytes(keyHex) as BufferSource,
		{ name: "AES-GCM" },
		false,
		["encrypt"],
	);

	const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array;
	const encoded: Uint8Array<ArrayBuffer> = new TextEncoder().encode(data);

	const encrypted: ArrayBuffer = await crypto.subtle.encrypt(
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
	const key: CryptoKey = await crypto.subtle.importKey(
		"raw",
		hexToBytes(keyHex) as BufferSource,
		{ name: "AES-GCM" },
		false,
		["decrypt"],
	);

	const combined: Uint8Array<ArrayBuffer> = Uint8Array.from(atob(encryptedData), (c: string): number => c.charCodeAt(0));
	const iv: Uint8Array<ArrayBuffer> = combined.slice(0, 12);
	const encrypted: Uint8Array<ArrayBuffer> = combined.slice(12);

	const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
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
	const bytes: Uint8Array<ArrayBufferLike> = randomBytes(16);
	const hex: string = Array.from(bytes)
		.map((b: number): string => b.toString(16).padStart(2, "0"))
		.join("");
	return `${prefix}_${hex}`;
}

/**
 * Generate random token
 */
export function generateToken(): string {
	const bytes: Uint8Array<ArrayBufferLike> = randomBytes(32);
	return btoa(String.fromCharCode(...bytes));
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i: number = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}
