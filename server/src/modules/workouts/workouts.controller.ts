import type { Request, Response } from 'express';
import * as service from './workouts.service.js';
import { logWorkoutSchema, recentQuerySchema } from './workouts.schema.js';

export async function log(req: Request, res: Response) {
  const input = logWorkoutSchema.parse(req.body);
  res.status(201).json(await service.log(req.user!.id, input));
}

export async function recent(req: Request, res: Response) {
  const { limit } = recentQuerySchema.parse(req.query);
  res.json(await service.recent(req.user!.id, limit));
}

export async function stats(req: Request, res: Response) {
  res.json(await service.stats(req.user!.id));
}
