import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { searchProgramsSchema, autoSuggestSchema } from '../../shared/validators/search.validators.js';
import * as searchService from './search.service.js';

export async function searchRoutes(app: FastifyInstance) {
  // GET /api/search/programs — public, enhanced for auth users
  app.get('/programs', {
    preHandler: [validateQuery(searchProgramsSchema)],
    handler: async (request, reply) => {
      // Try to get user if authenticated (optional)
      let userId: string | undefined;
      try {
        const auth = request.headers.authorization;
        if (auth?.startsWith('Bearer ')) {
          const { verifyAccessToken } = await import('../../shared/helpers/tokens.js');
          const payload = verifyAccessToken(auth.slice(7));
          userId = payload.user_id;
        }
      } catch {
        // Not authenticated, that's fine
      }

      const result = await searchService.searchPrograms(request.query as any, userId);
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/search/suggest — public
  app.get('/suggest', {
    preHandler: [validateQuery(autoSuggestSchema)],
    handler: async (request, reply) => {
      const result = await searchService.autoSuggest(request.query as any);
      return reply.send({ success: true, data: result });
    },
  });

  // GET /api/search/history — auth required
  app.get('/history', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const history = await searchService.getSearchHistory(request.user!.user_id);
      return reply.send({ success: true, data: history });
    },
  });

  // DELETE /api/search/history/:history_id
  app.delete('/history/:history_id', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const { history_id } = request.params as { history_id: string };
      await searchService.deleteSearchHistoryItem(request.user!.user_id, history_id);
      return reply.send({ success: true, message: 'Search history item deleted' });
    },
  });

  // DELETE /api/search/history — clear all
  app.delete('/history', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      await searchService.clearSearchHistory(request.user!.user_id);
      return reply.send({ success: true, message: 'Search history cleared' });
    },
  });
}
