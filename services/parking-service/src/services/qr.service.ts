import QRCode from "qrcode";
import logger from "../utils/logger.js";
import { QRCodeData } from "../types/index.js";

// Generate QR code for booking
export const generateQRCode = async (
	bookingData: QRCodeData
): Promise<string> => {
	try {
		const { bookingId, spotId, userId, startTime } = bookingData;

		// Create QR code data (JSON string)
		const qrData = JSON.stringify({
			bookingId,
			spotId,
			userId,
			startTime,
			generatedAt: new Date().toISOString(),
		});

		// Generate QR code as base64 data URL
		const qrCodeDataURL = await QRCode.toDataURL(qrData, {
			errorCorrectionLevel: "H",
			type: "image/png",
			width: 300,
			margin: 1,
		});

		logger.info(`QR code generated for booking: ${bookingId}`);
		return qrCodeDataURL;
	} catch (error) {
		logger.error("Error generating QR code:", error);
		throw error;
	}
};

// Generate QR code as buffer (for saving to file)
export const generateQRCodeBuffer = async (
	bookingData: QRCodeData
): Promise<Buffer> => {
	try {
		const { bookingId, spotId, userId, startTime } = bookingData;

		const qrData = JSON.stringify({
			bookingId,
			spotId,
			userId,
			startTime,
			generatedAt: new Date().toISOString(),
		});

		const buffer = await QRCode.toBuffer(qrData, {
			errorCorrectionLevel: "H",
			type: "png",
			width: 300,
		});

		return buffer;
	} catch (error) {
		logger.error("Error generating QR code buffer:", error);
		throw error;
	}
};
