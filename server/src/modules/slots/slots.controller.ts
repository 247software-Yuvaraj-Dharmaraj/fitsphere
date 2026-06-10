import type { Request, Response } from 'express';
import * as service from './slots.service.js';
import { bulkDeleteSchema, createSlotSchema, dateQuerySchema, updateSlotSchema } from './slots.schema.js';

export async function list(req: Request, res: Response) {
  const { date } = dateQuerySchema.parse(req.query);
  res.json(await service.listByDate(req.user!.id, date));
}

export async function myBookings(req: Request, res: Response) {
  res.json(await service.myBookings(req.user!.id));
}

export async function book(req: Request, res: Response) {
  res.json(await service.book(req.params.id, req.user!.id));
}

export async function cancel(req: Request, res: Response) {
  res.json(await service.cancel(req.params.id, req.user!.id));
}

export async function joinWaitlist(req: Request, res: Response) {
  res.json(await service.joinWaitlist(req.params.id, req.user!.id));
}

export async function leaveWaitlist(req: Request, res: Response) {
  res.json(await service.leaveWaitlist(req.params.id, req.user!.id));
}

export async function create(req: Request, res: Response) {
  const input = createSlotSchema.parse(req.body);
  res.status(201).json(await service.create(input));
}

export async function update(req: Request, res: Response) {
  const input = updateSlotSchema.parse(req.body);
  res.json(await service.update(req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  res.status(204).send();
}

export async function bulkRemove(req: Request, res: Response) {
  const { ids } = bulkDeleteSchema.parse(req.body);
  res.json(await service.bulkRemove(ids));
}
