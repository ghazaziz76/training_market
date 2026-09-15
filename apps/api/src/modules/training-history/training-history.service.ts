import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { MarkAttendedInput } from '../../shared/validators/training-history.validators.js';

const entrySelect = {
  history_id: true,
  program_id: true,
  status: true,
  first_viewed_at: true,
  last_viewed_at: true,
  attended_on: true,
  participants_count: true,
  notes: true,
  program: {
    select: {
      title: true,
      slug: true,
      status: true,
      duration_hours: true,
      duration_days: true,
      delivery_mode: true,
      is_certification: true,
      certification_name: true,
      thumbnail_url: true,
      category: { select: { name: true } },
      provider: { select: { provider_id: true, provider_name: true } },
    },
  },
} as const;

function toEntry(e: any) {
  return {
    history_id: e.history_id,
    program_id: e.program_id,
    status: e.status,
    first_viewed_at: e.first_viewed_at,
    last_viewed_at: e.last_viewed_at,
    attended_on: e.attended_on,
    participants_count: e.participants_count,
    notes: e.notes,
    program_title: e.program.title,
    program_slug: e.program.slug,
    program_status: e.program.status,
    duration_hours: e.program.duration_hours,
    duration_days: e.program.duration_days,
    delivery_mode: e.program.delivery_mode,
    is_certification: e.program.is_certification,
    certification_name: e.program.certification_name,
    thumbnail_url: e.program.thumbnail_url,
    category_name: e.program.category?.name ?? null,
    provider_id: e.program.provider.provider_id,
    provider_name: e.program.provider.provider_name,
  };
}

// Called when a logged-in employer/individual opens a program page.
export async function recordView(userId: string, programId: string) {
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    select: { program_id: true, status: true },
  });
  if (!program || program.status !== 'published') return null;

  return prisma.trainingHistoryEntry.upsert({
    where: { user_id_program_id: { user_id: userId, program_id: programId } },
    create: { user_id: userId, program_id: programId, status: 'viewed' },
    update: { last_viewed_at: new Date() },
    select: { history_id: true, status: true },
  });
}

export async function listHistory(userId: string) {
  const rows = await prisma.trainingHistoryEntry.findMany({
    where: { user_id: userId },
    orderBy: [{ last_viewed_at: 'desc' }],
    select: entrySelect,
  });

  const entries = rows.map(toEntry);

  const summary = entries.reduce(
    (acc, e) => {
      acc.total_viewed += 1;
      if (e.status !== 'attended') return acc;
      acc.total_attended += 1;
      acc.total_participants += e.participants_count;
      acc.total_hours += (e.duration_hours ?? 0) * e.participants_count;
      acc.total_days += (e.duration_days ?? 0) * e.participants_count;
      if (e.is_certification) acc.certifications += 1;
      return acc;
    },
    { total_viewed: 0, total_attended: 0, total_participants: 0, total_hours: 0, total_days: 0, certifications: 0 },
  );

  return { entries, summary };
}

async function assertOwned(userId: string, historyId: string) {
  const existing = await prisma.trainingHistoryEntry.findUnique({
    where: { history_id: historyId },
    select: { user_id: true },
  });
  if (!existing) throw AppError.notFound('History entry not found');
  if (existing.user_id !== userId) throw AppError.forbidden('Not your history entry');
}

export async function markAttended(userId: string, role: string, historyId: string, input: MarkAttendedInput) {
  await assertOwned(userId, historyId);

  const attendedOn = new Date(input.attended_on);
  if (attendedOn.getTime() > Date.now()) {
    throw AppError.badRequest('Attendance date cannot be in the future');
  }

  const participants = role === 'employer' ? (input.participants_count ?? 1) : 1;

  const updated = await prisma.trainingHistoryEntry.update({
    where: { history_id: historyId },
    data: {
      status: 'attended',
      attended_on: attendedOn,
      participants_count: participants,
      notes: input.notes?.trim() || null,
    },
    select: entrySelect,
  });
  return toEntry(updated);
}

export async function unmarkAttended(userId: string, historyId: string) {
  await assertOwned(userId, historyId);

  const updated = await prisma.trainingHistoryEntry.update({
    where: { history_id: historyId },
    data: { status: 'viewed', attended_on: null, participants_count: 1, notes: null },
    select: entrySelect,
  });
  return toEntry(updated);
}

export async function removeEntry(userId: string, historyId: string) {
  await assertOwned(userId, historyId);
  await prisma.trainingHistoryEntry.delete({ where: { history_id: historyId } });
}
