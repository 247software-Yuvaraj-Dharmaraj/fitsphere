import type { Request, Response } from 'express';
import * as service from './analytics.service.js';
import { membersQuerySchema } from './analytics.schema.js';

export async function overview(_req: Request, res: Response) {
  res.json(await service.overview());
}

export async function members(req: Request, res: Response) {
  const query = membersQuerySchema.parse(req.query);
  res.json(await service.members(query));
}
