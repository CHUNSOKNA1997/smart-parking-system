import express from 'express';
import ParkingController from '../controllers/parking.controller.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/spots', ParkingController.getAllSpots);
router.get('/spots/available', ParkingController.getAvailableSpots);
router.get('/spots/type/:type', ParkingController.getSpotsByType);
router.get('/spots/:spotId', ParkingController.getSpotById);
router.get('/statistics', ParkingController.getStatistics);

export default router;
