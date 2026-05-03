import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import type { SearchProgramsInput, AutoSuggestInput } from '../../shared/validators/search.validators.js';

// ---- Program Search ----

export async function searchPrograms(input: SearchProgramsInput, userId?: string) {
  const where: any = { status: 'published' };

  // Text search — includes provider name
  if (input.q) {
    where.OR = [
      { title: { contains: input.q, mode: 'insensitive' } },
      { description: { contains: input.q, mode: 'insensitive' } },
      { objective: { contains: input.q, mode: 'insensitive' } },
      { target_group: { contains: input.q, mode: 'insensitive' } },
      { short_description: { contains: input.q, mode: 'insensitive' } },
      { provider: { provider_name: { contains: input.q, mode: 'insensitive' } } },
    ];
  }

  // Filters — category_id may be a parent; include its subcategories
  if (input.category_id) {
    const subcats = await prisma.category.findMany({
      where: { parent_id: input.category_id, status: 'active' },
      select: { category_id: true },
    });
    if (subcats.length > 0) {
      where.category_id = { in: [input.category_id, ...subcats.map((s) => s.category_id)] };
    } else {
      where.category_id = input.category_id;
    }
  }
  if (input.subcategory_id) where.subcategory_id = input.subcategory_id;
  if (input.delivery_mode) where.delivery_mode = input.delivery_mode;
  if (input.program_type) where.program_type = input.program_type;
  if (input.skill_type) where.skill_type = input.skill_type;
  if (input.state) where.state = { contains: input.state, mode: 'insensitive' };
  if (input.city) where.city = { contains: input.city, mode: 'insensitive' };
  if (input.hrd_corp_claimable) where.hrd_corp_claimable = true;
  if (input.is_certification) where.is_certification = true;
  if (input.industry) where.industry_focus = { has: input.industry };

  // Price filter (uses fee_per_pax for public, fee_per_group for in-house)
  if (input.min_fee || input.max_fee) {
    where.OR = [
      ...(where.OR || []),
      {
        AND: [
          input.min_fee ? { fee_per_pax: { gte: input.min_fee } } : {},
          input.max_fee ? { fee_per_pax: { lte: input.max_fee } } : {},
        ].filter((f) => Object.keys(f).length > 0),
      },
    ];
    // Simplified: just filter on fee_per_pax for now
    if (!where.OR?.length) delete where.OR;
    if (input.min_fee) where.fee_per_pax = { ...(where.fee_per_pax || {}), gte: input.min_fee };
    if (input.max_fee) where.fee_per_pax = { ...(where.fee_per_pax || {}), lte: input.max_fee };
    delete where.OR; // clean up — use simple approach
  }

  // Duration filter
  if (input.min_duration_days) {
    where.duration_days = { ...(where.duration_days || {}), gte: input.min_duration_days };
  }
  if (input.max_duration_days) {
    where.duration_days = { ...(where.duration_days || {}), lte: input.max_duration_days };
  }

  // Provider filter
  if (input.provider_id) {
    where.provider_id = input.provider_id;
  }
  if (input.provider_tier) {
    where.provider = { ...(where.provider || {}), quality_tier: input.provider_tier };
  }

  // Skill tags filter
  if (input.skill_tags) {
    const tagIds = input.skill_tags.split(',').filter(Boolean);
    if (tagIds.length > 0) {
      where.skill_tags = { some: { tag_id: { in: tagIds } } };
    }
  }

  // Sort
  let orderBy: any;
  switch (input.sort_by) {
    case 'fee_asc':
      orderBy = { fee_per_pax: 'asc' };
      break;
    case 'fee_desc':
      orderBy = { fee_per_pax: 'desc' };
      break;
    case 'newest':
      orderBy = { published_at: 'desc' };
      break;
    case 'popular':
      orderBy = [{ enquiry_count: 'desc' }, { view_count: 'desc' }];
      break;
    case 'rating':
      orderBy = { effectiveness_score: 'desc' };
      break;
    case 'relevance':
    default:
      // For relevance, sort by a combination: newer + more engagement
      orderBy = [{ enquiry_count: 'desc' }, { view_count: 'desc' }, { published_at: 'desc' }];
      break;
  }

  const [programs, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      select: {
        program_id: true,
        title: true,
        slug: true,
        short_description: true,
        target_group: true,
        program_type: true,
        skill_type: true,
        is_certification: true,
        certification_name: true,
        fee_per_pax: true,
        fee_per_group: true,
        early_bird_fee: true,
        delivery_mode: true,
        city: true,
        state: true,
        duration_days: true,
        duration_hours: true,
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
        skill_tags: { include: { skill_tag: { select: { name: true } } } },
        promotions: {
          where: {
            status: 'active',
            start_date: { lte: new Date() },
            end_date: { gte: new Date() },
          },
          select: { label: true, promotion_type: true, discount_value: true },
        },
      },
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  // Search matching providers (only on first page with a keyword)
  let matchedProviders: any[] = [];
  if (input.q && input.page === 1) {
    matchedProviders = await prisma.trainingProvider.findMany({
      where: {
        status: 'active',
        provider_name: { contains: input.q, mode: 'insensitive' },
      },
      select: {
        provider_id: true,
        provider_name: true,
        logo_url: true,
        business_description: true,
        city: true,
        state: true,
        quality_tier: true,
        average_rating: true,
        total_completed_programs: true,
        hrd_corp_registered_provider: true,
        _count: { select: { programs: { where: { status: 'published' } } } },
      },
      take: 5,
    });
  }

  // Log search to history if user is authenticated
  if (userId && input.q) {
    await prisma.searchHistory.create({
      data: {
        user_id: userId,
        search_query: input.q,
        filters_applied: input as any,
        results_count: total,
      },
    }).catch(() => {}); // non-blocking
  }

  return {
    data: programs.map((p) => ({
      ...p,
      skill_tags: p.skill_tags.map((st) => st.skill_tag),
    })),
    providers: matchedProviders.map((p) => ({
      ...p,
      program_count: p._count.programs,
      _count: undefined,
    })),
    pagination: {
      total,
      page: input.page,
      limit: input.limit,
      total_pages: Math.ceil(total / input.limit),
    },
  };
}

// ---- Auto-Suggest ----

export async function autoSuggest(input: AutoSuggestInput) {
  const cacheKey = `suggest:${input.q.toLowerCase().slice(0, 20)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [programs, categories, skills, providers] = await Promise.all([
    prisma.trainingProgram.findMany({
      where: {
        status: 'published',
        title: { contains: input.q, mode: 'insensitive' },
      },
      select: {
        program_id: true,
        title: true,
        provider: { select: { provider_name: true } },
      },
      take: input.limit,
    }),
    prisma.category.findMany({
      where: {
        status: 'active',
        name: { contains: input.q, mode: 'insensitive' },
      },
      select: { category_id: true, name: true, slug: true },
      take: 5,
    }),
    prisma.skillTag.findMany({
      where: { name: { contains: input.q, mode: 'insensitive' } },
      select: { tag_id: true, name: true },
      take: 5,
    }),
    prisma.trainingProvider.findMany({
      where: {
        status: 'active',
        provider_name: { contains: input.q, mode: 'insensitive' },
      },
      select: { provider_id: true, provider_name: true },
      take: 5,
    }),
  ]);

  const result = {
    programs: programs.map((p) => ({
      program_id: p.program_id,
      title: p.title,
      provider_name: p.provider.provider_name,
    })),
    categories,
    skills,
    providers,
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}

// ---- Search History ----

export async function getSearchHistory(userId: string) {
  return prisma.searchHistory.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      history_id: true,
      search_query: true,
      filters_applied: true,
      results_count: true,
      created_at: true,
    },
  });
}

export async function deleteSearchHistoryItem(userId: string, historyId: string) {
  await prisma.searchHistory.deleteMany({
    where: { history_id: historyId, user_id: userId },
  });
}

export async function clearSearchHistory(userId: string) {
  await prisma.searchHistory.deleteMany({ where: { user_id: userId } });
}
