import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as intelligenceService from './intelligence.service.js';

export async function intelligenceRoutes(app: FastifyInstance) {
  // GET /api/intelligence/trending-skills — public
  app.get('/trending-skills', async (_request, reply) => {
    const data = await intelligenceService.getTrendingSkills();
    return reply.send({ success: true, data });
  });

  // GET /api/intelligence/program/:id/social-proof — public
  app.get('/program/:program_id/social-proof', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };
    const data = await intelligenceService.getProgramSocialProof(program_id);
    return reply.send({ success: true, data });
  });

  // GET /api/intelligence/employer — employer intelligence dashboard
  app.get('/employer', {
    preHandler: [authenticate, requireRole('employer')],
    handler: async (request, reply) => {
      const data = await intelligenceService.employerIntelligence(request.user!.user_id);
      return reply.send({ success: true, data });
    },
  });

  // GET /api/intelligence/provider — provider intelligence dashboard
  app.get('/provider', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const data = await intelligenceService.providerIntelligence(request.user!.user_id);
      return reply.send({ success: true, data });
    },
  });
}
