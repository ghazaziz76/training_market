import { z } from 'zod';

export const adminListUsersSchema = z.object({
  role: z.enum(['employer', 'individual', 'provider', 'admin']).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  sort_by: z.enum(['created_at', 'full_name', 'last_login_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().optional(),
});

export const verifyProviderSchema = z.object({
  verification_status: z.enum(['verified', 'rejected']),
  verification_notes: z.string().optional(),
});

export type AdminListUsersInput = z.infer<typeof adminListUsersSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type VerifyProviderInput = z.infer<typeof verifyProviderSchema>;
