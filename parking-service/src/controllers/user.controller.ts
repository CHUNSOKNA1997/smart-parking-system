import UserModel from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

class UserController {
	// Get user profile
	static async getProfile(req, res) {
		try {
			const userId = req.user.userId;

			const user = await UserModel.findById(userId);

			if (!user) {
				return sendError(res, 404, "User not found");
			}

			return sendSuccess(res, 200, "Profile retrieved successfully", {
				user,
			});
		} catch (error) {
			logger.error("Get profile error:", error);
			return sendError(
				res,
				500,
				"Failed to retrieve profile",
				error.message
			);
		}
	}

	// Update user profile
	static async updateProfile(req, res) {
		try {
			const userId = req.user.userId;
			const updates = req.body;

			const user = await UserModel.updateProfile(userId, updates);

			logger.info(`Profile updated for user: ${userId}`);

			return sendSuccess(res, 200, "Profile updated successfully", {
				user,
			});
		} catch (error) {
			logger.error("Update profile error:", error);
			return sendError(
				res,
				500,
				"Failed to update profile",
				error.message
			);
		}
	}
}

export default UserController;
