import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { markAttendedSchema } from '../../shared/validators/training-history.validators.js';
import * as historyService from './training-history.service.js';

export async function trainingHistoryRoutes(app: FastifyInstance) {
  const guard = [authenticate, requireRole('employer', 'individual')];

  // GET /api/me/training-history — list viewed + attended programs
  app.get('/', {
    preHandler: guard,
    handler: async (request, reply) => {
      const result = await historyService.listHistory(request.user!.user_id);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/me/training-history/programs/:program_id — record that the user opened a program
  app.post('/programs/:program_id', {
    preHandler: guard,
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const entry = await historyService.recordView(request.user!.user_id, program_id);
      return reply.send({ success: true, data: entry });
    },
  });

  // PUT /api/me/training-history/:history_id/attended — mark as attended
  app.put('/:history_id/attended', {
    preHandler: [...guard, validate(markAttendedSchema)],
    handler: async (request, reply) => {
      const { history_id } = request.params as { history_id: string };
      const entry = await historyService.markAttended(
        request.user!.user_id,
        request.user!.role,
        history_id,
        request.body as any,
      );
      return reply.send({ success: true, data: entry, message: 'Marked as attended' });
    },
  });

  // DELETE /api/me/training-history/:history_id/attended — revert to viewed
  app.delete('/:history_id/attended', {
    preHandler: guard,
    handler: async (request, reply) => {
      const { history_id } = request.params as { history_id: string };
      const entry = await historyService.unmarkAttended(request.user!.user_id, history_id);
      return reply.send({ success: true, data: entry, message: 'Attendance removed' });
    },
  });

  // DELETE /api/me/training-history/:history_id — remove from history
  app.delete('/:history_id', {
    preHandler: guard,
    handler: async (request, reply) => {
      const { history_id } = request.params as { history_id: string };
      await historyService.removeEntry(request.user!.user_id, history_id);
      return reply.send({ success: true, message: 'Removed from history' });
    },
  });
}
