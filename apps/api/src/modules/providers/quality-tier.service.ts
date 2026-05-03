import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

type TierLevel = 'unverified' | 'verified' | 'trusted' | 'premium';

interface TierCriteria {
  met: boolean;
  current: string | number | boolean;
  required: string | number | boolean;
}

function monthsOnPlatform(createdAt: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export function calculateTier(provider: {
  verification_status: string;
  hrd_corp_registered_provider: boolean;
  accreditation_details: string | null;
  average_rating: number;
  response_rate: number;
  total_completed_programs: number;
  created_at: Date;
}): TierLevel {
  const months = monthsOnPlatform(provider.created_at);
  const rating = Number(provider.average_rating);
  const responseRate = Number(provider.response_rate);

  if (
    provider.verification_status === 'verified' &&
    provider.hrd_corp_registered_provider &&
    provider.accreditation_details &&
    rating >= 4.5 &&
    responseRate >= 90 &&
    provider.total_completed_programs >= 50 &&
    months >= 12
  ) {
    return 'premium';
  }

  if (
    provider.verification_status === 'verified' &&
    rating >= 4.0 &&
    responseRate >= 80 &&
    provider.total_completed_programs >= 10 &&
    months >= 6
  ) {
    return 'trusted';
  }

  if (provider.verification_status === 'verified') {
    return 'verified';
  }

  return 'unverified';
}

export async function getTierProgress(userId: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  const months = monthsOnPlatform(provider.created_at);
  const rating = Number(provider.average_rating);
  const responseRate = Number(provider.response_rate);
  const currentTier = provider.quality_tier as TierLevel;

  // Determine next tier and progress
  let nextTier: TierLevel | null = null;
  const progress: Record<string, TierCriteria> = {};
  const tips: string[] = [];

  if (currentTier === 'unverified') {
    nextTier = 'verified';
    progress.verification = { met: provider.verification_status === 'verified', current: provider.verification_status, required: 'verified' };
    if (!progress.verification.met) tips.push('Complete your profile and await admin verification');
  } else if (currentTier === 'verified') {
    nextTier = 'trusted';
    progress.verification = { met: true, current: 'verified', required: 'verified' };
    progress.average_rating = { met: rating >= 4.0, current: rating, required: 4.0 };
    progress.response_rate = { met: responseRate >= 80, current: responseRate, required: 80 };
    progress.completed_programs = { met: provider.total_completed_programs >= 10, current: provider.total_completed_programs, required: 10 };
    progress.months_on_platform = { met: months >= 6, current: months, required: 6 };
    if (!progress.average_rating.met) tips.push('Improve your rating to 4.0+ to progress');
    if (!progress.response_rate.met) tips.push('Respond to enquiries faster to improve your response rate');
    if (!progress.completed_programs.met) tips.push(`Complete ${10 - provider.total_completed_programs} more training sessions`);
  } else if (currentTier === 'trusted') {
    nextTier = 'premium';
    progress.verification = { met: true, current: 'verified', required: 'verified' };
    progress.hrd_corp_registered = { met: provider.hrd_corp_registered_provider, current: provider.hrd_corp_registered_provider, required: true };
    progress.accreditation = { met: !!provider.accreditation_details, current: !!provider.accreditation_details, required: true };
    progress.average_rating = { met: rating >= 4.5, current: rating, required: 4.5 };
    progress.response_rate = { met: responseRate >= 90, current: responseRate, required: 90 };
    progress.completed_programs = { met: provider.total_completed_programs >= 50, current: provider.total_completed_programs, required: 50 };
    progress.months_on_platform = { met: months >= 12, current: months, required: 12 };
    if (!progress.hrd_corp_registered.met) tips.push('Register as HRD Corp provider to qualify');
    if (!progress.average_rating.met) tips.push('Improve your rating to 4.5+ for Premium tier');
    if (!progress.completed_programs.met) tips.push(`Complete ${50 - provider.total_completed_programs} more training sessions`);
  }

  const metCount = Object.values(progress).filter((c) => c.met).length;
  const totalCriteria = Object.keys(progress).length;
  const progressPct = totalCriteria > 0 ? Math.round((metCount / totalCriteria) * 100) : 100;

  return {
    current_tier: currentTier,
    next_tier: nextTier,
    progress,
    progress_pct: progressPct,
    tips,
  };
}

// ---- Recalculate all provider tiers (admin/scheduled job) ----

export async function recalculateAllTiers() {
  const providers = await prisma.trainingProvider.findMany({
    where: { status: 'active' },
  });

  let updated = 0;
  for (const provider of providers) {
    const newTier = calculateTier({
      verification_status: provider.verification_status,
      hrd_corp_registered_provider: provider.hrd_corp_registered_provider,
      accreditation_details: provider.accreditation_details,
      average_rating: Number(provider.average_rating),
      response_rate: Number(provider.response_rate),
      total_completed_programs: provider.total_completed_programs,
      created_at: provider.created_at,
    });

    if (newTier !== provider.quality_tier) {
      await prisma.trainingProvider.update({
        where: { provider_id: provider.provider_id },
        data: { quality_tier: newTier, quality_tier_updated_at: new Date() },
      });

      // Notify provider of tier change
      await prisma.notification.create({
        data: {
          user_id: provider.user_id,
          type: newTier > provider.quality_tier ? 'tier_upgrade' : 'tier_downgrade',
          title: `Quality tier ${newTier > provider.quality_tier ? 'upgraded' : 'changed'}: ${newTier}`,
          message: `Your quality tier has been updated to ${newTier}.`,
          action_url: '/provider/quality-tier',
        },
      });

      updated++;
    }
  }

  return { total_providers: providers.length, updated };
}
