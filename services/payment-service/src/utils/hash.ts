import crypto from "crypto";

/**
 * Generates an MD5 hash from a string input.
 * Used primarily for automatic payment verification polling with the Bakong API.
 *
 * @param input - String to hash (typically the KHQR QR code string)
 * @returns MD5 hash as 32-character hexadecimal string
 */
export function generateMD5(input: string): string {
    return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * Validates whether a string is a properly formatted MD5 hash.
 *
 * @param hash - String to validate as MD5 hash
 * @returns True if the string is a valid MD5 format (32 hexadecimal characters)
 */
export function isValidMD5(hash: string): boolean {
    return /^[a-f0-9]{32}$/i.test(hash);
}
