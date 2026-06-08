import type { Request, Response } from 'express';
import * as service from './analytics.service.js';

export async function overview(_req: Request, res: Response) {
  res.json(await service.overview());
}

export async function members(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(await service.members(q));
}
