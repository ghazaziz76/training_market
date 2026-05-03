import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../shared/errors/AppError.js';

// ---- View Tracking (debounced) ----

export async function trackProgramView(programId: string, userId?: string) {
  if (userId) {
    // Debounce: same user + same program within 30 min = 1 view
    const debounceKey = `view:${userId}:${programId}`;
    const alreadyViewed = await redis.get(debounceKey);
    if (alreadyViewed) return;

    await redis.set(debounceKey, '1', 'EX', 1800);

    // Log activity
    await prisma.userActivity.create({
      data: {
        user_id: userId,
        activity_type: 'view_program',
        target_id: programId,
        target_type: 'program',
      },
    }).catch(() => {});
  }

  // Increment view count
  await prisma.trainingProgram.update({
    where: { program_id: programId },
    data: { view_count: { increment: 1 } },
  }).catch(() => {});
}

// ---- Save / Unsave Programs ----

export async function saveProgram(userId: string, programId: string) {
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    select: { status: true },
  });
  if (!program || program.status !== 'published') {
    throw AppError.notFound('Program not found');
  }

  await prisma.savedProgram.upsert({
    where: { user_id_program_id: { user_id: userId, program_id: programId } },
    create: { user_id: userId, program_id: programId },
    update: {},
  });

  await prisma.userActivity.create({
    data: {
      user_id: userId,
      activity_type: 'save_program',
      target_id: programId,
      target_type: 'program',
    },
  }).catch(() => {});
}

export async function unsaveProgram(userId: string, programId: string) {
  await prisma.savedProgram.deleteMany({
    where: { user_id: userId, program_id: programId },
  });
}

export async function getSavedPrograms(userId: string, page: number = 1, limit: number = 20) {
  const where = { user_id: userId };

  const [saved, total] = await Promise.all([
    prisma.savedProgram.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        program: {
          select: {
            program_id: true,
            title: true,
            slug: true,
            short_description: true,
            program_type: true,
            fee_per_pax: true,
            fee_per_group: true,
            delivery_mode: true,
            city: true,
            state: true,
            duration_days: true,
            hrd_corp_claimable: true,
            thumbnail_url: true,
            status: true,
            category: { select: { name: true } },
            provider: {
              select: { provider_name: true, logo_url: true, quality_tier: true },
            },
          },
        },
      },
    }),
    prisma.savedProgram.count({ where }),
  ]);

  return {
    data: saved.map((s) => s.program).filter((p) => p.status === 'published'),
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}

// ---- Compare Programs ----

export async function comparePrograms(programIds: string[]) {
  if (programIds.length < 2 || programIds.length > 4) {
    throw AppError.badRequest('Compare requires 2 to 4 programs');
  }

  const programs = await prisma.trainingProgram.findMany({
    where: { program_id: { in: programIds }, status: 'published' },
    select: {
      program_id: true,
      title: true,
      description: true,
      objective: true,
      target_group: true,
      program_type: true,
      skill_type: true,
      is_certification: true,
      certification_name: true,
      fee_per_pax: true,
      fee_per_group: true,
      delivery_mode: true,
      duration_days: true,
      duration_hours: true,
      location: true,
      city: true,
      state: true,
      hrd_corp_claimable: true,
      effectiveness_score: true,
      agenda: true,
      category: { select: { name: true } },
      provider: {
        select: {
          provider_name: true,
          quality_tier: true,
          average_rating: true,
        },
      },
      skill_tags: { include: { skill_tag: { select: { name: true } } } },
    },
  });

  return programs.map((p) => ({
    ...p,
    skill_tags: p.skill_tags.map((st) => st.skill_tag.name),
  }));
}

// ---- Recently Viewed ----

export async function getRecentlyViewed(userId: string, limit: number = 10) {
  const activities = await prisma.userActivity.findMany({
    where: {
      user_id: userId,
      activity_type: 'view_program',
      target_type: 'program',
    },
    orderBy: { created_at: 'desc' },
    take: limit * 2, // fetch more to deduplicate
    select: { target_id: true, created_at: true },
  });

  // Deduplicate — keep only latest view per program
  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const a of activities) {
    if (a.target_id && !seen.has(a.target_id)) {
      seen.add(a.target_id);
      uniqueIds.push(a.target_id);
    }
    if (uniqueIds.length >= limit) break;
  }

  if (uniqueIds.length === 0) return [];

  const programs = await prisma.trainingProgram.findMany({
    where: { program_id: { in: uniqueIds }, status: 'published' },
    select: {
      program_id: true,
      title: true,
      slug: true,
      short_description: true,
      fee_per_pax: true,
      fee_per_group: true,
      program_type: true,
      delivery_mode: true,
      thumbnail_url: true,
      category: { select: { name: true } },
      provider: {
        select: { provider_name: true, logo_url: true, quality_tier: true },
      },
    },
  });

  // Maintain order from activity log
  const programMap = new Map(programs.map((p) => [p.program_id, p]));
  return uniqueIds.map((id) => programMap.get(id)).filter(Boolean);
}

// ---- Recommended For You (rule-based, AI version in Phase 10) ----

export async function getRecommendations(userId: string, limit: number = 12) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      role: true,
      employer_profile: { select: { industry: true, training_interests: true } },
      individual_profile: { select: { skill_interests: true, career_goals: true } },
    },
  });

  if (!user) return [];

  const where: any = { status: 'published' };

  if (user.role === 'employer' && user.employer_profile) {
    const { industry, training_interests } = user.employer_profile;
    if (industry) {
      where.industry_focus = { has: industry };
    }
    // Match by training interests (via category or skill tags)
    // Simplified: just use industry matching for now
  } else if (user.role === 'individual' && user.individual_profile) {
    // For individuals, match by skill interests
    // Simplified for rule-based — AI will replace in Phase 10
  }

  const programs = await prisma.trainingProgram.findMany({
    where,
    select: {
      program_id: true,
      title: true,
      slug: true,
      short_description: true,
      program_type: true,
      fee_per_pax: true,
      fee_per_group: true,
      delivery_mode: true,
      city: true,
      duration_days: true,
      hrd_corp_claimable: true,
      thumbnail_url: true,
      effectiveness_score: true,
      category: { select: { name: true } },
      provider: {
        select: { provider_name: true, logo_url: true, quality_tier: true, average_rating: true },
      },
    },
    orderBy: [{ enquiry_count: 'desc' }, { view_count: 'desc' }],
    take: limit,
  });

  return programs;
}
