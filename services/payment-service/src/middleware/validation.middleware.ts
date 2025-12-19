import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { errorResponse } from "../utils/response.js";

/**
 * Validation middleware factory
 * Validates request body or params against a Joi schema
 */
export const validate = (schema: ObjectSchema, property: "body" | "params" = "body") => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Get all errors, not just the first one
            stripUnknown: true, // Remove unknown fields
        });

        if (error) {
            const errorMessage = error.details
                .map((detail) => detail.message)
                .join(", ");

            res.status(400).json(
                errorResponse("Validation error", errorMessage)
            );
            return;
        }

        // Replace request data with validated and sanitized data
        req[property] = value;
        next();
    };
};
