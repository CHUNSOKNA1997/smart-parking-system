import express from "express";
import ParkingController from "../controllers/parking.controller.js";

const router = express.Router();

// Public routes (no auth required)

/**
 * @swagger
 * /api/v1/parking/spots:
 *   get:
 *     summary: Get all parking spots
 *     tags: [Parking]
 *     responses:
 *       200:
 *         description: List of all parking spots
 */
router.get("/spots", ParkingController.getAllSpots);

/**
 * @swagger
 * /api/v1/parking/spots/available:
 *   get:
 *     summary: Get available parking spots
 *     tags: [Parking]
 *     responses:
 *       200:
 *         description: List of available parking spots
 */
router.get("/spots/available", ParkingController.getAvailableSpots);

/**
 * @swagger
 * /api/v1/parking/spots/type/{type}:
 *   get:
 *     summary: Get spots by type
 *     tags: [Parking]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *           enum: [car, motorcycle]
 *         required: true
 *         description: Type of parking spot
 *     responses:
 *       200:
 *         description: List of spots by type
 */
router.get("/spots/type/:type", ParkingController.getSpotsByType);

/**
 * @swagger
 * /api/v1/parking/spots/{spotId}:
 *   get:
 *     summary: Get spot by ID
 *     tags: [Parking]
 *     parameters:
 *       - in: path
 *         name: spotId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the parking spot
 *     responses:
 *       200:
 *         description: Parking spot details
 *       404:
 *         description: Spot not found
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
 *         description: Parking statistics
 */
router.get("/statistics", ParkingController.getStatistics);

export default router;
