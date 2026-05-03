import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { env } from '../../config/env.js';

async function getProviderId(userId: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');
  return provider.provider_id;
}

// ---- List Plans ----

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
  });
}

// ---- Initiate Checkout ----

export async function initiateCheckout(userId: string, planCode: string) {
  const providerId = await getProviderId(userId);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { plan_code: planCode },
  });
  if (!plan || !plan.is_active) throw AppError.notFound('Plan not found');

  // Check if already has active subscription
  const existing = await prisma.subscription.findFirst({
    where: { provider_id: providerId, payment_status: 'active' },
  });
  if (existing) throw AppError.conflict('You already have an active subscription');

  // Create pending subscription
  const subscription = await prisma.subscription.create({
    data: {
      provider_id: providerId,
      plan_id: plan.plan_id,
      payment_status: 'pending',
    },
  });

  // Create pending transaction
  const transaction = await prisma.paymentTransaction.create({
    data: {
      subscription_id: subscription.subscription_id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
    },
  });

  // In production: create Stripe Checkout Session or Billplz Bill
  // For now, return a simulated checkout URL
  const checkoutUrl = env.NODE_ENV === 'production'
    ? await createStripeCheckout(plan, subscription, userId)
    : `http://localhost:3000/provider/subscription/simulate-payment?subscription_id=${subscription.subscription_id}&transaction_id=${transaction.transaction_id}`;

  return {
    checkout_url: checkoutUrl,
    subscription_id: subscription.subscription_id,
    transaction_id: transaction.transaction_id,
  };
}

// Stripe integration placeholder
async function createStripeCheckout(
  plan: any,
  subscription: any,
  _userId: string,
): Promise<string> {
  // TODO: Implement actual Stripe Checkout Session
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'payment',
  //   line_items: [{ price_data: { currency: 'myr', unit_amount: plan.price * 100, product_data: { name: plan.plan_name } }, quantity: 1 }],
  //   success_url: `${WEB_URL}/provider/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${WEB_URL}/provider/subscription/cancelled`,
  //   metadata: { subscription_id: subscription.subscription_id, plan_code: plan.plan_code },
  // });
  // return session.url;
  return `https://checkout.stripe.com/placeholder/${subscription.subscription_id}`;
}

// ---- Process Payment (webhook or simulate) ----

export async function processPaymentSuccess(subscriptionId: string, transactionId?: string, gatewayRef?: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { subscription_id: subscriptionId },
    include: { plan: true, provider: { select: { provider_id: true, user_id: true } } },
  });

  if (!subscription) throw AppError.notFound('Subscription not found');
  if (subscription.payment_status === 'active') return subscription;

  const startDate = new Date();
  const endDate = new Date();
  if (subscription.plan.billing_cycle === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Activate subscription
  await prisma.subscription.update({
    where: { subscription_id: subscriptionId },
    data: {
      payment_status: 'active',
      start_date: startDate,
      end_date: endDate,
      gateway_subscription_id: gatewayRef,
    },
  });

  // Update transaction
  const invoiceNumber = `TM-INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  if (transactionId) {
    await prisma.paymentTransaction.update({
      where: { transaction_id: transactionId },
      data: {
        status: 'completed',
        paid_at: new Date(),
        gateway_ref: gatewayRef,
        invoice_number: invoiceNumber,
        payment_method: 'online',
      },
    });
  } else {
    // Find the pending transaction
    await prisma.paymentTransaction.updateMany({
      where: { subscription_id: subscriptionId, status: 'pending' },
      data: {
        status: 'completed',
        paid_at: new Date(),
        gateway_ref: gatewayRef,
        invoice_number: invoiceNumber,
        payment_method: 'online',
      },
    });
  }

  // Update provider status to active
  await prisma.trainingProvider.update({
    where: { provider_id: subscription.provider_id },
    data: { status: 'active' },
  });

  // Also activate user if pending_subscription
  await prisma.user.updateMany({
    where: { user_id: subscription.provider.user_id, status: 'pending_subscription' },
    data: { status: 'active' },
  });

  // Notify provider
  await prisma.notification.create({
    data: {
      user_id: subscription.provider.user_id,
      type: 'subscription_receipt',
      title: 'Subscription activated!',
      message: `Your ${subscription.plan.plan_name} subscription is now active. Invoice: ${invoiceNumber}`,
      reference_id: subscriptionId,
      reference_type: 'subscription',
      action_url: '/provider/subscription',
    },
  });

  return subscription;
}

// ---- Get My Subscription ----

export async function getMySubscription(userId: string) {
  const providerId = await getProviderId(userId);

  const subscription = await prisma.subscription.findFirst({
    where: { provider_id: providerId },
    orderBy: { created_at: 'desc' },
    include: { plan: true },
  });

  if (!subscription) return null;

  const now = new Date();
  const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Get usage
  const programsPublished = await prisma.trainingProgram.count({
    where: { provider_id: providerId, status: 'published' },
  });

  const featuredUsed = await prisma.featuredListing.count({
    where: {
      provider_id: providerId,
      status: 'active',
      start_date: { lte: now },
      end_date: { gte: now },
    },
  });

  return {
    subscription_id: subscription.subscription_id,
    plan: {
      plan_name: subscription.plan.plan_name,
      plan_code: subscription.plan.plan_code,
      price: subscription.plan.price,
      features: subscription.plan.features,
    },
    payment_status: subscription.payment_status,
    start_date: subscription.start_date,
    end_date: subscription.end_date,
    days_remaining: daysRemaining,
    auto_renew: subscription.auto_renew,
    usage: {
      programs_published: programsPublished,
      max_programs: subscription.plan.max_programs,
      featured_listings_used: featuredUsed,
      max_featured_listings: subscription.plan.max_featured_listings,
    },
  };
}

// ---- Toggle Auto-Renew ----

export async function toggleAutoRenew(userId: string, autoRenew: boolean) {
  const providerId = await getProviderId(userId);

  const subscription = await prisma.subscription.findFirst({
    where: { provider_id: providerId, payment_status: 'active' },
  });
  if (!subscription) throw AppError.notFound('No active subscription');

  await prisma.subscription.update({
    where: { subscription_id: subscription.subscription_id },
    data: { auto_renew: autoRenew },
  });

  return { auto_renew: autoRenew };
}

// ---- Payment History ----

export async function getPaymentHistory(userId: string) {
  const providerId = await getProviderId(userId);

  const subscriptions = await prisma.subscription.findMany({
    where: { provider_id: providerId },
    select: { subscription_id: true },
  });

  const subIds = subscriptions.map((s) => s.subscription_id);

  return prisma.paymentTransaction.findMany({
    where: { subscription_id: { in: subIds } },
    orderBy: { created_at: 'desc' },
    select: {
      transaction_id: true,
      amount: true,
      currency: true,
      payment_method: true,
      status: true,
      invoice_number: true,
      invoice_url: true,
      paid_at: true,
      created_at: true,
    },
  });
}

// ---- Subscription Enforcement Middleware Helper ----

export async function checkActiveSubscription(userId: string): Promise<boolean> {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) return false;

  const subscription = await prisma.subscription.findFirst({
    where: {
      provider_id: provider.provider_id,
      payment_status: 'active',
      end_date: { gte: new Date() },
    },
  });

  return !!subscription;
}

// ---- Admin: List All Subscriptions ----

export async function adminListSubscriptions(
  status?: string,
  page: number = 1,
  limit: number = 20,
) {
  const where: any = {};
  if (status) where.payment_status = status;

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        plan: { select: { plan_name: true, plan_code: true, price: true } },
        provider: { select: { provider_name: true, contact_email: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    data: subscriptions,
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

// ---- Admin: Revenue Stats ----

export async function adminRevenueStats() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const [activeCount, revenueMonth, revenueYear, expiringSoon] = await Promise.all([
    prisma.subscription.count({ where: { payment_status: 'active' } }),
    prisma.paymentTransaction.aggregate({
      where: { status: 'completed', paid_at: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: 'completed', paid_at: { gte: thisYearStart } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: {
        payment_status: 'active',
        end_date: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    total_active: activeCount,
    revenue_this_month: revenueMonth._sum.amount || 0,
    revenue_this_year: revenueYear._sum.amount || 0,
    expiring_soon: expiringSoon,
  };
}

// ---- Admin: Manual Subscription Action ----

export async function adminSubscriptionAction(
  adminUserId: string,
  subscriptionId: string,
  action: 'extend' | 'cancel',
  extendDays?: number,
  reason?: string,
) {
  const subscription = await prisma.subscription.findUnique({
    where: { subscription_id: subscriptionId },
    include: { provider: { select: { user_id: true } } },
  });
  if (!subscription) throw AppError.notFound('Subscription not found');

  if (action === 'extend') {
    if (!extendDays) throw AppError.badRequest('extend_days required');
    const currentEnd = subscription.end_date ? new Date(subscription.end_date) : new Date();
    currentEnd.setDate(currentEnd.getDate() + extendDays);

    await prisma.subscription.update({
      where: { subscription_id: subscriptionId },
      data: { end_date: currentEnd, payment_status: 'active' },
    });
  } else if (action === 'cancel') {
    await prisma.subscription.update({
      where: { subscription_id: subscriptionId },
      data: { payment_status: 'cancelled' },
    });
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_user_id: adminUserId,
      action: `subscription_${action}`,
      target_type: 'subscription',
      target_id: subscriptionId,
      details: { extend_days: extendDays, reason },
    },
  });

  return { subscription_id: subscriptionId, action };
}
