import { z } from 'zod';

export const checkoutSchema = z.object({
  plan_code: z.string().min(1),
});

export const autoRenewSchema = z.object({
  auto_renew: z.boolean(),
});

export const adminSubscriptionActionSchema = z.object({
  action: z.enum(['extend', 'cancel']),
  extend_days: z.number().int().min(1).optional(),
  reason: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
