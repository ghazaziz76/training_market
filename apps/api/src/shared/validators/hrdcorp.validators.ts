import { z } from 'zod';

export const createChecklistSchema = z.object({
  program_id: z.string().uuid().optional(),
  proposal_id: z.string().uuid().optional(),
  enquiry_id: z.string().uuid().optional(),
  scheme_code: z.string().min(1),
});

export const updateChecklistItemsSchema = z.object({
  items: z.array(
    z.object({
      item: z.string(),
      status: z.enum(['pending', 'received', 'completed', 'not_applicable']),
      notes: z.string().optional(),
      document_url: z.string().optional(),
    }),
  ),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistItemsInput = z.infer<typeof updateChecklistItemsSchema>;
