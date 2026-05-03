import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

const PROGRAM_CARD_SELECT = {
  program_id: true,
  title: true,
  slug: true,
  short_description: true,
  target_group: true,
  program_type: true,
  skill_type: true,
  is_certification: true,
  fee_per_pax: true,
  fee_per_group: true,
  early_bird_fee: true,
  delivery_mode: true,
  city: true,
  state: true,
  duration_days: true,
  hrd_corp_claimable: true,
  thumbnail_url: true,
  effectiveness_score: true,
  view_count: true,
  enquiry_count: true,
  published_at: true,
  category: { select: { name: true, slug: true, parent: { select: { name: true } } } },
  provider: {
    select: {
      provider_id: true,
      provider_name: true,
      logo_url: true,
      quality_tier: true,
      average_rating: true,
    },
  },
};

// ---- Hero Banners ----

export async function getHeroBanners() {
  const cacheKey = 'storefront:hero_banners';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const banners = await prisma.featuredListing.findMany({
    where: {
      listing_type: 'hero_banner',
      status: 'active',
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
    },
    orderBy: { priority_rank: 'asc' },
    take: 5,
    select: {
      listing_id: true,
      title: true,
      description: true,
      image_url: true,
      link_url: true,
      program_id: true,
      provider_id: true,
    },
  });

  await redis.set(cacheKey, JSON.stringify(banners), 'EX', 900);
  return banners;
}

// ---- Featured Programs ----

export async function getFeaturedPrograms(limit: number = 12) {
  const cacheKey = `storefront:featured:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const listings = await prisma.featuredListing.findMany({
    where: {
      listing_type: 'featured_program',
      status: 'active',
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
      program_id: { not: null },
    },
    orderBy: { priority_rank: 'asc' },
    take: limit,
    select: { program_id: true },
  });

  const programIds = listings.map((l) => l.program_id).filter(Boolean) as string[];

  if (programIds.length === 0) {
    // Fallback: show popular published programs
    const programs = await prisma.trainingProgram.findMany({
      where: { status: 'published' },
      select: PROGRAM_CARD_SELECT,
      orderBy: [{ enquiry_count: 'desc' }, { view_count: 'desc' }],
      take: limit,
    });
    await redis.set(cacheKey, JSON.stringify(programs), 'EX', 900);
    return programs;
  }

  const programs = await prisma.trainingProgram.findMany({
    where: { program_id: { in: programIds }, status: 'published' },
    select: PROGRAM_CARD_SELECT,
  });

  await redis.set(cacheKey, JSON.stringify(programs), 'EX', 900);
  return programs;
}

// ---- Provider Spotlights ----

export async function getProviderSpotlights(limit: number = 6) {
  const cacheKey = `storefront:spotlights:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // First try featured listings
  const listings = await prisma.featuredListing.findMany({
    where: {
      listing_type: 'provider_spotlight',
      status: 'active',
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
      provider_id: { not: null },
    },
    orderBy: { priority_rank: 'asc' },
    take: limit,
    select: { provider_id: true },
  });

  const providerIds = listings.map((l) => l.provider_id).filter(Boolean) as string[];

  let providers;
  if (providerIds.length > 0) {
    providers = await prisma.trainingProvider.findMany({
      where: { provider_id: { in: providerIds }, status: 'active' },
      select: {
        provider_id: true,
        provider_name: true,
        logo_url: true,
        business_description: true,
        quality_tier: true,
        average_rating: true,
        total_completed_programs: true,
        _count: { select: { programs: { where: { status: 'published' } } } },
      },
    });
  } else {
    // Fallback: top-tier providers
    providers = await prisma.trainingProvider.findMany({
      where: { status: 'active', verification_status: 'verified' },
      select: {
        provider_id: true,
        provider_name: true,
        logo_url: true,
        business_description: true,
        quality_tier: true,
        average_rating: true,
        total_completed_programs: true,
        _count: { select: { programs: { where: { status: 'published' } } } },
      },
      orderBy: { average_rating: 'desc' },
      take: limit,
    });
  }

  await redis.set(cacheKey, JSON.stringify(providers), 'EX', 900);
  return providers;
}

// ---- Trending Programs ----

export async function getTrendingPrograms(limit: number = 12) {
  const cacheKey = `storefront:trending:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Trending = most views + enquiries in recent period
  const programs = await prisma.trainingProgram.findMany({
    where: { status: 'published' },
    select: PROGRAM_CARD_SELECT,
    orderBy: [{ enquiry_count: 'desc' }, { view_count: 'desc' }],
    take: limit,
  });

  await redis.set(cacheKey, JSON.stringify(programs), 'EX', 3600);
  return programs;
}

// ---- New Programs ----

export async function getNewPrograms(limit: number = 12) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const programs = await prisma.trainingProgram.findMany({
    where: {
      status: 'published',
      published_at: { gte: thirtyDaysAgo },
    },
    select: PROGRAM_CARD_SELECT,
    orderBy: { published_at: 'desc' },
    take: limit,
  });

  return programs;
}

// ---- Upcoming Sessions ----

export async function getUpcomingSessions(limit: number = 12, daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const schedules = await prisma.programSchedule.findMany({
    where: {
      status: 'open',
      start_date: { gte: now, lte: futureDate },
      program: { status: 'published' },
    },
    include: {
      program: {
        select: {
          program_id: true,
          title: true,
          slug: true,
          fee_per_pax: true,
          delivery_mode: true,
          hrd_corp_claimable: true,
          thumbnail_url: true,
          provider: {
            select: { provider_name: true, logo_url: true, quality_tier: true },
          },
        },
      },
    },
    orderBy: { start_date: 'asc' },
    take: limit,
  });

  return schedules.map((s) => ({
    schedule_id: s.schedule_id,
    start_date: s.start_date,
    end_date: s.end_date,
    venue: s.venue || s.online_platform,
    available_seats: s.available_seats,
    days_until_start: Math.ceil(
      (new Date(s.start_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    ),
    program: s.program,
  }));
}

// ---- Browse by Category (with program counts) ----

export async function getCategoriesBrowse() {
  const cacheKey = 'storefront:categories_browse';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const categories = await prisma.category.findMany({
    where: { parent_id: null, status: 'active' },
    orderBy: { sort_order: 'asc' },
    select: {
      category_id: true,
      name: true,
      slug: true,
      icon: true,
      _count: { select: { programs: { where: { status: 'published' } } } },
      children: {
        where: { status: 'active' },
        orderBy: { sort_order: 'asc' },
        select: {
          category_id: true,
          name: true,
          slug: true,
          _count: { select: { programs: { where: { status: 'published' } } } },
        },
      },
    },
  });

  const result = categories
    .map((c) => {
      const subcategories = c.children.map((sub) => ({
        category_id: sub.category_id,
        name: sub.name,
        slug: sub.slug,
        program_count: sub._count.programs,
      }));
      const totalPrograms = c._count.programs + subcategories.reduce((sum, s) => sum + s.program_count, 0);
      return {
        category_id: c.category_id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        program_count: totalPrograms,
        subcategories,
      };
    })
    .sort((a, b) => b.program_count - a.program_count);

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}

// ---- Browse by Industry ----

export async function getIndustryBrowse() {
  const cacheKey = 'storefront:industry_browse';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const programs = await prisma.trainingProgram.findMany({
    where: { status: 'published' },
    select: { industry_focus: true },
  });

  // Count industries
  const industryCounts: Record<string, number> = {};
  for (const p of programs) {
    for (const industry of p.industry_focus) {
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    }
  }

  const result = Object.entries(industryCounts)
    .map(([industry, program_count]) => ({ industry, program_count }))
    .sort((a, b) => b.program_count - a.program_count);

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}
