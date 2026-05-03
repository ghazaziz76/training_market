import type { PrismaClient } from '@prisma/client';

export async function seedSubscriptionPlans(prisma: PrismaClient) {
  console.log('Seeding subscription plans...');

  await prisma.subscriptionPlan.upsert({
    where: { plan_code: 'basic_annual' },
    update: {},
    create: {
      plan_name: 'Basic Annual',
      plan_code: 'basic_annual',
      description: 'Essential plan for training providers to list programs and receive enquiries',
      billing_cycle: 'annual',
      price: 500,
      features: JSON.stringify([
        'Publish up to 20 programs',
        'Appear in search results',
        'Receive employer enquiries',
        'Receive broadcast request notifications',
        'Basic analytics dashboard',
        'Quality tier eligibility',
      ]),
      max_programs: 20,
      max_featured_listings: 0,
      analytics_level: 'basic',
      sort_order: 1,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { plan_code: 'premium_annual' },
    update: {},
    create: {
      plan_name: 'Premium Annual',
      plan_code: 'premium_annual',
      description: 'Full-featured plan with unlimited programs, priority placement, and advanced analytics',
      billing_cycle: 'annual',
      price: 1500,
      features: JSON.stringify([
        'Unlimited programs',
        'Priority in search results',
        '5 featured listings per month',
        'Advanced analytics dashboard',
        'Dedicated support',
        'Market intelligence access',
        'Quality tier eligibility',
      ]),
      max_programs: null,
      max_featured_listings: 5,
      analytics_level: 'advanced',
      sort_order: 2,
    },
  });

  console.log('  Created 2 subscription plans');
}
