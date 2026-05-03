import { z } from 'zod';

export const searchProgramsSchema = z.object({
  q: z.string().optional(),
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().optional(),
  delivery_mode: z.enum(['online', 'physical', 'hybrid']).optional(),
  program_type: z.enum(['public', 'in_house', 'both']).optional(),
  skill_type: z.enum(['soft_skills', 'technical', 'both']).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  min_fee: z.coerce.number().min(0).optional(),
  max_fee: z.coerce.number().min(0).optional(),
  min_duration_days: z.coerce.number().min(1).optional(),
  max_duration_days: z.coerce.number().min(1).optional(),
  hrd_corp_claimable: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  is_certification: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  provider_id: z.string().uuid().optional(),
  provider_tier: z.enum(['verified', 'trusted', 'premium']).optional(),
  skill_tags: z.string().optional(), // comma-separated UUIDs
  industry: z.string().optional(),
  sort_by: z
    .enum(['relevance', 'fee_asc', 'fee_desc', 'newest', 'popular', 'rating'])
    .default('relevance'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const autoSuggestSchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().min(1).max(15).default(8),
});

export type SearchProgramsInput = z.infer<typeof searchProgramsSchema>;
export type AutoSuggestInput = z.infer<typeof autoSuggestSchema>;
