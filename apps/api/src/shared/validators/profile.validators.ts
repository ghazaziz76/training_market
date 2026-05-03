import { z } from 'zod';

export const updateEmployerProfileSchema = z.object({
  company_name: z.string().max(255).optional(),
  registration_no: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  contact_person: z.string().max(255).optional(),
  contact_email: z.union([z.string().email(), z.literal('')]).optional(),
  contact_phone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postcode: z.string().max(10).optional(),
  hrd_corp_registered: z.boolean().optional(),
  hrd_corp_levy_balance: z.number().min(0).optional().nullable(),
  training_interests: z.array(z.string()).optional(),
});

export const updateIndividualProfileSchema = z.object({
  occupation: z.string().max(255).optional(),
  education_level: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  skill_interests: z.array(z.string()).optional(),
  career_goals: z.string().optional(),
  preferred_training_mode: z.enum(['online', 'physical', 'hybrid']).optional(),
});

export const updateProviderProfileSchema = z.object({
  provider_name: z.string().max(255).optional(),
  registration_no: z.string().max(100).optional(),
  business_description: z.string().optional(),
  contact_person: z.string().max(255).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postcode: z.string().max(10).optional(),
  website: z.string().max(500).optional(),
  logo_url: z.string().max(500).optional(),
  year_established: z.number().int().min(1900).max(new Date().getFullYear()).optional().nullable(),
  specializations: z.array(z.string()).optional(),
  accreditation_details: z.string().optional(),
  hrd_corp_registered_provider: z.boolean().optional(),
  hrd_corp_provider_id: z.string().max(100).optional(),
  hrd_corp_certificate_url: z.string().max(500).optional().nullable(),
});

export type UpdateEmployerProfileInput = z.infer<typeof updateEmployerProfileSchema>;
export type UpdateIndividualProfileInput = z.infer<typeof updateIndividualProfileSchema>;
export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;
