import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { createAttendanceSchema } from '../../shared/validators/training-history.validators.js';
import * as historyService from './training-history.service.js';

export async function trainingHistoryRoutes(app: FastifyInstance) {
  const guard = [authenticate, requireRole('employer', 'individual')];

  // GET /api/me/training-history — list the logged-in user's attended trainings
  app.get('/', {
    preHandler: guard,
    handler: async (request, reply) => {
      const result = await historyService.listAttendances(request.user!.user_id);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/me/training-history — record an attended training
  app.post('/', {
    preHandler: [...guard, validate(createAttendanceSchema)],
    handler: async (request, reply) => {
      const entry = await historyService.createAttendance(
        request.user!.user_id,
        request.user!.role,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: entry, message: 'Training recorded' });
    },
  });

  // DELETE /api/me/training-history/:attendance_id — remove a record
  app.delete('/:attendance_id', {
    preHandler: guard,
    handler: async (request, reply) => {
      const { attendance_id } = request.params as { attendance_id: string };
      await historyService.deleteAttendance(request.user!.user_id, attendance_id);
      return reply.send({ success: true, message: 'Record removed' });
    },
  });
}
