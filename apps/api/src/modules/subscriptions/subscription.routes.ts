import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  checkoutSchema,
  autoRenewSchema,
  adminSubscriptionActionSchema,
} from '../../shared/validators/subscription.validators.js';
import * as subscriptionService from './subscription.service.js';

export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /api/subscriptions/plans — public
  app.get('/plans', async (_request, reply) => {
    const plans = await subscriptionService.listPlans();
    return reply.send({ success: true, data: plans });
  });

  // POST /api/subscriptions/checkout — provider initiates payment
  app.post('/checkout', {
    preHandler: [authenticate, requireRole('provider'), validate(checkoutSchema)],
    handler: async (request, reply) => {
      const { plan_code } = request.body as { plan_code: string };
      const result = await subscriptionService.initiateCheckout(request.user!.user_id, plan_code);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/subscriptions/webhook — payment gateway callback (no auth, verified by signature)
  app.post('/webhook', async (request, reply) => {
    // In production: verify Stripe webhook signature
    // const sig = request.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(request.rawBody, sig, env.STRIPE_WEBHOOK_SECRET);

    const body = request.body as any;

    // Simulate: direct payment confirmation
    if (body.subscription_id) {
      await subscriptionService.processPaymentSuccess(
        body.subscription_id,
        body.transaction_id,
        body.gateway_ref,
      );
    }

    return reply.send({ received: true });
  });

  // POST /api/subscriptions/simulate-payment — dev only: simulate successful payment
  app.post('/simulate-payment', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const { subscription_id, transaction_id } = request.body as {
        subscription_id: string;
        transaction_id?: string;
      };
      const result = await subscriptionService.processPaymentSuccess(
        subscription_id,
        transaction_id,
        `SIM-${Date.now()}`,
      );
      return reply.send({ success: true, data: result, message: 'Payment simulated successfully' });
    },
  });

  // GET /api/subscriptions/my-subscription — provider's current subscription
  app.get('/my-subscription', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const data = await subscriptionService.getMySubscription(request.user!.user_id);
      return reply.send({ success: true, data });
    },
  });

  // PUT /api/subscriptions/auto-renew — toggle auto renewal
  app.put('/auto-renew', {
    preHandler: [authenticate, requireRole('provider'), validate(autoRenewSchema)],
    handler: async (request, reply) => {
      const { auto_renew } = request.body as { auto_renew: boolean };
      const result = await subscriptionService.toggleAutoRenew(request.user!.user_id, auto_renew);
      return reply.send({ success: true, data: result });
    },
  });

  // GET /api/subscriptions/payment-history — provider's payment history
  app.get('/payment-history', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const data = await subscriptionService.getPaymentHistory(request.user!.user_id);
      return reply.send({ success: true, data });
    },
  });
}

// Admin billing routes
export async function adminBillingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  // GET /api/admin/subscriptions
  app.get('/subscriptions', async (request, reply) => {
    const q = request.query as any;
    const result = await subscriptionService.adminListSubscriptions(
      q.status,
      Number(q.page) || 1,
      Number(q.limit) || 20,
    );
    return reply.send({ success: true, ...result });
  });

  // GET /api/admin/subscriptions/revenue
  app.get('/subscriptions/revenue', async (_request, reply) => {
    const stats = await subscriptionService.adminRevenueStats();
    return reply.send({ success: true, data: stats });
  });

  // PUT /api/admin/subscriptions/:subscription_id/action
  app.put('/subscriptions/:subscription_id/action', {
    preHandler: [validate(adminSubscriptionActionSchema)],
    handler: async (request, reply) => {
      const { subscription_id } = request.params as { subscription_id: string };
      const { action, extend_days, reason } = request.body as any;
      const result = await subscriptionService.adminSubscriptionAction(
        request.user!.user_id,
        subscription_id,
        action,
        extend_days,
        reason,
      );
      return reply.send({ success: true, data: result });
    },
  });
}
