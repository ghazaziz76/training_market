import { z } from 'zod';

export const markAttendedSchema = z.object({
  attended_on: z.string().refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date' }),
  participants_count: z.coerce.number().int().min(1).max(10000).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type MarkAttendedInput = z.infer<typeof markAttendedSchema>;
