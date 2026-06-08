import { z } from 'zod';

export const createFeedbackSchema = z.object({
  memberId: z.string().min(1, 'memberId is required'),
  note: z.string().min(1, 'Feedback note is required').max(1000),
  weekOf: z.string().datetime().optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
