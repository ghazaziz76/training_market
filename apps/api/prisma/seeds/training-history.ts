import type { PrismaClient } from '@prisma/client';

// Sample training history for the demo employer and individual accounts
export async function seedTrainingHistory(prisma: PrismaClient) {
  console.log('Seeding training history...');

  const employer = await prisma.user.findUnique({ where: { email: 'EMP1@demo.com' }, select: { user_id: true } });
  const individual = await prisma.user.findUnique({ where: { email: 'individual@demo.com' }, select: { user_id: true } });

  const programs = await prisma.trainingProgram.findMany({
    where: {
      slug: {
        in: [
          'advanced-strategic-leadership-masterclass',
          'sales-closing-mastery-workshop',
          'osha-safety-compliance-and-risk-management',
          'advanced-excel-for-business-analytics',
          'lean-manufacturing-and-continuous-improvement',
        ],
      },
    },
    select: { program_id: true, slug: true },
  });
  const bySlug = new Map(programs.map((p) => [p.slug, p.program_id]));

  type Row = {
    user_id: string;
    slug: string;
    status: 'viewed' | 'attended';
    attended_on?: string;
    participants_count?: number;
    notes?: string;
    viewed_days_ago: number;
  };
  const rows: Row[] = [];

  if (employer) {
    rows.push(
      { user_id: employer.user_id, slug: 'lean-manufacturing-and-continuous-improvement', status: 'viewed', viewed_days_ago: 2 },
      { user_id: employer.user_id, slug: 'sales-closing-mastery-workshop', status: 'attended', attended_on: '2026-05-20', participants_count: 12, notes: 'Full sales department, Q2 upskilling', viewed_days_ago: 120 },
      { user_id: employer.user_id, slug: 'advanced-strategic-leadership-masterclass', status: 'attended', attended_on: '2026-03-12', participants_count: 6, notes: 'Senior management team', viewed_days_ago: 190 },
      { user_id: employer.user_id, slug: 'osha-safety-compliance-and-risk-management', status: 'attended', attended_on: '2025-11-04', participants_count: 25, notes: 'Factory floor supervisors and safety officers', viewed_days_ago: 320 },
    );
  }

  if (individual) {
    rows.push(
      { user_id: individual.user_id, slug: 'advanced-strategic-leadership-masterclass', status: 'viewed', viewed_days_ago: 1 },
      { user_id: individual.user_id, slug: 'advanced-excel-for-business-analytics', status: 'attended', attended_on: '2026-02-18', participants_count: 1, notes: 'Completed all modules', viewed_days_ago: 210 },
      { user_id: individual.user_id, slug: 'sales-closing-mastery-workshop', status: 'attended', attended_on: '2025-09-09', participants_count: 1, viewed_days_ago: 370 },
    );
  }

  let ensured = 0;
  for (const r of rows) {
    const program_id = bySlug.get(r.slug);
    if (!program_id) continue;
    const viewedAt = new Date(Date.now() - r.viewed_days_ago * 86400000);

    await prisma.trainingHistoryEntry.upsert({
      where: { user_id_program_id: { user_id: r.user_id, program_id } },
      update: {},
      create: {
        user_id: r.user_id,
        program_id,
        status: r.status,
        first_viewed_at: viewedAt,
        last_viewed_at: viewedAt,
        attended_on: r.attended_on ? new Date(r.attended_on) : null,
        participants_count: r.participants_count ?? 1,
        notes: r.notes ?? null,
      },
    });
    ensured += 1;
  }

  console.log(`  Training history: ${ensured} entries ensured`);
}
