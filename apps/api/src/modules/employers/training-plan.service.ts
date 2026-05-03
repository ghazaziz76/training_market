import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { matchPrograms } from '../ai/matching.service.js';

async function getEmployerId(userId: string) {
  const p = await prisma.employerProfile.findUnique({ where: { user_id: userId }, select: { employer_id: true } });
  if (!p) throw AppError.notFound('Employer not found');
  return p.employer_id;
}

export async function createPlan(userId: string, input: {
  year: number;
  total_budget: number;
  departments: Array<{ name: string; headcount: number; skill_gaps: string[]; budget_allocation: number }>;
}) {
  const employerId = await getEmployerId(userId);

  return prisma.annualTrainingPlan.create({
    data: {
      employer_id: employerId,
      year: input.year,
      total_budget: input.total_budget,
      departments: input.departments,
      status: 'draft',
    },
  });
}

export async function generateAISuggestions(userId: string, planId: string) {
  const employerId = await getEmployerId(userId);

  const plan = await prisma.annualTrainingPlan.findUnique({ where: { plan_id: planId } });
  if (!plan) throw AppError.notFound('Plan not found');
  if (plan.employer_id !== employerId) throw AppError.forbidden('Not your plan');

  const departments = plan.departments as Array<{ name: string; headcount: number; skill_gaps: string[]; budget_allocation: number }>;
  const suggestedItems: any[] = [];
  let totalCost = 0;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  let quarterIdx = 0;

  for (const dept of departments) {
    if (dept.skill_gaps.length === 0) continue;

    const query = dept.skill_gaps.join(' ');
    const results = await matchPrograms(query, { hrd_corp_claimable: true }, 3, userId);

    for (const prog of results.slice(0, 2)) {
      const fee = Number(prog.fee_per_pax || prog.fee_per_group || 0);
      const estimatedCost = prog.fee_per_pax ? fee * Math.min(dept.headcount, 20) : fee;

      if (totalCost + estimatedCost > Number(plan.total_budget)) break;

      suggestedItems.push({
        quarter: quarters[quarterIdx % 4],
        department: dept.name,
        program: {
          program_id: prog.program_id,
          title: prog.title,
          provider_name: prog.provider?.provider_name,
          fee_per_pax: prog.fee_per_pax,
        },
        participants: Math.min(dept.headcount, 20),
        total_cost: estimatedCost,
        reason: prog.match_reason || `Addresses ${dept.skill_gaps[0]} skill gap for ${dept.name}`,
      });

      totalCost += estimatedCost;
      quarterIdx++;
    }
  }

  return {
    suggested_items: suggestedItems,
    total_estimated_cost: totalCost,
    budget_remaining: Number(plan.total_budget) - totalCost,
  };
}

export async function updatePlanItems(userId: string, planId: string, items: any[]) {
  const employerId = await getEmployerId(userId);

  const plan = await prisma.annualTrainingPlan.findUnique({ where: { plan_id: planId } });
  if (!plan) throw AppError.notFound('Plan not found');
  if (plan.employer_id !== employerId) throw AppError.forbidden('Not your plan');

  return prisma.annualTrainingPlan.update({
    where: { plan_id: planId },
    data: { planned_items: items },
  });
}

export async function getPlanProgress(userId: string, planId: string) {
  const employerId = await getEmployerId(userId);

  const plan = await prisma.annualTrainingPlan.findUnique({ where: { plan_id: planId } });
  if (!plan) throw AppError.notFound('Plan not found');
  if (plan.employer_id !== employerId) throw AppError.forbidden('Not your plan');

  const items = plan.planned_items as any[];
  const total = items.length;
  const completed = items.filter((i: any) => i.status === 'completed').length;
  const inProgress = items.filter((i: any) => i.status === 'in_progress').length;
  const budgetSpent = items
    .filter((i: any) => i.status === 'completed' || i.status === 'in_progress')
    .reduce((sum: number, i: any) => sum + (i.total_cost || 0), 0);

  return {
    plan_id: planId,
    year: plan.year,
    total_budget: plan.total_budget,
    planned: total,
    completed,
    in_progress: inProgress,
    upcoming: total - completed - inProgress,
    completion_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    budget_spent: budgetSpent,
    budget_remaining: Number(plan.total_budget) - budgetSpent,
  };
}

export async function listPlans(userId: string) {
  const employerId = await getEmployerId(userId);

  return prisma.annualTrainingPlan.findMany({
    where: { employer_id: employerId },
    orderBy: { year: 'desc' },
    select: {
      plan_id: true,
      year: true,
      total_budget: true,
      planned_items: true,
      completion_percentage: true,
      status: true,
      created_at: true,
    },
  });
}
