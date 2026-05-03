import { z } from 'zod';

export const createEnquirySchema = z.object({
  provider_id: z.string().uuid(),
  program_id: z.string().uuid().optional(),
  enquiry_type: z.enum(['general', 'quotation_request', 'enrolment_request', 'custom_training']),
  subject: z.string().min(3).max(500),
  message: z.string().min(10).max(5000),
  participant_count: z.number().int().min(1).optional(),
  preferred_dates: z.string().max(255).optional(),
  budget_range: z.string().max(100).optional(),
});

export const replyEnquirySchema = z.object({
  message: z.string().min(1).max(5000),
  attachments: z
    .array(
      z.object({
        file_name: z.string(),
        file_url: z.string(),
        file_type: z.string(),
        file_size: z.number().optional(),
      }),
    )
    .max(5)
    .default([]),
});

export const listEnquiriesSchema = z.object({
  status: z.string().optional(),
  enquiry_type: z.string().optional(),
  program_id: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type ReplyEnquiryInput = z.infer<typeof replyEnquirySchema>;
export type ListEnquiriesInput = z.infer<typeof listEnquiriesSchema>;
