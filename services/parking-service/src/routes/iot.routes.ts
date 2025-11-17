import express from "express";
import ParkingController from "../controllers/parking.controller.js";
import { authenticateIoT } from "../middleware/iot-auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/iot/spots/{spotId}/status:
 *   patch:
 *     summary: Update parking spot availability status (IoT devices only)
 *     tags: [IoT]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: spotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Parking spot UUID
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: IoT API Key for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: Whether the parking spot is available
 *     responses:
 *       200:
 *         description: Spot status updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid or missing API key
 *       404:
 *         description: Spot not found
 *       500:
 *         description: Server error
 */
router.patch(
    "/spots/:spotId/status",
    authenticateIoT,
    ParkingController.updateSpotStatus
);

export default router;
