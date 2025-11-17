import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create payment
router.post("/", (req, res) => paymentController.createPayment(req, res));

// Check payment (auto-verification with MD5 polling)
// IMPORTANT: Must be before /:id routes to avoid conflict
router.post("/check-payment", (req, res) =>
    paymentController.checkPayment(req, res)
);

// Get user payments
// IMPORTANT: Must be before /:id routes to avoid conflict
router.get("/user/:userId", (req, res) =>
    paymentController.getUserPayments(req, res)
);

// Get booking payments
// IMPORTANT: Must be before /:id routes to avoid conflict
router.get("/booking/:bookingId", (req, res) =>
    paymentController.getBookingPayments(req, res)
);

// Get QR code image
// IMPORTANT: Must be before /:id route to avoid conflict
router.get("/:id/qr-image", (req, res) =>
    paymentController.getQRImage(req, res)
);

// Get payment by ID
// IMPORTANT: Keep this LAST among GET routes with params
router.get("/:id", (req, res) => paymentController.getPaymentById(req, res));

export default router;
