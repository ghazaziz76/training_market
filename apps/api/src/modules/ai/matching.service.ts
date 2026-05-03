import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { chat, isAIConfigured } from './ai-client.js';
import { semanticSearch } from './embedding.service.js';

const PROGRAM_CARD_SELECT = {
  program_id: true,
  title: true,
  slug: true,
  short_description: true,
  description: true,
  objective: true,
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
  category: { select: { name: true, slug: true } },
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

// ---- AI Match (need → programs) ----

export async function matchPrograms(
  query: string,
  filters: Record<string, any> = {},
  limit: number = 10,
  userId?: string,
) {
  // Try semantic search first
  const semanticResults = await semanticSearch(query, filters, limit);

  let programs;

  if (semanticResults.length > 0) {
    const programIds = semanticResults.map((r) => r.program_id);
    const distanceMap = new Map(semanticResults.map((r) => [r.program_id, r.distance]));

    programs = await prisma.trainingProgram.findMany({
      where: { program_id: { in: programIds } },
      select: PROGRAM_CARD_SELECT,
    });

    // Calculate match scores (convert distance to 0-100 score)
    programs = programs.map((p) => {
      const distance = distanceMap.get(p.program_id) || 1;
      let matchScore = Math.round(Math.max(0, (1 - distance) * 100));

      // Boost for quality tier
      if (p.provider.quality_tier === 'premium') matchScore = Math.min(100, matchScore + 5);
      else if (p.provider.quality_tier === 'trusted') matchScore = Math.min(100, matchScore + 3);

      // Boost for effectiveness
      if (Number(p.effectiveness_score) > 4) matchScore = Math.min(100, matchScore + 3);

      return { ...p, match_score: matchScore };
    });

    // Sort by match score
    programs.sort((a, b) => b.match_score - a.match_score);
  } else {
    // Fallback: text-based search
    programs = await prisma.trainingProgram.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { objective: { contains: query, mode: 'insensitive' } },
          { target_group: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: PROGRAM_CARD_SELECT,
      orderBy: [{ enquiry_count: 'desc' }, { view_count: 'desc' }],
      take: limit,
    });

    programs = programs.map((p) => ({ ...p, match_score: 50 })); // generic score for fallback
  }

  // Generate explanations for top results
  const withExplanations = await Promise.all(
    programs.slice(0, 5).map(async (p) => {
      const explanation = await generateMatchExplanation(query, p);
      return { ...p, ...explanation };
    }),
  );

  // Rest without explanations
  const rest = programs.slice(5).map((p) => ({
    ...p,
    match_reason: null,
    key_matches: [],
    considerations: [],
  }));

  const result = [...withExplanations, ...rest];

  // Store match records
  if (userId) {
    for (const p of result.slice(0, 10)) {
      await prisma.aiMatchRecord.create({
        data: {
          user_id: userId,
          program_id: p.program_id,
          query_text: query,
          match_score: p.match_score,
          match_reason: p.match_reason,
          ranking_position: result.indexOf(p) + 1,
        },
      }).catch(() => {});
    }
  }

  return result;
}

// ---- Match Explanation Generator ----

async function generateMatchExplanation(
  query: string,
  program: Record<string, any>,
): Promise<{ match_reason: string | null; key_matches: string[]; considerations: string[] }> {
  if (!isAIConfigured()) {
    return {
      match_reason: `This program matches your search for "${query}"`,
      key_matches: [],
      considerations: [],
    };
  }

  const cacheKey = `match_explanation:${query.slice(0, 50)}:${program.program_id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const prompt = `A user is looking for training: "${query}"

We matched them with this program:
Title: ${program.title}
Description: ${program.short_description || program.description?.slice(0, 300)}
Category: ${program.category?.name}
Target Group: ${program.target_group}
Delivery: ${program.delivery_mode}
Duration: ${program.duration_days} days
Fee: RM ${program.fee_per_pax || program.fee_per_group}
Provider: ${program.provider?.provider_name} (${program.provider?.quality_tier} tier)

Match score: ${program.match_score}/100

Generate a JSON response with:
1. "reason": one sentence (max 150 chars) explaining why this matches
2. "key_matches": array of 3-4 specific matching points
3. "considerations": array of 0-2 potential gaps or things to note

Respond ONLY with valid JSON.`;

    const result = await chat(
      [{ role: 'user', content: prompt }],
      true,
    );

    const parsed = JSON.parse(result.content);
    const explanation = {
      match_reason: parsed.reason || null,
      key_matches: parsed.key_matches || [],
      considerations: parsed.considerations || [],
    };

    await redis.set(cacheKey, JSON.stringify(explanation), 'EX', 3600);
    return explanation;
  } catch (error) {
    console.error('Match explanation failed:', error);
    return {
      match_reason: `This program addresses "${query}" based on its content and target audience.`,
      key_matches: [],
      considerations: [],
    };
  }
}

// ---- Similar Programs ----

export async function getSimilarPrograms(
  programId: string,
  sameProvider: boolean = false,
  limit: number = 6,
) {
  // Get program embedding and find nearest neighbors
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    select: { provider_id: true, title: true, description: true, category_id: true },
  });

  if (!program) return [];

  // Try vector similarity
  const results = await prisma.$queryRawUnsafe<Array<{ program_id: string; distance: number }>>(
    `SELECT p.program_id, pe.embedding <=> (
       SELECT embedding FROM program_embeddings WHERE program_id = $1
     ) AS distance
     FROM training_programs p
     JOIN program_embeddings pe ON p.program_id = pe.program_id
     WHERE p.status = 'published'
       AND p.program_id != $1
       ${sameProvider ? `AND p.provider_id = $3` : `AND p.provider_id != $3`}
     ORDER BY distance ASC
     LIMIT $2`,
    programId,
    limit,
    program.provider_id,
  ).catch(() => []);

  if (results.length > 0) {
    const programIds = results.map((r) => r.program_id);
    const distanceMap = new Map(results.map((r) => [r.program_id, r.distance]));

    const programs = await prisma.trainingProgram.findMany({
      where: { program_id: { in: programIds } },
      select: PROGRAM_CARD_SELECT,
    });

    return programs
      .map((p) => ({
        ...p,
        similarity_score: Math.round((1 - (distanceMap.get(p.program_id) || 0.5)) * 100),
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score);
  }

  // Fallback: same category
  return prisma.trainingProgram.findMany({
    where: {
      status: 'published',
      category_id: program.category_id,
      program_id: { not: programId },
      provider_id: sameProvider ? program.provider_id : { not: program.provider_id },
    },
    select: PROGRAM_CARD_SELECT,
    orderBy: { enquiry_count: 'desc' },
    take: limit,
  });
}

// ---- AI-Powered Recommendations ----

export async function getAIRecommendations(userId: string, limit: number = 12) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      role: true,
      employer_profile: { select: { industry: true, training_interests: true } },
      individual_profile: { select: { skill_interests: true, career_goals: true } },
    },
  });

  if (!user) return [];

  // Build query from user profile
  let queryParts: string[] = [];

  if (user.role === 'employer' && user.employer_profile) {
    if (user.employer_profile.industry) queryParts.push(user.employer_profile.industry);
    if (user.employer_profile.training_interests?.length) {
      queryParts.push(...user.employer_profile.training_interests.slice(0, 3));
    }
  } else if (user.role === 'individual' && user.individual_profile) {
    if (user.individual_profile.skill_interests?.length) {
      queryParts.push(...user.individual_profile.skill_interests.slice(0, 3));
    }
    if (user.individual_profile.career_goals) {
      queryParts.push(user.individual_profile.career_goals.slice(0, 100));
    }
  }

  // Add behavioral signals from recent activity
  const recentSearches = await prisma.searchHistory.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 3,
    select: { search_query: true },
  });
  queryParts.push(...recentSearches.map((s) => s.search_query));

  if (queryParts.length === 0) {
    // No profile data — return popular programs
    return prisma.trainingProgram.findMany({
      where: { status: 'published' },
      select: PROGRAM_CARD_SELECT,
      orderBy: [{ enquiry_count: 'desc' }, { view_count: 'desc' }],
      take: limit,
    });
  }

  const query = queryParts.join(' ');
  return matchPrograms(query, {}, limit, userId);
}

// ---- Match Providers to Broadcast Request ----

export async function matchProvidersToRequest(requestId: string) {
  const request = await prisma.trainingRequestBroadcast.findUnique({
    where: { request_id: requestId },
  });

  if (!request) return [];

  const query = `${request.title} ${request.description} ${request.target_skills.join(' ')}`;
  const semanticResults = await semanticSearch(query, {}, 50);

  if (semanticResults.length === 0) return [];

  // Group by provider and get best match per provider
  const programIds = semanticResults.map((r) => r.program_id);
  const programs = await prisma.trainingProgram.findMany({
    where: { program_id: { in: programIds } },
    select: { program_id: true, provider_id: true },
  });

  const distanceMap = new Map(semanticResults.map((r) => [r.program_id, r.distance]));
  const providerBest = new Map<string, number>();

  for (const p of programs) {
    const distance = distanceMap.get(p.program_id) || 1;
    const score = Math.round((1 - distance) * 100);
    const existing = providerBest.get(p.provider_id) || 0;
    if (score > existing) providerBest.set(p.provider_id, score);
  }

  return Array.from(providerBest.entries())
    .map(([provider_id, relevance_score]) => ({ provider_id, relevance_score }))
    .sort((a, b) => b.relevance_score - a.relevance_score);
}
