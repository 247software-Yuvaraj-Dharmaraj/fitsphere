import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from './error.js';
import type { Role } from '../models/index.js';

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

// Verifies the Bearer access token and attaches req.user.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required');
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

// Role-based guard. Mirrors the production pattern: explicit allow-list, no
// implicit elevation. Use after requireAuth.
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    if (!allowed.includes(req.user.role)) {
      throw new HttpError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}
