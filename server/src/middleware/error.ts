import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

// Throw this from services/controllers for expected, client-facing errors.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Wraps async route handlers so thrown errors reach the error middleware
// without try/catch in every controller.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // Duplicate key (e.g. email already exists) from Mongo.
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }
  console.error('[error]', err);
  return res.status(500).json({ message: 'Internal server error' });
}
