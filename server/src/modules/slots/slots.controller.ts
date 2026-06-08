import type { Request, Response } from 'express';
import * as service from './slots.service.js';
import { createSlotSchema, dateQuerySchema } from './slots.schema.js';

export async function list(req: Request, res: Response) {
  const { date } = dateQuerySchema.parse(req.query);
  res.json(await service.listByDate(req.user!.id, date));
}

export async function book(req: Request, res: Response) {
  res.json(await service.book(req.params.id, req.user!.id));
}

export async function cancel(req: Request, res: Response) {
  res.json(await service.cancel(req.params.id, req.user!.id));
}

export async function create(req: Request, res: Response) {
  const input = createSlotSchema.parse(req.body);
  res.status(201).json(await service.create(input));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  res.status(204).send();
}
