import { z } from 'zod';

export const membersQuerySchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['name', 'totalVisits', 'thisWeek', 'lastVisit', 'status']).default('totalVisits'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

export type MembersQuery = z.infer<typeof membersQuerySchema>;
