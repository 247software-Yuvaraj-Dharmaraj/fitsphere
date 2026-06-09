import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

export const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});

export const createSlotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'startTime must be HH:MM'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:MM'),
    capacity: z.coerce.number().int().min(1).max(500),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

export const updateSlotSchema = z
  .object({
    startTime: z.string().regex(timeRegex, 'startTime must be HH:MM'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:MM'),
    capacity: z.coerce.number().int().min(1).max(500),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
