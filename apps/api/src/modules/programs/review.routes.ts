import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
});

export async function reviewRoutes(app: FastifyInstance) {
  // GET /api/programs/:program_id/reviews — public
  app.get('/:program_id/reviews', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };
    const reviews = await prisma.programReview.findMany({
      where: { program_id, status: 'published' },
      include: { user: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const stats = await prisma.programReview.aggregate({
      where: { program_id, status: 'published' },
      _avg: { rating: true },
      _count: true,
    });

    // Rating distribution
    const dist = await prisma.programReview.groupBy({
      by: ['rating'],
      where: { program_id, status: 'published' },
      _count: true,
    });
    const distribution: Record<number, number> = {};
    for (const d of dist) distribution[d.rating] = d._count;

    return reply.send({
      success: true,
      data: {
        reviews,
        stats: {
          average_rating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
          total_reviews: stats._count,
          distribution,
        },
      },
    });
  });

  // POST /api/programs/:program_id/reviews — auth required
  app.post('/:program_id/reviews', {
    preHandler: [authenticate, validate(createReviewSchema)],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const userId = request.user!.user_id;
      const { rating, title, comment } = request.body as z.infer<typeof createReviewSchema>;

      const program = await prisma.trainingProgram.findUnique({
        where: { program_id },
        select: { provider_id: true },
      });
      if (!program) throw AppError.notFound('Program not found');

      // Check duplicate
      const existing = await prisma.programReview.findUnique({
        where: { program_id_user_id: { program_id, user_id: userId } },
      });
      if (existing) throw AppError.conflict('You have already reviewed this program');

      const review = await prisma.programReview.create({
        data: {
          program_id,
          provider_id: program.provider_id,
          user_id: userId,
          rating,
          title,
          comment,
        },
      });

      // Update program and provider average rating
      const avgResult = await prisma.programReview.aggregate({
        where: { program_id, status: 'published' },
        _avg: { rating: true },
      });

      const providerAvg = await prisma.programReview.aggregate({
        where: { provider_id: program.provider_id, status: 'published' },
        _avg: { rating: true },
      });

      await prisma.trainingProvider.update({
        where: { provider_id: program.provider_id },
        data: { average_rating: providerAvg._avg.rating || 0 },
      });

      return reply.status(201).send({ success: true, data: review });
    },
  });
}
