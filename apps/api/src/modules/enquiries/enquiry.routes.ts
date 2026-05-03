import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createEnquirySchema,
  replyEnquirySchema,
  listEnquiriesSchema,
} from '../../shared/validators/enquiry.validators.js';
import * as enquiryService from './enquiry.service.js';

export async function enquiryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // POST /api/enquiries — create enquiry (employer or individual)
  app.post('/', {
    preHandler: [requireRole('employer', 'individual'), validate(createEnquirySchema)],
    handler: async (request, reply) => {
      const enquiry = await enquiryService.createEnquiry(
        request.user!.user_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: enquiry });
    },
  });

  // GET /api/enquiries/sent — requester's sent enquiries
  app.get('/sent', {
    preHandler: [requireRole('employer', 'individual'), validateQuery(listEnquiriesSchema)],
    handler: async (request, reply) => {
      const result = await enquiryService.listSentEnquiries(
        request.user!.user_id,
        request.query as any,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/enquiries/received — provider's received enquiries
  app.get('/received', {
    preHandler: [requireRole('provider'), validateQuery(listEnquiriesSchema)],
    handler: async (request, reply) => {
      const result = await enquiryService.listReceivedEnquiries(
        request.user!.user_id,
        request.query as any,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/enquiries/stats — provider enquiry stats
  app.get('/stats', {
    preHandler: [requireRole('provider')],
    handler: async (request, reply) => {
      const stats = await enquiryService.getEnquiryStats(request.user!.user_id);
      return reply.send({ success: true, data: stats });
    },
  });

  // GET /api/enquiries/clients — provider client tracker
  app.get('/clients', {
    preHandler: [requireRole('provider')],
    handler: async (request, reply) => {
      const clients = await enquiryService.getClientTracker(request.user!.user_id);
      return reply.send({ success: true, data: clients });
    },
  });

  // GET /api/enquiries/:enquiry_id — enquiry detail with thread
  app.get('/:enquiry_id', async (request, reply) => {
    const { enquiry_id } = request.params as { enquiry_id: string };
    const enquiry = await enquiryService.getEnquiryDetail(request.user!.user_id, enquiry_id);
    return reply.send({ success: true, data: enquiry });
  });

  // POST /api/enquiries/:enquiry_id/replies — reply to enquiry
  app.post('/:enquiry_id/replies', {
    preHandler: [validate(replyEnquirySchema)],
    handler: async (request, reply) => {
      const { enquiry_id } = request.params as { enquiry_id: string };
      const replyData = await enquiryService.replyToEnquiry(
        request.user!.user_id,
        enquiry_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: replyData });
    },
  });

  // POST /api/enquiries/:enquiry_id/proposal — TP submits proposal via enquiry
  app.post('/:enquiry_id/proposal', {
    preHandler: [requireRole('provider')],
    handler: async (request, reply) => {
      const { enquiry_id } = request.params as { enquiry_id: string };
      const result = await enquiryService.submitProposalViaEnquiry(
        request.user!.user_id,
        enquiry_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: result });
    },
  });

  // PUT /api/enquiries/:enquiry_id/close — close enquiry (requester only)
  app.put('/:enquiry_id/close', {
    preHandler: [requireRole('employer', 'individual')],
    handler: async (request, reply) => {
      const { enquiry_id } = request.params as { enquiry_id: string };
      const result = await enquiryService.closeEnquiry(request.user!.user_id, enquiry_id);
      return reply.send({ success: true, data: result });
    },
  });
}
