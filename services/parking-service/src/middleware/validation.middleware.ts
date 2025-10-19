import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { sendError } from "../utils/response.js";

// Joi validation middleware
export const validate = (schema: ObjectSchema) => {
	return (
		req: Request,
		res: Response,
		next: NextFunction
	): void | Response => {
		const { error, value } = schema.validate(req.body, {
			abortEarly: false, // Return all errors
			stripUnknown: true, // Remove unknown fields
		});

		if (error) {
			const errorMessage = error.details
				.map((detail) => detail.message)
				.join(", ");
			return sendError(res, 400, errorMessage);
		}

		// Replace req.body with validated value
		req.body = value;
		next();
	};
};
