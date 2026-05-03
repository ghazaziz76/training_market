import { z } from 'zod';

export const createBroadcastSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  target_audience: z.string().optional(),
  participant_count: z.number().int().min(1),
  training_days: z.number().int().min(1).default(1),
  training_type: z.enum(['public', 'in_house']).default('public'),
  preferred_mode: z.enum(['online', 'physical', 'hybrid', 'any']).default('any'),
  preferred_location: z.string().max(255).optional(),
  preferred_dates: z.string().max(255).optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  industry_context: z.string().max(255).optional(),
  target_skills: z.array(z.string()).default([]),
  response_deadline: z.string().refine((d) => {
    const deadline = new Date(d);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    return deadline >= minDate;
  }, 'Deadline must be at least 3 days from now'),
});

export const listBroadcastFeedSchema = z.object({
  status: z.string().default('open'),
  industry: z.string().optional(),
  skill_topic: z.string().optional(),
  min_budget: z.coerce.number().optional(),
  max_budget: z.coerce.number().optional(),
  preferred_mode: z.string().optional(),
  location: z.string().optional(),
  sort_by: z.enum(['newest', 'deadline', 'relevance']).default('newest'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const submitProposalSchema = z.object({
  program_id: z.string().uuid().optional(),
  proposal_message: z.string().min(20).max(5000),
  fee_per_pax: z.number().min(0).optional(),
  fee_per_group: z.number().min(0).optional(),
  proposed_fee: z.number().min(0),
  fee_breakdown: z.string().optional(),
  proposed_schedule: z.string().min(1).max(500),
  proposed_duration: z.string().max(255).optional(),
  trainer_details: z.string().optional(),
  value_add_offers: z
    .array(z.object({
      type: z.string(),
      description: z.string(),
    }))
    .default([]),
  attachments: z
    .array(z.object({
      file_name: z.string(),
      file_url: z.string(),
      file_type: z.string(),
      file_size: z.number().optional(),
    }))
    .default([]),
});

export const reviewProposalSchema = z.object({
  reason: z.string().optional(),
});

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
export type ListBroadcastFeedInput = z.infer<typeof listBroadcastFeedSchema>;
export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;
