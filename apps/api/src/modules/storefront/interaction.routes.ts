import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as interactionService from './interaction.service.js';

const compareSchema = z.object({
  program_ids: z.array(z.string().uuid()).min(2).max(4),
});

export async function interactionRoutes(app: FastifyInstance) {
  // POST /api/programs/:program_id/view — track view (public, optional auth)
  app.post('/programs/:program_id/view', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };

    let userId: string | undefined;
    try {
      const auth = request.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const { verifyAccessToken } = await import('../../shared/helpers/tokens.js');
        const payload = verifyAccessToken(auth.slice(7));
        userId = payload.user_id;
      }
    } catch {
      // Not authenticated
    }

    await interactionService.trackProgramView(program_id, userId);
    return reply.send({ success: true });
  });

  // POST /api/programs/:program_id/save — save program
  app.post('/programs/:program_id/save', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      await interactionService.saveProgram(request.user!.user_id, program_id);
      return reply.send({ success: true, message: 'Program saved' });
    },
  });

  // DELETE /api/programs/:program_id/save — unsave program
  app.delete('/programs/:program_id/save', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      await interactionService.unsaveProgram(request.user!.user_id, program_id);
      return reply.send({ success: true, message: 'Program unsaved' });
    },
  });

  // GET /api/users/saved-programs — list saved programs
  app.get('/users/saved-programs', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const q = request.query as any;
      const result = await interactionService.getSavedPrograms(
        request.user!.user_id,
        Number(q.page) || 1,
        Number(q.limit) || 20,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // POST /api/programs/compare — compare programs
  app.post('/programs/compare', {
    preHandler: [validate(compareSchema)],
    handler: async (request, reply) => {
      const { program_ids } = request.body as { program_ids: string[] };
      const data = await interactionService.comparePrograms(program_ids);
      return reply.send({ success: true, data });
    },
  });

  // GET /api/storefront/recently-viewed — auth required
  app.get('/storefront/recently-viewed', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const limit = Number((request.query as any).limit) || 10;
      const data = await interactionService.getRecentlyViewed(request.user!.user_id, limit);
      return reply.send({ success: true, data });
    },
  });

  // GET /api/storefront/recommended — auth required
  app.get('/storefront/recommended', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const limit = Number((request.query as any).limit) || 12;
      const data = await interactionService.getRecommendations(request.user!.user_id, limit);
      return reply.send({ success: true, data });
    },
  });
}
