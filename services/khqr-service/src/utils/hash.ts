import crypto from "crypto";

/**
 * Generate MD5 hash from a string
 * Used for payment verification with Bakong API
 * @param input - String to hash (typically the QR string)
 * @returns MD5 hash as hexadecimal string
 */
export function generateMD5(input: string): string {
	return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * Validate MD5 hash format
 * @param hash - MD5 hash to validate
 * @returns True if valid MD5 format (32 hex characters)
 */
export function isValidMD5(hash: string): boolean {
	return /^[a-f0-9]{32}$/i.test(hash);
}
