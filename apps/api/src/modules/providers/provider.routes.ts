import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as qualityTierService from './quality-tier.service.js';

export async function providerFeatureRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('provider'));

  // GET /api/provider/quality-tier — tier progress
  app.get('/quality-tier', async (request, reply) => {
    const data = await qualityTierService.getTierProgress(request.user!.user_id);
    return reply.send({ success: true, data });
  });
}

// Admin tier management
export async function adminTierRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  // POST /api/admin/tiers/recalculate — recalculate all tiers
  app.post('/tiers/recalculate', async (_request, reply) => {
    const result = await qualityTierService.recalculateAllTiers();
    return reply.send({ success: true, data: result });
  });
}
