import { z } from 'zod';

const agendaSlotSchema = z.object({
  module_title: z.string().max(500),
  description: z.string().max(2000).optional(),
  is_break: z.boolean().optional(),
});

const agendaDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().max(255).optional(),
  slots: z.array(agendaSlotSchema),
});

export const createProgramSchema = z.object({
  // Core fields
  title: z.string().min(3).max(500),
  description: z.string().min(20),
  objective: z.string().optional(),
  target_group: z.string().optional(),
  category_id: z.string().uuid(),
  subcategory_id: z.string().uuid().optional(),
  custom_category: z.string().max(255).optional(),
  duration_hours: z.number().int().min(1).optional(),
  duration_days: z.number().int().min(1).optional(),

  // Type & pricing
  program_type: z.enum(['public', 'in_house', 'both']).default('public'),
  fee_per_pax: z.number().min(0).optional(),
  fee_per_group: z.number().min(0).optional(),
  min_group_size: z.number().int().min(1).optional(),
  max_group_size: z.number().int().min(1).optional(),
  early_bird_fee: z.number().min(0).optional(),
  fee_notes: z.string().optional(),

  // Agenda
  agenda: z.array(agendaDaySchema).optional(),

  // Classification
  skill_type: z.enum(['soft_skills', 'technical', 'both']).default('technical'),
  is_certification: z.boolean().default(false),
  certification_name: z.string().max(255).optional(),
  certification_body: z.string().max(255).optional(),
  certification_doc_url: z.string().max(500).optional().nullable(),

  // Additional
  short_description: z.string().max(500).optional(),
  prerequisites: z.string().optional(),
  industry_focus: z.array(z.string()).optional(),
  delivery_mode: z.enum(['online', 'physical', 'hybrid']),
  location: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  min_participants: z.number().int().min(1).optional(),
  max_participants: z.number().int().min(1).optional(),
  language: z.string().max(50).default('English'),
  materials_provided: z.string().optional(),
  skill_tag_ids: z.array(z.string().uuid()).optional(),

  // HRD Corp
  hrd_corp_claimable: z.boolean().default(false),
  hrd_corp_scheme: z.string().max(100).optional(),
  hrd_corp_program_id: z.string().max(100).optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export const listProgramsSchema = z.object({
  status: z.string().optional(),
  category_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  sort_by: z.enum(['created_at', 'title', 'fee_per_pax', 'view_count']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ListProgramsInput = z.infer<typeof listProgramsSchema>;
