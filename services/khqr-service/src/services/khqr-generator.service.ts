/**
 * KHQR Generator Service
 * Generates valid Bakong QR codes according to EMVCo specification
 */

import QRCode from "qrcode";

interface KHQRConfig {
	merchantId: string;
	merchantName: string;
	accountId: string;
	currency: string;
	storeLabel?: string;
	terminalLabel?: string;
}

interface KHQRGenerateOptions {
	amount?: number;
	currency?: "USD" | "KHR";
	billNumber?: string;
	mobileNumber?: string;
	storeLabel?: string;
	terminalLabel?: string;
}

class KHQRGeneratorService {
	private config: KHQRConfig;

	constructor() {
		this.config = {
			merchantId: process.env.KHQR_MERCHANT_ID || "",
			merchantName: process.env.KHQR_MERCHANT_NAME || "",
			accountId: process.env.KHQR_ACCOUNT_ID || "",
			currency: process.env.KHQR_CURRENCY || "USD",
			storeLabel: process.env.KHQR_STORE_LABEL || "",
			terminalLabel: process.env.KHQR_TERMINAL_LABEL || "",
		};
	}

	/**
	 * Generate KHQR string according to EMVCo specification
	 */
	generateQRString(options: KHQRGenerateOptions): string {
		const {
			amount,
			currency = this.config.currency,
			billNumber,
			mobileNumber,
			storeLabel,
			terminalLabel,
		} = options;

		// Build QR data according to Bakong KHQR specification
		let qrData = "";

		// Payload Format Indicator (Tag 00) - Always "01"
		qrData += this.buildTag("00", "01");

		// Point of Initiation Method (Tag 01)
		// 11 = Static QR, 12 = Dynamic QR
		qrData += this.buildTag("01", amount ? "12" : "11");

		// Merchant Account Information (Tag 29) - Bakong specific
		const merchantInfo = this.buildMerchantInfo();
		qrData += this.buildTag("29", merchantInfo);

		// Merchant Category Code (Tag 52) - e.g., "5814" for parking
		qrData += this.buildTag("52", "5814");

		// Transaction Currency (Tag 53)
		// USD = 840, KHR = 116
		const currencyCode = currency === "USD" ? "840" : "116";
		qrData += this.buildTag("53", currencyCode);

		// Transaction Amount (Tag 54) - Optional for dynamic QR
		if (amount) {
			qrData += this.buildTag("54", amount.toFixed(2));
		}

		// Country Code (Tag 58) - "KH" for Cambodia
		qrData += this.buildTag("58", "KH");

		// Merchant Name (Tag 59)
		qrData += this.buildTag("59", this.config.merchantName);

		// Merchant City (Tag 60)
		qrData += this.buildTag("60", "PHNOM PENH");

		// Additional Data Field (Tag 62)
		if (billNumber || mobileNumber || storeLabel || terminalLabel) {
			const additionalData = this.buildAdditionalData({
				billNumber,
				mobileNumber,
				storeLabel: storeLabel || this.config.storeLabel,
				terminalLabel: terminalLabel || this.config.terminalLabel,
			});
			qrData += this.buildTag("62", additionalData);
		}

		// CRC (Tag 63) - Must be last, calculated over all previous data
		const crc = this.calculateCRC(qrData + "6304");
		qrData += "6304" + crc;

		return qrData;
	}

	/**
	 * Generate QR code image as base64 data URL
	 */
	async generateQRImage(qrString: string): Promise<string> {
		try {
			const dataUrl = await QRCode.toDataURL(qrString, {
				errorCorrectionLevel: "M",
				type: "image/png",
				width: 300,
				margin: 2,
			});
			return dataUrl;
		} catch (error) {
			throw new Error("Failed to generate QR image: " + error);
		}
	}

	/**
	 * Generate QR code image as buffer (for file storage)
	 */
	async generateQRBuffer(qrString: string): Promise<Buffer> {
		try {
			const buffer = await QRCode.toBuffer(qrString, {
				errorCorrectionLevel: "M",
				type: "png",
				width: 300,
				margin: 2,
			});
			return buffer;
		} catch (error) {
			throw new Error("Failed to generate QR buffer: " + error);
		}
	}

	/**
	 * Build merchant info according to Bakong specification
	 */
	private buildMerchantInfo(): string {
		let merchantInfo = "";

		// Global Unique Identifier (Tag 00) - Bakong identifier
		merchantInfo += this.buildTag("00", "kh.gov.nbc.bakong");

		// Merchant ID (Tag 01)
		merchantInfo += this.buildTag("01", this.config.merchantId);

		// Account ID (Tag 02)
		merchantInfo += this.buildTag("02", this.config.accountId);

		return merchantInfo;
	}

	/**
	 * Build additional data field
	 */
	private buildAdditionalData(data: {
		billNumber?: string;
		mobileNumber?: string;
		storeLabel?: string;
		terminalLabel?: string;
	}): string {
		let additionalData = "";

		// Bill Number (Tag 01)
		if (data.billNumber) {
			additionalData += this.buildTag("01", data.billNumber);
		}

		// Mobile Number (Tag 02)
		if (data.mobileNumber) {
			additionalData += this.buildTag("02", data.mobileNumber);
		}

		// Store Label (Tag 03)
		if (data.storeLabel) {
			additionalData += this.buildTag("03", data.storeLabel);
		}

		// Terminal Label (Tag 07)
		if (data.terminalLabel) {
			additionalData += this.buildTag("07", data.terminalLabel);
		}

		return additionalData;
	}

	/**
	 * Build TLV (Tag-Length-Value) format
	 */
	private buildTag(tag: string, value: string): string {
		const length = value.length.toString().padStart(2, "0");
		return tag + length + value;
	}

	/**
	 * Calculate CRC16-CCITT checksum
	 */
	private calculateCRC(data: string): string {
		let crc = 0xffff;
		const polynomial = 0x1021;

		for (let i = 0; i < data.length; i++) {
			const byte = data.charCodeAt(i);
			crc ^= byte << 8;

			for (let j = 0; j < 8; j++) {
				if (crc & 0x8000) {
					crc = (crc << 1) ^ polynomial;
				} else {
					crc = crc << 1;
				}
			}
		}

		crc = crc & 0xffff;
		return crc.toString(16).toUpperCase().padStart(4, "0");
	}

	/**
	 * Validate configuration
	 */
	validateConfig(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.config.merchantId) {
			errors.push("KHQR_MERCHANT_ID is not configured");
		}
		if (!this.config.merchantName) {
			errors.push("KHQR_MERCHANT_NAME is not configured");
		}
		if (!this.config.accountId) {
			errors.push("KHQR_ACCOUNT_ID is not configured");
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}

export const khqrGenerator = new KHQRGeneratorService();
export default KHQRGeneratorService;
