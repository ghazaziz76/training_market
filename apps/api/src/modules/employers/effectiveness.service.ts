import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

async function getEmployerId(userId: string) {
  const p = await prisma.employerProfile.findUnique({ where: { user_id: userId }, select: { employer_id: true } });
  if (!p) throw AppError.notFound('Employer not found');
  return p.employer_id;
}

export async function createTracking(userId: string, input: {
  program_id: string;
  provider_id: string;
  kpi_description: string;
  baseline_value: string;
  target_value: string;
}) {
  const employerId = await getEmployerId(userId);

  return prisma.effectivenessRecord.create({
    data: {
      employer_id: employerId,
      program_id: input.program_id,
      provider_id: input.provider_id,
      kpi_description: input.kpi_description,
      baseline_value: input.baseline_value,
      target_value: input.target_value,
      status: 'tracking',
    },
  });
}

export async function submitSurvey(userId: string, recordId: string, input: {
  survey_type: '30_day' | '60_day' | '90_day';
  impact_rating: number;
  actual_value: string;
  feedback: string;
  would_recommend: boolean;
}) {
  const employerId = await getEmployerId(userId);

  const record = await prisma.effectivenessRecord.findUnique({ where: { record_id: recordId } });
  if (!record) throw AppError.notFound('Record not found');
  if (record.employer_id !== employerId) throw AppError.forbidden('Not your record');

  const surveyField = `survey_${input.survey_type.replace('_day', '_day')}`;
  const surveyData = {
    impact_rating: input.impact_rating,
    actual_value: input.actual_value,
    feedback: input.feedback,
    would_recommend: input.would_recommend,
    submitted_at: new Date().toISOString(),
  };

  const updateData: any = {
    actual_value: input.actual_value,
    impact_rating: input.impact_rating,
  };

  if (input.survey_type === '30_day') updateData.survey_30_day = surveyData;
  else if (input.survey_type === '60_day') updateData.survey_60_day = surveyData;
  else if (input.survey_type === '90_day') {
    updateData.survey_90_day = surveyData;
    updateData.status = 'completed';
  }

  await prisma.effectivenessRecord.update({ where: { record_id: recordId }, data: updateData });

  // Update program effectiveness score (average of all impact ratings)
  const allRatings = await prisma.effectivenessRecord.aggregate({
    where: { program_id: record.program_id, impact_rating: { not: null } },
    _avg: { impact_rating: true },
  });

  if (allRatings._avg.impact_rating) {
    await prisma.trainingProgram.update({
      where: { program_id: record.program_id },
      data: { effectiveness_score: Math.round(allRatings._avg.impact_rating * 100) / 100 },
    });
  }

  return { record_id: recordId, survey_type: input.survey_type };
}

export async function listMyTracking(userId: string) {
  const employerId = await getEmployerId(userId);

  return prisma.effectivenessRecord.findMany({
    where: { employer_id: employerId },
    include: {
      program: { select: { title: true } },
      provider: { select: { provider_name: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getProgramEffectiveness(programId: string) {
  const records = await prisma.effectivenessRecord.findMany({
    where: { program_id: programId, impact_rating: { not: null } },
    select: { impact_rating: true, survey_90_day: true },
  });

  if (records.length === 0) return null;

  const avgRating = records.reduce((sum, r) => sum + (r.impact_rating || 0), 0) / records.length;
  const wouldRecommend = records.filter((r) => {
    const survey = r.survey_90_day as any;
    return survey?.would_recommend === true;
  }).length;

  return {
    effectiveness_score: Math.round(avgRating * 10) / 10,
    total_tracked: records.length,
    would_recommend_pct: Math.round((wouldRecommend / records.length) * 100),
    average_impact_rating: Math.round(avgRating * 10) / 10,
  };
}
