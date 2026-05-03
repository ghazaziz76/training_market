import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import * as matchingService from './matching.service.js';
import * as embeddingService from './embedding.service.js';

const matchSchema = z.object({
  query: z.string().min(3).max(1000),
  filters: z
    .object({
      delivery_mode: z.string().optional(),
      state: z.string().optional(),
      max_fee: z.number().optional(),
      hrd_corp_claimable: z.boolean().optional(),
      category_id: z.string().uuid().optional(),
      program_type: z.string().optional(),
      skill_type: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(20).default(10),
});

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/ai/match — semantic matching (auth required)
  app.post('/match', {
    preHandler: [authenticate, validate(matchSchema)],
    handler: async (request, reply) => {
      const { query, filters, limit } = request.body as z.infer<typeof matchSchema>;
      const results = await matchingService.matchPrograms(
        query,
        filters || {},
        limit,
        request.user!.user_id,
      );
      return reply.send({ success: true, data: results });
    },
  });

  // GET /api/ai/recommendations — personalized recommendations (auth required)
  app.get('/recommendations', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const limit = Number((request.query as any).limit) || 12;
      const results = await matchingService.getAIRecommendations(
        request.user!.user_id,
        limit,
      );
      return reply.send({ success: true, data: results });
    },
  });

  // GET /api/ai/similar/:program_id — similar programs (public)
  app.get('/similar/:program_id', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };
    const q = request.query as any;
    const sameProvider = q.same_provider === 'true';
    const limit = Number(q.limit) || 6;

    const results = await matchingService.getSimilarPrograms(program_id, sameProvider, limit);
    return reply.send({ success: true, data: results });
  });

  // POST /api/ai/match-providers/:request_id — match providers to broadcast (internal/admin)
  app.post('/match-providers/:request_id', {
    preHandler: [authenticate, requireRole('admin')],
    handler: async (request, reply) => {
      const { request_id } = request.params as { request_id: string };
      const results = await matchingService.matchProvidersToRequest(request_id);
      return reply.send({ success: true, data: results });
    },
  });

  // ---- Admin: Embedding Management ----

  // POST /api/ai/embeddings/generate-missing — generate embeddings for programs without one
  app.post('/embeddings/generate-missing', {
    preHandler: [authenticate, requireRole('admin')],
    handler: async (_request, reply) => {
      const result = await embeddingService.generateMissingEmbeddings();
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/ai/embeddings/:program_id — regenerate embedding for a specific program
  app.post('/embeddings/:program_id', {
    preHandler: [authenticate, requireRole('admin')],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      await embeddingService.generateProgramEmbedding(program_id);
      return reply.send({ success: true, message: 'Embedding generated' });
    },
  });
}
