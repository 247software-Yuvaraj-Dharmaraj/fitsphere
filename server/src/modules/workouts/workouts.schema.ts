import { z } from 'zod';
import { WORKOUT_TYPES } from '../../models/index.js';

export const logWorkoutSchema = z.object({
  type: z.enum(WORKOUT_TYPES),
  durationMin: z.coerce.number().int().min(1).max(600),
  date: z.string().datetime().optional(),
});

export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
