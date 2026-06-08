import { z } from 'zod';

const now = new Date();

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(now.getUTCFullYear()),
  month: z.coerce.number().int().min(1).max(12).default(now.getUTCMonth() + 1),
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;
