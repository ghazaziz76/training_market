import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createChecklistSchema,
  updateChecklistItemsSchema,
} from '../../shared/validators/hrdcorp.validators.js';
import * as hrdCorpService from './hrdcorp.service.js';

export async function hrdCorpRoutes(app: FastifyInstance) {
  // GET /api/hrd-corp/schemes — public list of schemes
  app.get('/schemes', async (_request, reply) => {
    const data = await hrdCorpService.listSchemes();
    return reply.send({ success: true, data });
  });

  // GET /api/hrd-corp/guidance/:program_id — guidance for a program (employer)
  app.get('/guidance/:program_id', {
    preHandler: [authenticate, requireRole('employer')],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const data = await hrdCorpService.getGuidanceForProgram(request.user!.user_id, program_id);
      return reply.send({ success: true, data });
    },
  });

  // POST /api/hrd-corp/checklists — create checklist (employer)
  app.post('/checklists', {
    preHandler: [authenticate, requireRole('employer'), validate(createChecklistSchema)],
    handler: async (request, reply) => {
      const checklist = await hrdCorpService.createChecklist(
        request.user!.user_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: checklist });
    },
  });

  // GET /api/hrd-corp/checklists — list employer's checklists
  app.get('/checklists', {
    preHandler: [authenticate, requireRole('employer')],
    handler: async (request, reply) => {
      const data = await hrdCorpService.listChecklists(request.user!.user_id);
      return reply.send({ success: true, data });
    },
  });

  // GET /api/hrd-corp/checklists/:checklist_id — checklist detail
  app.get('/checklists/:checklist_id', {
    preHandler: [authenticate, requireRole('employer')],
    handler: async (request, reply) => {
      const { checklist_id } = request.params as { checklist_id: string };
      const data = await hrdCorpService.getChecklistDetail(request.user!.user_id, checklist_id);
      return reply.send({ success: true, data });
    },
  });

  // PUT /api/hrd-corp/checklists/:checklist_id/items — update checklist items
  app.put('/checklists/:checklist_id/items', {
    preHandler: [authenticate, requireRole('employer'), validate(updateChecklistItemsSchema)],
    handler: async (request, reply) => {
      const { checklist_id } = request.params as { checklist_id: string };
      const data = await hrdCorpService.updateChecklistItems(
        request.user!.user_id,
        checklist_id,
        request.body as any,
      );
      return reply.send({ success: true, data });
    },
  });
}
