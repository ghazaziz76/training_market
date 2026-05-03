import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

async function getEmployerId(userId: string) {
  const p = await prisma.employerProfile.findUnique({ where: { user_id: userId }, select: { employer_id: true } });
  if (!p) throw AppError.notFound('Employer not found');
  return p.employer_id;
}

export async function listPoolOpportunities(userId: string) {
  const employerId = await getEmployerId(userId);

  const pools = await prisma.groupTrainingPool.findMany({
    where: { status: { in: ['forming', 'confirmed'] } },
    include: {
      participants: { select: { employer_id: true, participant_count: true } },
      tp_offers: {
        where: { status: 'submitted' },
        select: { provider: { select: { provider_name: true } }, group_fee_per_pax: true },
        take: 3,
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return pools.map((pool) => ({
    pool_id: pool.pool_id,
    skill_topic: pool.skill_topic,
    delivery_mode: pool.delivery_mode,
    location: pool.location,
    target_date_range: pool.target_date_range,
    current_participants: pool.total_participants,
    min_participants: pool.min_participants,
    employers_interested: pool.participants.length,
    need_more: Math.max(0, pool.min_participants - pool.total_participants),
    status: pool.status,
    my_participation: pool.participants.find((p) => p.employer_id === employerId) || null,
    offers_count: pool.tp_offers.length,
  }));
}

export async function joinPool(userId: string, poolId: string, participantCount: number) {
  const employerId = await getEmployerId(userId);

  const pool = await prisma.groupTrainingPool.findUnique({ where: { pool_id: poolId } });
  if (!pool) throw AppError.notFound('Pool not found');
  if (pool.status !== 'forming') throw AppError.badRequest('Pool is not accepting participants');

  // Check if already joined
  const existing = await prisma.poolParticipant.findUnique({
    where: { pool_id_employer_id: { pool_id: poolId, employer_id: employerId } },
  });
  if (existing) throw AppError.conflict('Already joined this pool');

  await prisma.poolParticipant.create({
    data: { pool_id: poolId, employer_id: employerId, participant_count: participantCount },
  });

  const newTotal = pool.total_participants + participantCount;
  const newStatus = newTotal >= pool.min_participants ? 'confirmed' : 'forming';

  await prisma.groupTrainingPool.update({
    where: { pool_id: poolId },
    data: { total_participants: newTotal, status: newStatus },
  });

  return { pool_id: poolId, total_participants: newTotal, status: newStatus };
}

export async function leavePool(userId: string, poolId: string) {
  const employerId = await getEmployerId(userId);

  const participant = await prisma.poolParticipant.findUnique({
    where: { pool_id_employer_id: { pool_id: poolId, employer_id: employerId } },
  });
  if (!participant) throw AppError.notFound('Not in this pool');

  await prisma.poolParticipant.delete({
    where: { pool_id_employer_id: { pool_id: poolId, employer_id: employerId } },
  });

  const pool = await prisma.groupTrainingPool.findUnique({ where: { pool_id: poolId } });
  if (pool) {
    const newTotal = pool.total_participants - participant.participant_count;
    const newStatus = newTotal < pool.min_participants ? 'forming' : pool.status;
    await prisma.groupTrainingPool.update({
      where: { pool_id: poolId },
      data: { total_participants: Math.max(0, newTotal), status: newStatus },
    });
  }

  return { pool_id: poolId };
}
