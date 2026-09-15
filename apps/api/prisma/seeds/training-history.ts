import type { PrismaClient } from '@prisma/client';

// Sample attendance records for the demo employer and individual accounts
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
        ],
      },
    },
    select: { program_id: true, slug: true },
  });
  const bySlug = new Map(programs.map((p) => [p.slug, p.program_id]));

  const records: { user_id: string; slug: string; attended_on: string; participants_count: number; notes: string | null }[] = [];

  if (employer) {
    records.push(
      { user_id: employer.user_id, slug: 'advanced-strategic-leadership-masterclass', attended_on: '2026-03-12', participants_count: 6, notes: 'Senior management team' },
      { user_id: employer.user_id, slug: 'sales-closing-mastery-workshop', attended_on: '2026-05-20', participants_count: 12, notes: 'Full sales department, Q2 upskilling' },
      { user_id: employer.user_id, slug: 'osha-safety-compliance-and-risk-management', attended_on: '2025-11-04', participants_count: 25, notes: 'Factory floor supervisors and safety officers' },
    );
  }

  if (individual) {
    records.push(
      { user_id: individual.user_id, slug: 'advanced-excel-for-business-analytics', attended_on: '2026-02-18', participants_count: 1, notes: 'Completed all modules' },
      { user_id: individual.user_id, slug: 'sales-closing-mastery-workshop', attended_on: '2025-09-09', participants_count: 1, notes: null },
    );
  }

  for (const r of records) {
    const program_id = bySlug.get(r.slug);
    if (!program_id) continue;
    const attended_on = new Date(r.attended_on);

    const exists = await prisma.trainingAttendance.findFirst({
      where: { user_id: r.user_id, program_id, attended_on },
      select: { attendance_id: true },
    });
    if (exists) continue;

    await prisma.trainingAttendance.create({
      data: { user_id: r.user_id, program_id, attended_on, participants_count: r.participants_count, notes: r.notes },
    });
  }

  console.log(`  Training history: ${records.length} records ensured`);
}
