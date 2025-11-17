import { Request, Response } from "../types/index.js";
import ParkingSpotModel from "../models/ParkingSpot.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { SpotType } from "@prisma/client";

class ParkingController {
    // Get all parking spots
    static async getAllSpots(req: Request, res: Response): Promise<Response> {
        try {
            const spots = await ParkingSpotModel.findAll();

            return sendSuccess(
                res,
                200,
                "Parking spots retrieved successfully",
                { spots }
            );
        } catch (error) {
            console.error("Get all spots error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve parking spots",
                error.message
            );
        }
    }

    // Get available spots only
    static async getAvailableSpots(
        req: Request,
        res: Response
    ): Promise<Response> {
        try {
            const spots = await ParkingSpotModel.findAvailable();

            return sendSuccess(
                res,
                200,
                "Available spots retrieved successfully",
                {
                    spots,
                    count: spots.length,
                }
            );
        } catch (error) {
            console.error("Get available spots error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve available spots",
                error.message
            );
        }
    }

    // Get spot by ID
    static async getSpotById(req: Request, res: Response): Promise<Response> {
        try {
            const { spotId } = req.params;

            const spot = await ParkingSpotModel.findById(spotId);

            if (!spot) {
                return sendError(res, 404, "Parking spot not found");
            }

            return sendSuccess(
                res,
                200,
                "Parking spot retrieved successfully",
                { spot }
            );
        } catch (error) {
            console.error("Get spot by ID error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve parking spot",
                error.message
            );
        }
    }

    // Get spots by type (car/motorcycle)
    static async getSpotsByType(
        req: Request,
        res: Response
    ): Promise<Response> {
        try {
            const { type } = req.params;
            const typeUpper = type.toUpperCase() as SpotType;

            if (!Object.values(SpotType).includes(typeUpper)) {
                return sendError(
                    res,
                    400,
                    `Invalid spot type. Must be one of: ${Object.values(
                        SpotType
                    ).join(", ")}`
                );
            }

            const spots = await ParkingSpotModel.findByType(typeUpper);

            return sendSuccess(
                res,
                200,
                `${type} spots retrieved successfully`,
                {
                    spots,
                    count: spots.length,
                }
            );
        } catch (error) {
            console.error("Get spots by type error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve parking spots",
                error.message
            );
        }
    }

    // Get parking statistics
    static async getStatistics(req: Request, res: Response): Promise<Response> {
        try {
            const stats = await ParkingSpotModel.getStatistics();

            return sendSuccess(res, 200, "Statistics retrieved successfully", {
                statistics: stats,
            });
        } catch (error) {
            console.error("Get statistics error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve statistics",
                error.message
            );
        }
    }
}

export default ParkingController;
