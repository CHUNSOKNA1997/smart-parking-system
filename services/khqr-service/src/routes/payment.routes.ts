import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create payment
router.post("/", (req, res) => paymentController.createPayment(req, res));

// Get payment by ID
router.get("/:id", (req, res) => paymentController.getPaymentById(req, res));

// Verify payment (manual with transaction hash)
router.post("/:id/verify", (req, res) =>
	paymentController.verifyPayment(req, res)
);

// Check payment (auto-verification with MD5 polling)
router.post("/check-payment", (req, res) =>
	paymentController.checkPayment(req, res)
);

// Get user payments
router.get("/user/:userId", (req, res) =>
	paymentController.getUserPayments(req, res)
);

// Get booking payments
router.get("/booking/:bookingId", (req, res) =>
	paymentController.getBookingPayments(req, res)
);

// Get QR code image
router.get("/:id/qr-image", (req, res) =>
	paymentController.getQRImage(req, res)
);

export default router;
