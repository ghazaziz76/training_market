import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { matchPrograms } from '../ai/matching.service.js';

async function getEmployerProfile(userId: string) {
  const profile = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
  });
  if (!profile) throw AppError.notFound('Employer profile not found');
  return profile;
}

export async function getLevyStatus(userId: string) {
  const profile = await getEmployerProfile(userId);

  const year = new Date().getFullYear();
  let record = await prisma.levyUtilizationRecord.findUnique({
    where: { employer_id_year: { employer_id: profile.employer_id, year } },
  });

  if (!record && profile.hrd_corp_levy_balance) {
    // Auto-create from profile balance
    record = await prisma.levyUtilizationRecord.create({
      data: {
        employer_id: profile.employer_id,
        year,
        total_levy: profile.hrd_corp_levy_balance,
        utilized_amount: 0,
        remaining_amount: profile.hrd_corp_levy_balance,
        utilization_percentage: 0,
      },
    });
  }

  if (!record) {
    return {
      year,
      total_levy: 0,
      utilized_amount: 0,
      remaining_amount: 0,
      utilization_percentage: 0,
      months_remaining: 12 - new Date().getMonth(),
      status: 'no_data',
    };
  }

  const monthsRemaining = 12 - new Date().getMonth();
  const remaining = Number(record.remaining_amount);
  const total = Number(record.total_levy);
  const utilPct = Number(record.utilization_percentage);

  let status: string;
  if (utilPct >= 80) status = 'well_utilized';
  else if (utilPct >= 50) status = 'on_track';
  else status = 'underutilized';

  return {
    year: record.year,
    total_levy: total,
    utilized_amount: Number(record.utilized_amount),
    remaining_amount: remaining,
    utilization_percentage: utilPct,
    months_remaining: monthsRemaining,
    monthly_target: monthsRemaining > 0 ? Math.round(remaining / monthsRemaining) : 0,
    status,
  };
}

export async function updateLevyBalance(
  userId: string,
  totalLevy: number,
  utilizedAmount: number,
  year?: number,
) {
  const profile = await getEmployerProfile(userId);
  const targetYear = year || new Date().getFullYear();
  const remaining = totalLevy - utilizedAmount;
  const utilPct = totalLevy > 0 ? Math.round((utilizedAmount / totalLevy) * 100) : 0;

  await prisma.levyUtilizationRecord.upsert({
    where: { employer_id_year: { employer_id: profile.employer_id, year: targetYear } },
    create: {
      employer_id: profile.employer_id,
      year: targetYear,
      total_levy: totalLevy,
      utilized_amount: utilizedAmount,
      remaining_amount: remaining,
      utilization_percentage: utilPct,
    },
    update: {
      total_levy: totalLevy,
      utilized_amount: utilizedAmount,
      remaining_amount: remaining,
      utilization_percentage: utilPct,
    },
  });

  // Also update profile
  await prisma.employerProfile.update({
    where: { employer_id: profile.employer_id },
    data: { hrd_corp_levy_balance: remaining },
  });

  return getLevyStatus(userId);
}

export async function getLevyRecommendations(userId: string) {
  const profile = await getEmployerProfile(userId);
  const levyStatus = await getLevyStatus(userId);

  if (levyStatus.status === 'no_data' || levyStatus.remaining_amount <= 0) {
    return {
      summary: { remaining_levy: 0, months_remaining: 0, recommended_spend: 0, programs_suggested: 0 },
      recommendations: [],
      tips: ['Update your levy balance to get personalized recommendations.'],
    };
  }

  // Build search query from employer profile
  const interests = profile.training_interests || [];
  const query = interests.length > 0
    ? `${profile.industry || ''} ${interests.join(' ')}`.trim()
    : profile.industry || 'professional development';

  // Find HRD Corp claimable programs within budget
  const results = await matchPrograms(
    query,
    { hrd_corp_claimable: true },
    10,
    userId,
  );

  const remaining = levyStatus.remaining_amount;
  const monthsLeft = levyStatus.months_remaining;
  const monthlyBudget = monthsLeft > 0 ? remaining / monthsLeft : remaining;

  // Build recommendations distributed across remaining months
  const recommendations: any[] = [];
  let projectedSpend = 0;
  const currentMonth = new Date().getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < results.length && projectedSpend < remaining; i++) {
    const p = results[i];
    const fee = Number(p.fee_per_pax || p.fee_per_group || 0);
    if (fee <= 0) continue;

    const suggestedMonth = currentMonth + Math.floor(i * (monthsLeft / Math.min(results.length, 6)));
    const monthIdx = Math.min(suggestedMonth, 11);

    recommendations.push({
      priority: i + 1,
      program: {
        program_id: p.program_id,
        title: p.title,
        provider_name: p.provider?.provider_name,
        fee_per_pax: p.fee_per_pax,
        delivery_mode: p.delivery_mode,
        duration_days: p.duration_days,
      },
      suggested_month: `${monthNames[monthIdx]} ${new Date().getFullYear()}`,
      estimated_cost: fee,
      match_score: p.match_score,
      reason: p.match_reason || `Matches your ${profile.industry || 'industry'} training needs`,
    });

    projectedSpend += fee;
  }

  return {
    summary: {
      remaining_levy: remaining,
      months_remaining: monthsLeft,
      recommended_spend: Math.min(projectedSpend, remaining),
      programs_suggested: recommendations.length,
    },
    recommendations,
    levy_projection: recommendations.map((r, i) => ({
      month: r.suggested_month,
      projected_spend: r.estimated_cost,
      projected_remaining: remaining - recommendations.slice(0, i + 1).reduce((sum: number, rec: any) => sum + rec.estimated_cost, 0),
    })),
    tips: [
      `You have ${monthsLeft} months to utilize RM ${remaining.toLocaleString()}`,
      levyStatus.status === 'underutilized' ? 'Consider group training sessions to maximize coverage' : '',
      'Early bird rates can save 10-20% on some programs',
    ].filter(Boolean),
  };
}
