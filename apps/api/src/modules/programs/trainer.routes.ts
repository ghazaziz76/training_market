import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

const createTrainerSchema = z.object({
  name: z.string().min(2).max(255),
  qualification: z.string().optional(),
  specialization: z.string().max(255).optional(),
  bio: z.string().optional(),
  photo_url: z.string().max(500).optional(),
  years_experience: z.number().int().min(0).optional(),
});

const assignTrainersSchema = z.object({
  trainer_ids: z.array(z.string().uuid()).min(1),
});

async function getProviderId(userId: string): Promise<string> {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');
  return provider.provider_id;
}

export async function trainerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('provider'));

  // GET /api/providers/trainers — list provider's trainers
  app.get('/', async (request, reply) => {
    const providerId = await getProviderId(request.user!.user_id);
    const trainers = await prisma.trainer.findMany({
      where: { provider_id: providerId, status: 'active' },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: trainers });
  });

  // POST /api/providers/trainers — create trainer
  app.post('/', {
    preHandler: [validate(createTrainerSchema)],
    handler: async (request, reply) => {
      const providerId = await getProviderId(request.user!.user_id);
      const trainer = await prisma.trainer.create({
        data: { provider_id: providerId, ...(request.body as any) },
      });
      return reply.status(201).send({ success: true, data: trainer });
    },
  });

  // PUT /api/providers/trainers/:trainer_id — update trainer
  app.put('/:trainer_id', {
    preHandler: [validate(createTrainerSchema.partial())],
    handler: async (request, reply) => {
      const providerId = await getProviderId(request.user!.user_id);
      const { trainer_id } = request.params as { trainer_id: string };

      const trainer = await prisma.trainer.findUnique({ where: { trainer_id } });
      if (!trainer || trainer.provider_id !== providerId) {
        throw AppError.notFound('Trainer not found');
      }

      const updated = await prisma.trainer.update({
        where: { trainer_id },
        data: request.body as any,
      });
      return reply.send({ success: true, data: updated });
    },
  });

  // DELETE /api/providers/trainers/:trainer_id — soft delete trainer
  app.delete('/:trainer_id', async (request, reply) => {
    const providerId = await getProviderId(request.user!.user_id);
    const { trainer_id } = request.params as { trainer_id: string };

    const trainer = await prisma.trainer.findUnique({ where: { trainer_id } });
    if (!trainer || trainer.provider_id !== providerId) {
      throw AppError.notFound('Trainer not found');
    }

    await prisma.trainer.update({
      where: { trainer_id },
      data: { status: 'archived' },
    });
    return reply.send({ success: true, message: 'Trainer archived' });
  });
}

// Assign trainers to a program
export async function programTrainerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('provider'));

  // POST /api/programs/:program_id/trainers — assign trainers
  app.post('/', {
    preHandler: [validate(assignTrainersSchema)],
    handler: async (request, reply) => {
      const providerId = await getProviderId(request.user!.user_id);
      const { program_id } = request.params as { program_id: string };
      const { trainer_ids } = request.body as { trainer_ids: string[] };

      const program = await prisma.trainingProgram.findUnique({
        where: { program_id },
        select: { provider_id: true },
      });
      if (!program || program.provider_id !== providerId) {
        throw AppError.notFound('Program not found');
      }

      // Replace all assignments
      await prisma.programTrainer.deleteMany({ where: { program_id } });
      await prisma.programTrainer.createMany({
        data: trainer_ids.map((trainer_id) => ({ program_id, trainer_id })),
        skipDuplicates: true,
      });

      return reply.send({ success: true, message: 'Trainers assigned' });
    },
  });

  // GET /api/programs/:program_id/trainers — list assigned trainers
  app.get('/', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };
    const assignments = await prisma.programTrainer.findMany({
      where: { program_id },
      include: { trainer: true },
    });
    return reply.send({
      success: true,
      data: assignments.map((a) => a.trainer),
    });
  });
}
