import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

type Period = '7d' | '30d' | '90d' | '12m';

function formatBudgetRange(min: any, max: any): string | null {
  const hasMin = min != null && Number(min) > 0;
  const hasMax = max != null && Number(max) > 0;
  if (hasMin && hasMax) return `RM ${Number(min).toLocaleString()} – RM ${Number(max).toLocaleString()}`;
  if (hasMin) return `From RM ${Number(min).toLocaleString()}`;
  if (hasMax) return `Up to RM ${Number(max).toLocaleString()}`;
  return null;
}

function getPeriodDates(period: Period): { start: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const start = new Date();
  const prevStart = new Date();
  const prevEnd = new Date();

  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      prevStart.setDate(now.getDate() - 14);
      prevEnd.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      prevStart.setDate(now.getDate() - 60);
      prevEnd.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      prevStart.setDate(now.getDate() - 180);
      prevEnd.setDate(now.getDate() - 90);
      break;
    case '12m':
      start.setFullYear(now.getFullYear() - 1);
      prevStart.setFullYear(now.getFullYear() - 2);
      prevEnd.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { start, prevStart, prevEnd };
}

async function getProviderId(userId: string): Promise<string> {
  const p = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!p) throw AppError.notFound('Provider not found');
  return p.provider_id;
}

// ============================================================
// PROVIDER ANALYTICS
// ============================================================

export async function providerOverview(userId: string, period: Period = '30d') {
  const providerId = await getProviderId(userId);
  const { start, prevStart, prevEnd } = getPeriodDates(period);

  const programIds = (
    await prisma.trainingProgram.findMany({
      where: { provider_id: providerId },
      select: { program_id: true },
    })
  ).map((p) => p.program_id);

  const [views, prevViews, enquiries, prevEnquiries, proposals, proposalsWon, totalPrograms, recentEnquiries, recentBroadcasts, recentProposals, proposalStats] =
    await Promise.all([
      prisma.userActivity.count({
        where: { activity_type: 'view_program', target_id: { in: programIds }, created_at: { gte: start } },
      }),
      prisma.userActivity.count({
        where: { activity_type: 'view_program', target_id: { in: programIds }, created_at: { gte: prevStart, lt: prevEnd } },
      }),
      prisma.enquiry.count({ where: { provider_id: providerId, created_at: { gte: start } } }),
      prisma.enquiry.count({ where: { provider_id: providerId, created_at: { gte: prevStart, lt: prevEnd } } }),
      prisma.tpProposal.count({ where: { provider_id: providerId, created_at: { gte: start } } }),
      prisma.tpProposal.count({ where: { provider_id: providerId, status: 'selected', created_at: { gte: start } } }),
      prisma.trainingProgram.count({ where: { provider_id: providerId, status: { not: 'archived' } } }),
      prisma.enquiry.findMany({
        where: { provider_id: providerId },
        select: { enquiry_id: true, status: true, created_at: true, program: { select: { title: true } } },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      prisma.trainingRequestBroadcast.findMany({
        where: { status: 'open', response_deadline: { gte: new Date() } },
        select: { request_id: true, title: true, budget_min: true, budget_max: true, status: true },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      prisma.tpProposal.findMany({
        where: { provider_id: providerId },
        select: {
          proposal_id: true,
          proposed_fee: true,
          proposed_schedule: true,
          status: true,
          created_at: true,
          request: { select: { request_id: true, title: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.tpProposal.groupBy({
        by: ['status'],
        where: { provider_id: providerId },
        _count: true,
      }),
    ]);

  const conversionRate = views > 0 ? Math.round((enquiries / views) * 1000) / 10 : 0;
  const prevConversion = prevViews > 0 ? Math.round((prevEnquiries / prevViews) * 1000) / 10 : 0;

  const changePct = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

  const pStats: Record<string, number> = {};
  for (const s of proposalStats) pStats[s.status] = s._count;
  const totalSubmitted = Object.values(pStats).reduce((a, b) => a + b, 0);
  const selected = pStats['selected'] || 0;

  return {
    total_programs: totalPrograms,
    total_enquiries: enquiries,
    total_proposals: proposals,
    views_this_month: views,
    recent_enquiries: recentEnquiries,
    recent_broadcasts: recentBroadcasts.map((b) => ({
      ...b,
      budget_range: formatBudgetRange(b.budget_min, b.budget_max),
    })),
    recent_proposals: recentProposals,
    proposal_stats: {
      total: totalSubmitted,
      submitted: pStats['submitted'] || 0,
      shortlisted: pStats['shortlisted'] || 0,
      selected,
      rejected: pStats['rejected'] || 0,
      withdrawn: pStats['withdrawn'] || 0,
      win_rate: totalSubmitted > 0 ? Math.round((selected / totalSubmitted) * 100) : 0,
    },
    summary: {
      total_views: views,
      total_enquiries: enquiries,
      total_proposals_submitted: proposals,
      proposals_won: proposalsWon,
      conversion_rate: conversionRate,
    },
    comparison: {
      views_change_pct: changePct(views, prevViews),
      enquiries_change_pct: changePct(enquiries, prevEnquiries),
      conversion_change_pct: Math.round((conversionRate - prevConversion) * 10) / 10,
    },
  };
}

export async function providerProgramStats(userId: string, period: Period = '30d') {
  const providerId = await getProviderId(userId);
  const { start } = getPeriodDates(period);

  const programs = await prisma.trainingProgram.findMany({
    where: { provider_id: providerId, status: { not: 'archived' } },
    select: {
      program_id: true,
      title: true,
      category: { select: { name: true } },
      view_count: true,
      enquiry_count: true,
      status: true,
    },
    orderBy: { enquiry_count: 'desc' },
  });

  return programs.map((p) => ({
    ...p,
    conversion_rate: p.view_count > 0 ? Math.round((p.enquiry_count / p.view_count) * 1000) / 10 : 0,
  }));
}

export async function providerEnquiryStats(userId: string) {
  const providerId = await getProviderId(userId);

  const [byType, byStatus] = await Promise.all([
    prisma.enquiry.groupBy({
      by: ['enquiry_type'],
      where: { provider_id: providerId },
      _count: true,
    }),
    prisma.enquiry.groupBy({
      by: ['status'],
      where: { provider_id: providerId },
      _count: true,
    }),
  ]);

  return {
    by_type: Object.fromEntries(byType.map((t) => [t.enquiry_type, t._count])),
    by_status: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
}

export async function providerProposalStats(userId: string) {
  const providerId = await getProviderId(userId);

  const stats = await prisma.tpProposal.groupBy({
    by: ['status'],
    where: { provider_id: providerId },
    _count: true,
  });

  const statusMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const selected = statusMap['selected'] || 0;

  return {
    total_submitted: total,
    shortlisted: statusMap['shortlisted'] || 0,
    selected,
    rejected: statusMap['rejected'] || 0,
    withdrawn: statusMap['withdrawn'] || 0,
    win_rate: total > 0 ? Math.round((selected / total) * 100) : 0,
  };
}

// ============================================================
// ADMIN ANALYTICS
// ============================================================

export async function adminOverview(period: Period = '30d') {
  const { start, prevStart, prevEnd } = getPeriodDates(period);

  const [
    totalUsers, newUsers, prevNewUsers, activeUsers,
    byRole, totalPublished, newPrograms,
    totalSearches, totalViews, totalEnquiries, totalBroadcasts, totalProposals,
    revenueData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { created_at: { gte: start } } }),
    prisma.user.count({ where: { created_at: { gte: prevStart, lt: prevEnd } } }),
    prisma.user.count({ where: { last_login_at: { gte: start } } }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.trainingProgram.count({ where: { status: 'published' } }),
    prisma.trainingProgram.count({ where: { published_at: { gte: start } } }),
    prisma.searchHistory.count({ where: { created_at: { gte: start } } }),
    prisma.userActivity.count({ where: { activity_type: 'view_program', created_at: { gte: start } } }),
    prisma.enquiry.count({ where: { created_at: { gte: start } } }),
    prisma.trainingRequestBroadcast.count({ where: { created_at: { gte: start } } }),
    prisma.tpProposal.count({ where: { created_at: { gte: start } } }),
    prisma.paymentTransaction.aggregate({
      where: { status: 'completed', paid_at: { gte: start } },
      _sum: { amount: true },
    }),
  ]);

  const roleMap = Object.fromEntries(byRole.map((r) => [r.role, r._count]));

  return {
    users: {
      total: totalUsers,
      new_this_period: newUsers,
      growth_rate: prevNewUsers > 0 ? Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100) : 0,
      active_this_period: activeUsers,
      by_role: roleMap,
    },
    programs: {
      total_published: totalPublished,
      new_this_period: newPrograms,
    },
    engagement: {
      total_searches: totalSearches,
      total_views: totalViews,
      total_enquiries: totalEnquiries,
      total_broadcasts: totalBroadcasts,
      total_proposals: totalProposals,
    },
    revenue: {
      total_this_period: revenueData._sum.amount || 0,
    },
  };
}

export async function adminSearchTrends() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const searches = await prisma.searchHistory.findMany({
    where: { created_at: { gte: thirtyDaysAgo } },
    select: { search_query: true },
  });

  // Count query frequencies
  const queryCounts: Record<string, number> = {};
  for (const s of searches) {
    const q = s.search_query.toLowerCase().trim();
    queryCounts[q] = (queryCounts[q] || 0) + 1;
  }

  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Zero-result searches
  const zeroResults = await prisma.searchHistory.findMany({
    where: { created_at: { gte: thirtyDaysAgo }, results_count: 0 },
    select: { search_query: true },
  });

  const zeroCounts: Record<string, number> = {};
  for (const s of zeroResults) {
    const q = s.search_query.toLowerCase().trim();
    zeroCounts[q] = (zeroCounts[q] || 0) + 1;
  }

  const noResultQueries = Object.entries(zeroCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  return { top_queries: topQueries, searches_with_no_results: noResultQueries };
}
