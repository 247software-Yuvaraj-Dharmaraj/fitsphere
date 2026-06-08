import type { Request, Response } from 'express';
import * as service from './feedback.service.js';
import { createFeedbackSchema } from './feedback.schema.js';

export async function create(req: Request, res: Response) {
  const input = createFeedbackSchema.parse(req.body);
  res.status(201).json(await service.create(req.user!.id, input));
}

// Member's own feedback timeline.
export async function mine(req: Request, res: Response) {
  res.json(await service.forMember(req.user!.id));
}

// Trainer/admin viewing a specific member's feedback.
export async function forMember(req: Request, res: Response) {
  res.json(await service.forMember(req.params.memberId));
}

export async function members(_req: Request, res: Response) {
  res.json(await service.listMembers());
}
