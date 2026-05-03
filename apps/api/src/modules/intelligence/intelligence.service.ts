import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../shared/errors/AppError.js';

// ---- Employer Intelligence Dashboard ----

export async function employerIntelligence(userId: string) {
  const profile = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
    select: { industry: true },
  });
  if (!profile) throw AppError.notFound('Employer not found');

  const cacheKey = `intelligence:employer:${profile.industry || 'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Trending skills from search data
  const searches = await prisma.searchHistory.findMany({
    where: { created_at: { gte: thirtyDaysAgo } },
    select: { search_query: true },
  });

  const skillCounts: Record<string, number> = {};
  for (const s of searches) {
    const q = s.search_query.toLowerCase().trim();
    skillCounts[q] = (skillCounts[q] || 0) + 1;
  }

  const trendingSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, searches_this_month: count }));

  // Popular categories in employer's industry
  const popularCategories = await prisma.trainingProgram.groupBy({
    by: ['category_id'],
    where: {
      status: 'published',
      ...(profile.industry ? { industry_focus: { has: profile.industry } } : {}),
    },
    _count: true,
    orderBy: { _count: { category_id: 'desc' } },
    take: 5,
  });

  const categoryIds = popularCategories.map((c) => c.category_id);
  const categories = await prisma.category.findMany({
    where: { category_id: { in: categoryIds } },
    select: { category_id: true, name: true },
  });
  const catMap = new Map(categories.map((c) => [c.category_id, c.name]));

  const result = {
    your_industry: profile.industry || 'All Industries',
    trending_skills: trendingSkills,
    popular_in_your_industry: popularCategories.map((c) => ({
      category: catMap.get(c.category_id) || 'Unknown',
      program_count: c._count,
    })),
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}

// ---- Provider Intelligence Dashboard ----

export async function providerIntelligence(userId: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  // Opportunity gaps: high search volume, low program count
  const searches = await prisma.searchHistory.findMany({
    where: { created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    select: { search_query: true, results_count: true },
  });

  const demandSignals: Record<string, { searches: number; lowResults: number }> = {};
  for (const s of searches) {
    const q = s.search_query.toLowerCase().trim();
    if (!demandSignals[q]) demandSignals[q] = { searches: 0, lowResults: 0 };
    demandSignals[q].searches++;
    if (s.results_count < 3) demandSignals[q].lowResults++;
  }

  const opportunityGaps = Object.entries(demandSignals)
    .filter(([, v]) => v.searches >= 5 && v.lowResults > v.searches * 0.5)
    .sort((a, b) => b[1].searches - a[1].searches)
    .slice(0, 10)
    .map(([topic, data]) => ({
      topic,
      demand_signals: data.searches,
      low_supply: true,
      opportunity: data.searches > 20 ? 'high' : 'medium',
    }));

  // Pricing benchmarks for provider's categories
  const myPrograms = await prisma.trainingProgram.findMany({
    where: { provider_id: provider.provider_id, status: 'published' },
    select: { category_id: true, fee_per_pax: true },
  });

  const myCategories = [...new Set(myPrograms.map((p) => p.category_id))];
  const benchmarks: any[] = [];

  for (const catId of myCategories.slice(0, 5)) {
    const marketStats = await prisma.trainingProgram.aggregate({
      where: { category_id: catId, status: 'published', fee_per_pax: { not: null } },
      _avg: { fee_per_pax: true },
      _min: { fee_per_pax: true },
      _max: { fee_per_pax: true },
    });

    const myAvg = myPrograms
      .filter((p) => p.category_id === catId && p.fee_per_pax)
      .reduce((sum, p) => sum + Number(p.fee_per_pax), 0) /
      myPrograms.filter((p) => p.category_id === catId && p.fee_per_pax).length || 0;

    const cat = await prisma.category.findUnique({ where: { category_id: catId }, select: { name: true } });

    benchmarks.push({
      category: cat?.name || 'Unknown',
      your_average_fee: Math.round(myAvg),
      market_average_fee: Math.round(Number(marketStats._avg.fee_per_pax || 0)),
      market_min: Number(marketStats._min.fee_per_pax || 0),
      market_max: Number(marketStats._max.fee_per_pax || 0),
    });
  }

  return { opportunity_gaps: opportunityGaps, pricing_benchmarks: benchmarks };
}

// ---- Social Proof for Programs ----

export async function getProgramSocialProof(programId: string) {
  const [enquiryCount, viewCount, effectiveness] = await Promise.all([
    prisma.enquiry.count({ where: { program_id: programId, created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.userActivity.count({ where: { target_id: programId, activity_type: 'view_program', created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.effectivenessRecord.aggregate({
      where: { program_id: programId, impact_rating: { not: null } },
      _avg: { impact_rating: true },
      _count: true,
    }),
  ]);

  return {
    recent_activity: { enquiries_this_week: enquiryCount, views_this_week: viewCount },
    effectiveness: effectiveness._count > 0
      ? { score: Math.round(Number(effectiveness._avg.impact_rating) * 10) / 10, total_reviews: effectiveness._count }
      : null,
  };
}

// ---- Trending Skills (public) ----

export async function getTrendingSkills() {
  const cacheKey = 'intelligence:trending_skills';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const searches = await prisma.searchHistory.findMany({
    where: { created_at: { gte: thirtyDaysAgo } },
    select: { search_query: true },
  });

  const counts: Record<string, number> = {};
  for (const s of searches) {
    const q = s.search_query.toLowerCase().trim();
    if (q.length > 2) counts[q] = (counts[q] || 0) + 1;
  }

  const result = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, count]) => ({ skill, search_count: count }));

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}
