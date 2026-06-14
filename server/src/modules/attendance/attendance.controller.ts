import type { Request, Response } from 'express';
import * as service from './attendance.service.js';
import { monthQuerySchema } from './attendance.schema.js';

// Client-supplied UTC offset (minutes east of UTC), clamped to ±14h. Lets
// personal day buckets (streak, calendar, week/month) use the user's local day.
function tzOffset(req: Request): number {
  const n = Number(req.query.tz);
  return Number.isFinite(n) ? Math.max(-840, Math.min(840, n)) : 0;
}

export async function checkIn(req: Request, res: Response) {
  const record = await service.checkIn(req.user!.id);
  res.status(201).json(record);
}

export async function checkOut(req: Request, res: Response) {
  const record = await service.checkOut(req.user!.id);
  res.json(record);
}

export async function summary(req: Request, res: Response) {
  res.json(await service.getSummary(req.user!.id, tzOffset(req)));
}

export async function month(req: Request, res: Response) {
  const { year, month } = monthQuerySchema.parse(req.query);
  res.json(await service.getMonth(req.user!.id, year, month, tzOffset(req)));
}

export async function occupancy(_req: Request, res: Response) {
  res.json(await service.getOccupancy());
}

export async function trend(req: Request, res: Response) {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));
  res.json(await service.getTrend(req.user!.id, days, tzOffset(req)));
}

export async function bestTime(_req: Request, res: Response) {
  res.json(await service.getBestTime());
}
