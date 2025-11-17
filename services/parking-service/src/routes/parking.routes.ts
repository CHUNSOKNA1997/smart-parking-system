import express from "express";
import ParkingController from "../controllers/parking.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/parking/spots:
 *   get:
 *     summary: Get all parking spots
 *     tags: [Parking]
 *     responses:
 *       200:
 *         description: List of all parking spots
 *       500:
 *         description: Server error
 */
router.get("/spots", ParkingController.getAllSpots);

/**
 * @swagger
 * /api/v1/parking/spots/available:
 *   get:
 *     summary: Get all available parking spots
 *     tags: [Parking]
 *     responses:
 *       200:
 *         description: List of available parking spots
 *       500:
 *         description: Server error
 */
router.get("/spots/available", ParkingController.getAvailableSpots);

/**
 * @swagger
 * /api/v1/parking/spots/type/{type}:
 *   get:
 *     summary: Get parking spots by type
 *     tags: [Parking]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CAR, MOTORCYCLE]
 *     responses:
 *       200:
 *         description: List of parking spots by type
 *       400:
 *         description: Invalid spot type
 *       500:
 *         description: Server error
 */
router.get("/spots/type/:type", ParkingController.getSpotsByType);

/**
 * @swagger
 * /api/v1/parking/spots/{spotId}:
 *   get:
 *     summary: Get parking spot by ID
 *     tags: [Parking]
 *     parameters:
 *       - in: path
 *         name: spotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Parking spot details
 *       404:
 *         description: Spot not found
 *       500:
 *         description: Server error
 */
router.get("/spots/:spotId", ParkingController.getSpotById);

/**
 * @swagger
 * /api/v1/parking/statistics:
 *   get:
 *     summary: Get parking statistics
 *     tags: [Parking]
 *     responses:
 *       200:
 *         description: Parking statistics (total spots, available, occupied)
 *       500:
 *         description: Server error
 */
router.get("/statistics", ParkingController.getStatistics);

export default router;
