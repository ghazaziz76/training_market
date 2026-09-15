import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { CreateAttendanceInput } from '../../shared/validators/training-history.validators.js';

const attendanceSelect = {
  attendance_id: true,
  program_id: true,
  attended_on: true,
  participants_count: true,
  notes: true,
  created_at: true,
  program: {
    select: {
      title: true,
      slug: true,
      duration_hours: true,
      duration_days: true,
      delivery_mode: true,
      is_certification: true,
      certification_name: true,
      category: { select: { name: true } },
      provider: { select: { provider_id: true, provider_name: true } },
    },
  },
} as const;

function toEntry(a: any) {
  return {
    attendance_id: a.attendance_id,
    program_id: a.program_id,
    attended_on: a.attended_on,
    participants_count: a.participants_count,
    notes: a.notes,
    created_at: a.created_at,
    program_title: a.program.title,
    program_slug: a.program.slug,
    duration_hours: a.program.duration_hours,
    duration_days: a.program.duration_days,
    delivery_mode: a.program.delivery_mode,
    is_certification: a.program.is_certification,
    certification_name: a.program.certification_name,
    category_name: a.program.category?.name ?? null,
    provider_id: a.program.provider.provider_id,
    provider_name: a.program.provider.provider_name,
  };
}

export async function listAttendances(userId: string) {
  const rows = await prisma.trainingAttendance.findMany({
    where: { user_id: userId },
    orderBy: [{ attended_on: 'desc' }, { created_at: 'desc' }],
    select: attendanceSelect,
  });

  const entries = rows.map(toEntry);

  const summary = entries.reduce(
    (acc, e) => {
      acc.total_trainings += 1;
      acc.total_participants += e.participants_count;
      acc.total_hours += (e.duration_hours ?? 0) * e.participants_count;
      acc.total_days += (e.duration_days ?? 0) * e.participants_count;
      if (e.is_certification) acc.certifications += 1;
      return acc;
    },
    { total_trainings: 0, total_participants: 0, total_hours: 0, total_days: 0, certifications: 0 },
  );

  return { entries, summary };
}

export async function createAttendance(userId: string, role: string, input: CreateAttendanceInput) {
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: input.program_id },
    select: { program_id: true, status: true },
  });
  if (!program || program.status !== 'published') {
    throw AppError.notFound('Program not found');
  }

  const attendedOn = new Date(input.attended_on);
  if (attendedOn.getTime() > Date.now()) {
    throw AppError.badRequest('Attendance date cannot be in the future');
  }

  const participants = role === 'employer' ? (input.participants_count ?? 1) : 1;

  const created = await prisma.trainingAttendance.create({
    data: {
      user_id: userId,
      program_id: input.program_id,
      attended_on: attendedOn,
      participants_count: participants,
      notes: input.notes?.trim() || null,
    },
    select: attendanceSelect,
  });

  return toEntry(created);
}

export async function deleteAttendance(userId: string, attendanceId: string) {
  const existing = await prisma.trainingAttendance.findUnique({
    where: { attendance_id: attendanceId },
    select: { user_id: true },
  });
  if (!existing) throw AppError.notFound('Attendance record not found');
  if (existing.user_id !== userId) throw AppError.forbidden('Not your record');

  await prisma.trainingAttendance.delete({ where: { attendance_id: attendanceId } });
}
