import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as analyticsService from './analytics.service.js';

export async function providerAnalyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('provider'));

  app.get('/overview', async (request, reply) => {
    const period = ((request.query as any).period || '30d') as any;
    const data = await analyticsService.providerOverview(request.user!.user_id, period);
    return reply.send({ success: true, data });
  });

  app.get('/programs', async (request, reply) => {
    const period = ((request.query as any).period || '30d') as any;
    const data = await analyticsService.providerProgramStats(request.user!.user_id, period);
    return reply.send({ success: true, data });
  });

  app.get('/enquiries', async (request, reply) => {
    const data = await analyticsService.providerEnquiryStats(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  app.get('/proposals', async (request, reply) => {
    const data = await analyticsService.providerProposalStats(request.user!.user_id);
    return reply.send({ success: true, data });
  });
}

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  app.get('/overview', async (request, reply) => {
    const period = ((request.query as any).period || '30d') as any;
    const data = await analyticsService.adminOverview(period);
    return reply.send({ success: true, data });
  });

  app.get('/search-trends', async (_request, reply) => {
    const data = await analyticsService.adminSearchTrends();
    return reply.send({ success: true, data });
  });
}
