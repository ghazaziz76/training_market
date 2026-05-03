import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { isAIConfigured } from '../ai/ai-client.js';

// ---- Dashboard Stats ----

export async function getDashboardStats() {
  const cacheKey = 'admin:dashboard:stats';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    totalEmployers,
    totalIndividuals,
    totalProviders,
    newUsersThisMonth,
    newUsersLastMonth,
    totalPublished,
    pendingReview,
    totalCategories,
    newProgramsThisMonth,
    activeSubscriptions,
    revenueThisMonth,
    revenueThisYear,
    expiringSoon,
    enquiriesThisMonth,
    broadcastsThisMonth,
    proposalsThisMonth,
    searchesThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'employer' } }),
    prisma.user.count({ where: { role: 'individual' } }),
    prisma.user.count({ where: { role: 'provider' } }),
    prisma.user.count({ where: { created_at: { gte: thisMonthStart } } }),
    prisma.user.count({ where: { created_at: { gte: lastMonthStart, lt: thisMonthStart } } }),
    prisma.trainingProgram.count({ where: { status: 'published' } }),
    prisma.trainingProgram.count({ where: { status: 'pending_review' } }),
    prisma.category.count({ where: { parent_id: null, status: 'active' } }),
    prisma.trainingProgram.count({ where: { published_at: { gte: thisMonthStart } } }),
    prisma.subscription.count({ where: { payment_status: 'active' } }),
    prisma.paymentTransaction.aggregate({
      where: { status: 'completed', paid_at: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: 'completed', paid_at: { gte: new Date(now.getFullYear(), 0, 1) } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: {
        payment_status: 'active',
        end_date: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.enquiry.count({ where: { created_at: { gte: thisMonthStart } } }),
    prisma.trainingRequestBroadcast.count({ where: { created_at: { gte: thisMonthStart } } }),
    prisma.tpProposal.count({ where: { created_at: { gte: thisMonthStart } } }),
    prisma.searchHistory.count({ where: { created_at: { gte: thisMonthStart } } }),
  ]);

  const userGrowthPct =
    newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : newUsersThisMonth > 0
        ? 100
        : 0;

  const stats = {
    users: {
      total: totalUsers,
      employers: totalEmployers,
      individuals: totalIndividuals,
      providers: totalProviders,
      new_this_month: newUsersThisMonth,
      growth_pct: userGrowthPct,
    },
    programs: {
      total_published: totalPublished,
      pending_review: pendingReview,
      total_categories: totalCategories,
      new_this_month: newProgramsThisMonth,
    },
    subscriptions: {
      total_active: activeSubscriptions,
      revenue_this_month: revenueThisMonth._sum.amount || 0,
      revenue_this_year: revenueThisYear._sum.amount || 0,
      expiring_soon: expiringSoon,
    },
    activity: {
      total_enquiries_this_month: enquiriesThisMonth,
      total_broadcasts_this_month: broadcastsThisMonth,
      total_proposals_this_month: proposalsThisMonth,
      total_searches_this_month: searchesThisMonth,
    },
  };

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 900); // 15 min cache
  return stats;
}

// ---- Platform Health ----

export async function getHealthStatus() {
  const checks: Record<string, { status: string; response_time_ms?: number; details?: string }> = {};

  // Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', response_time_ms: Date.now() - dbStart };
  } catch (e: any) {
    checks.database = { status: 'unhealthy', details: e.message };
  }

  // Redis
  const redisStart = Date.now();
  try {
    await redis.ping();
    const memInfo = await redis.info('memory');
    const usedMemory = memInfo.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';
    checks.redis = { status: 'healthy', response_time_ms: Date.now() - redisStart, details: `Memory: ${usedMemory}` };
  } catch (e: any) {
    checks.redis = { status: 'unhealthy', details: e.message };
  }

  // AI API
  checks.ai_api = {
    status: isAIConfigured() ? 'configured' : 'not_configured',
    details: isAIConfigured() ? 'API key present' : 'No API key set',
  };

  return {
    overall: Object.values(checks).every((c) => c.status !== 'unhealthy') ? 'healthy' : 'degraded',
    checks,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

// ---- Audit Logs ----

export async function getAuditLogs(
  filters: {
    admin_user_id?: string;
    action?: string;
    target_type?: string;
    date_from?: string;
    date_to?: string;
  },
  page: number = 1,
  limit: number = 20,
) {
  const where: any = {};

  if (filters.admin_user_id) where.admin_user_id = filters.admin_user_id;
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters.target_type) where.target_type = filters.target_type;
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
  }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  // Enrich with admin user names
  const adminIds = [...new Set(logs.map((l) => l.admin_user_id))];
  const admins = await prisma.user.findMany({
    where: { user_id: { in: adminIds } },
    select: { user_id: true, full_name: true },
  });
  const adminMap = new Map(admins.map((a) => [a.user_id, a.full_name]));

  return {
    data: logs.map((l) => ({
      ...l,
      admin_name: adminMap.get(l.admin_user_id) || 'Unknown',
    })),
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

// ---- Recent Activity Feed ----

export async function getRecentActivity(limit: number = 10) {
  // Get mix of recent events
  const [recentUsers, recentPrograms, recentBroadcasts, recentEnquiries] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: 'admin' } },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: { full_name: true, role: true, created_at: true },
    }),
    prisma.trainingProgram.findMany({
      where: { status: 'pending_review' },
      orderBy: { updated_at: 'desc' },
      take: 3,
      select: { title: true, updated_at: true, provider: { select: { provider_name: true } } },
    }),
    prisma.trainingRequestBroadcast.findMany({
      orderBy: { created_at: 'desc' },
      take: 2,
      select: { title: true, created_at: true },
    }),
    prisma.enquiry.findMany({
      orderBy: { created_at: 'desc' },
      take: 2,
      select: { subject: true, enquiry_type: true, created_at: true },
    }),
  ]);

  const activities: Array<{ type: string; message: string; timestamp: Date }> = [];

  for (const u of recentUsers) {
    activities.push({
      type: 'new_user',
      message: `New ${u.role} registered: ${u.full_name}`,
      timestamp: u.created_at,
    });
  }
  for (const p of recentPrograms) {
    activities.push({
      type: 'program_pending',
      message: `Program submitted for review: "${p.title}" by ${p.provider.provider_name}`,
      timestamp: p.updated_at,
    });
  }
  for (const b of recentBroadcasts) {
    activities.push({
      type: 'broadcast',
      message: `New broadcast request: "${b.title}"`,
      timestamp: b.created_at,
    });
  }
  for (const e of recentEnquiries) {
    activities.push({
      type: 'enquiry',
      message: `New ${e.enquiry_type.replace('_', ' ')}: "${e.subject}"`,
      timestamp: e.created_at,
    });
  }

  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
