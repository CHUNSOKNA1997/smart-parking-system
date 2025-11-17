import type { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.js';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(
    errorResponse(message, err.stack)
  );
};
