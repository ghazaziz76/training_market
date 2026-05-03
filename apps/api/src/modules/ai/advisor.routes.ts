import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as advisorService from './advisor.service.js';

const sendMessageSchema = z.object({ message: z.string().min(1).max(2000) });

export async function advisorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('employer', 'individual'));

  // POST /api/advisor/conversations — start new conversation
  app.post('/conversations', async (request, reply) => {
    const data = await advisorService.createConversation(request.user!.user_id);
    return reply.status(201).send({ success: true, data });
  });

  // GET /api/advisor/conversations — list conversations
  app.get('/conversations', async (request, reply) => {
    const data = await advisorService.listConversations(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  // GET /api/advisor/conversations/:id — get conversation
  app.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await advisorService.getConversation(request.user!.user_id, id);
    return reply.send({ success: true, data });
  });

  // POST /api/advisor/conversations/:id/messages — send message
  app.post('/conversations/:id/messages', {
    preHandler: [validate(sendMessageSchema)],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { message } = request.body as { message: string };
      const data = await advisorService.sendMessage(request.user!.user_id, id, message);
      return reply.send({ success: true, data });
    },
  });

  // DELETE /api/advisor/conversations/:id — archive conversation
  app.delete('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await advisorService.deleteConversation(request.user!.user_id, id);
    return reply.send({ success: true, message: 'Conversation archived' });
  });
}
