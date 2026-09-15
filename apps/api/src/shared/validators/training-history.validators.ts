import { z } from 'zod';

export const createAttendanceSchema = z.object({
  program_id: z.string().uuid(),
  attended_on: z.string().refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date' }),
  participants_count: z.coerce.number().int().min(1).max(10000).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
