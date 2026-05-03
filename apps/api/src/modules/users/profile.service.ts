import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  UpdateEmployerProfileInput,
  UpdateIndividualProfileInput,
  UpdateProviderProfileInput,
} from '../../shared/validators/profile.validators.js';

// ---- Profile Completion Calculators ----

function calcEmployerCompletion(p: Record<string, any>): number {
  let pct = 0;
  if (p.company_name) pct += 12;
  if (p.registration_no) pct += 8;
  if (p.industry) pct += 8;
  if (p.company_size) pct += 7;
  if (p.contact_person) pct += 8;
  if (p.contact_email || p.contact_phone) pct += 10;
  if (p.address || (p.city && p.state)) pct += 12;
  if (p.hrd_corp_registered !== null) pct += 5;
  if (p.hrd_corp_registered && p.hrd_corp_levy_balance != null) pct += 10;
  if (p.training_interests?.length > 0) pct += 15;
  pct += 5; // base
  return Math.min(pct, 100);
}

function calcIndividualCompletion(p: Record<string, any>): number {
  let pct = 0;
  if (p.occupation) pct += 15;
  if (p.education_level) pct += 15;
  if (p.city && p.state) pct += 15;
  if (p.skill_interests?.length > 0) pct += 20;
  if (p.career_goals) pct += 15;
  if (p.preferred_training_mode) pct += 10;
  pct += 10; // placeholder for profile image
  return Math.min(pct, 100);
}

function calcProviderCompletion(p: Record<string, any>): number {
  let pct = 0;
  if (p.provider_name) pct += 10;
  if (p.registration_no) pct += 8;
  if (p.business_description) pct += 10;
  if (p.contact_person && p.contact_email) pct += 12;
  if (p.contact_phone) pct += 5;
  if (p.address || (p.city && p.state)) pct += 8;
  if (p.website) pct += 5;
  if (p.logo_url) pct += 10;
  if (p.year_established) pct += 5;
  const specs = Array.isArray(p.specializations) ? p.specializations : [];
  if (specs.length > 0) pct += 7;
  if (p.accreditation_details) pct += 5;
  if (p.hrd_corp_registered_provider !== null) pct += 5;
  if (p.hrd_corp_registered_provider && p.hrd_corp_certificate_url) pct += 5;
  pct += 5; // placeholder for having at least 1 program
  return Math.min(pct, 100);
}

// ---- Employer Profile ----

export async function getEmployerProfile(userId: string) {
  const profile = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) throw AppError.notFound('Employer profile not found');
  return profile;
}

export async function updateEmployerProfile(userId: string, input: UpdateEmployerProfileInput) {
  const profile = await prisma.employerProfile.findUnique({ where: { user_id: userId } });
  if (!profile) throw AppError.notFound('Employer profile not found');

  const updated = await prisma.employerProfile.update({
    where: { user_id: userId },
    data: {
      ...input,
      hrd_corp_levy_balance: input.hrd_corp_levy_balance,
    },
  });

  // Recalculate completion
  const completion = calcEmployerCompletion(updated);
  await prisma.employerProfile.update({
    where: { user_id: userId },
    data: { profile_completion_pct: completion },
  });

  return { ...updated, profile_completion_pct: completion };
}

// ---- Individual Profile ----

export async function getIndividualProfile(userId: string) {
  const profile = await prisma.individualProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) throw AppError.notFound('Individual profile not found');
  return profile;
}

export async function updateIndividualProfile(userId: string, input: UpdateIndividualProfileInput) {
  const profile = await prisma.individualProfile.findUnique({ where: { user_id: userId } });
  if (!profile) throw AppError.notFound('Individual profile not found');

  const updated = await prisma.individualProfile.update({
    where: { user_id: userId },
    data: input,
  });

  const completion = calcIndividualCompletion(updated);
  await prisma.individualProfile.update({
    where: { user_id: userId },
    data: { profile_completion_pct: completion },
  });

  return { ...updated, profile_completion_pct: completion };
}

// ---- Provider Profile ----

export async function getProviderProfile(userId: string) {
  const profile = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    include: {
      subscriptions: {
        where: { payment_status: 'active' },
        take: 1,
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!profile) throw AppError.notFound('Provider profile not found');
  return profile;
}

export async function updateProviderProfile(userId: string, input: UpdateProviderProfileInput) {
  const profile = await prisma.trainingProvider.findUnique({ where: { user_id: userId } });
  if (!profile) throw AppError.notFound('Provider profile not found');

  const updated = await prisma.trainingProvider.update({
    where: { user_id: userId },
    data: input,
  });

  const completion = calcProviderCompletion(updated);
  await prisma.trainingProvider.update({
    where: { user_id: userId },
    data: { profile_completion_pct: completion },
  });

  return { ...updated, profile_completion_pct: completion };
}
