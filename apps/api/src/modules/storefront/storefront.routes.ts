import type { FastifyInstance } from 'fastify';
import * as storefrontService from './storefront.service.js';

export async function storefrontRoutes(app: FastifyInstance) {
  // GET /api/storefront/hero-banners
  app.get('/hero-banners', async (_request, reply) => {
    const data = await storefrontService.getHeroBanners();
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/featured
  app.get('/featured', async (request, reply) => {
    const limit = Number((request.query as any).limit) || 12;
    const data = await storefrontService.getFeaturedPrograms(limit);
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/provider-spotlights
  app.get('/provider-spotlights', async (request, reply) => {
    const limit = Number((request.query as any).limit) || 6;
    const data = await storefrontService.getProviderSpotlights(limit);
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/trending
  app.get('/trending', async (request, reply) => {
    const limit = Number((request.query as any).limit) || 12;
    const data = await storefrontService.getTrendingPrograms(limit);
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/new
  app.get('/new', async (request, reply) => {
    const limit = Number((request.query as any).limit) || 12;
    const data = await storefrontService.getNewPrograms(limit);
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/upcoming-sessions
  app.get('/upcoming-sessions', async (request, reply) => {
    const q = request.query as any;
    const limit = Number(q.limit) || 12;
    const daysAhead = Number(q.days_ahead) || 30;
    const data = await storefrontService.getUpcomingSessions(limit, daysAhead);
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/categories
  app.get('/categories', async (_request, reply) => {
    const data = await storefrontService.getCategoriesBrowse();
    return reply.send({ success: true, data });
  });

  // GET /api/storefront/providers/:provider_id — public provider detail
  app.get('/providers/:provider_id', async (request, reply) => {
    const { provider_id } = request.params as { provider_id: string };
    const { prisma } = await import('../../config/database.js');
    const provider = await prisma.trainingProvider.findUnique({
      where: { provider_id },
      select: {
        provider_id: true, provider_name: true, logo_url: true, business_description: true,
        quality_tier: true, average_rating: true, total_completed_programs: true, awards_won: true,
        website: true, city: true, state: true, year_established: true, specializations: true,
        hrd_corp_registered_provider: true, accreditation_details: true,
        _count: { select: { programs: { where: { status: 'published' } } } },
      },
    });
    if (!provider) return reply.status(404).send({ success: false, message: 'Provider not found' });
    return reply.send({ success: true, data: provider });
  });

  // GET /api/storefront/industries
  app.get('/industries', async (_request, reply) => {
    const data = await storefrontService.getIndustryBrowse();
    return reply.send({ success: true, data });
  });
}
