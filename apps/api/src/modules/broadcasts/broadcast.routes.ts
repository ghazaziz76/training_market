import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createBroadcastSchema,
  listBroadcastFeedSchema,
  submitProposalSchema,
  reviewProposalSchema,
} from '../../shared/validators/broadcast.validators.js';
import * as broadcastService from './broadcast.service.js';
import { generateProposalPdf } from './proposal-pdf.service.js';

export async function broadcastRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // ============================================================
  // EMPLOYER — Broadcast Requests
  // ============================================================

  // POST /api/broadcast-requests — create broadcast
  app.post('/', {
    preHandler: [requireRole('employer'), validate(createBroadcastSchema)],
    handler: async (request, reply) => {
      const broadcast = await broadcastService.createBroadcast(
        request.user!.user_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: broadcast });
    },
  });

  // GET /api/broadcast-requests/my-requests — employer's broadcasts
  app.get('/my-requests', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const q = request.query as any;
      const result = await broadcastService.listMyBroadcasts(
        request.user!.user_id,
        Number(q.page) || 1,
        Number(q.limit) || 20,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/broadcast-requests/:request_id — employer detail with proposals
  app.get('/:request_id', async (request, reply) => {
    const { request_id } = request.params as { request_id: string };
    const role = request.user!.role;

    if (role === 'employer') {
      const data = await broadcastService.getBroadcastDetail(request.user!.user_id, request_id);
      return reply.send({ success: true, data });
    } else if (role === 'provider') {
      const data = await broadcastService.getRequestDetailForProvider(request.user!.user_id, request_id);
      return reply.send({ success: true, data });
    }
  });

  // PUT /api/broadcast-requests/:request_id/close — close broadcast
  app.put('/:request_id/close', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const { request_id } = request.params as { request_id: string };
      const { reason } = (request.body as any) || {};
      const result = await broadcastService.closeBroadcast(request.user!.user_id, request_id, reason);
      return reply.send({ success: true, data: result });
    },
  });

  // ============================================================
  // PROVIDER — Feed & Proposals
  // ============================================================

  // GET /api/broadcast-requests/feed — provider request feed
  app.get('/feed', {
    preHandler: [requireRole('provider'), validateQuery(listBroadcastFeedSchema)],
    handler: async (request, reply) => {
      const result = await broadcastService.getBroadcastFeed(
        request.user!.user_id,
        request.query as any,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // POST /api/broadcast-requests/:request_id/proposals — submit proposal
  app.post('/:request_id/proposals', {
    preHandler: [requireRole('provider'), validate(submitProposalSchema)],
    handler: async (request, reply) => {
      const { request_id } = request.params as { request_id: string };
      const proposal = await broadcastService.submitProposal(
        request.user!.user_id,
        request_id,
        request.body as any,
      );
      return reply.status(201).send({ success: true, data: proposal });
    },
  });
}

// Separate plugin for proposal-specific routes
export async function proposalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/proposals/my-proposals — provider's proposals
  app.get('/my-proposals', {
    preHandler: [requireRole('provider')],
    handler: async (request, reply) => {
      const q = request.query as any;
      const result = await broadcastService.listMyProposals(
        request.user!.user_id,
        q.status,
        Number(q.page) || 1,
        Number(q.limit) || 20,
      );
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/proposals/:proposal_id — proposal detail
  app.get('/:proposal_id', async (request, reply) => {
    const { proposal_id } = request.params as { proposal_id: string };
    const data = await broadcastService.getProposalDetail(request.user!.user_id, proposal_id);
    return reply.send({ success: true, data });
  });

  // GET /api/proposals/:proposal_id/pdf — download proposal as PDF
  app.get('/:proposal_id/pdf', async (request, reply) => {
    const { proposal_id } = request.params as { proposal_id: string };
    const data = await broadcastService.getProposalDetailForPdf(request.user!.user_id, proposal_id);

    const protocol = request.protocol || 'http';
    const host = request.headers.host || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;

    const pdfDoc = generateProposalPdf(data as any, baseUrl);

    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
    });

    const pdfBuffer = Buffer.concat(chunks);
    const safeName = data.provider.provider_name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
    const fileName = `Proposal_${safeName}_${proposal_id.slice(0, 8)}.pdf`;

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(pdfBuffer);
  });

  // PUT /api/proposals/:proposal_id/shortlist — employer shortlists
  app.put('/:proposal_id/shortlist', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const result = await broadcastService.shortlistProposal(request.user!.user_id, proposal_id);
      return reply.send({ success: true, data: result });
    },
  });

  // PUT /api/proposals/:proposal_id/select — employer selects winner
  app.put('/:proposal_id/select', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const result = await broadcastService.selectProposal(request.user!.user_id, proposal_id);
      return reply.send({ success: true, data: result });
    },
  });

  // PUT /api/proposals/:proposal_id/reject — employer rejects
  app.put('/:proposal_id/reject', {
    preHandler: [requireRole('employer'), validate(reviewProposalSchema)],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const { reason } = (request.body as any) || {};
      const result = await broadcastService.rejectProposal(request.user!.user_id, proposal_id, reason);
      return reply.send({ success: true, data: result });
    },
  });

  // PUT /api/proposals/:proposal_id/cancel — employer cancels a selected proposal
  app.put('/:proposal_id/cancel', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const result = await broadcastService.cancelSelectedProposal(request.user!.user_id, proposal_id);
      return reply.send({ success: true, data: result });
    },
  });

  // PUT /api/proposals/:proposal_id/dismiss — employer dismisses/archives
  app.put('/:proposal_id/dismiss', {
    preHandler: [requireRole('employer')],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const result = await broadcastService.dismissProposal(request.user!.user_id, proposal_id);
      return reply.send({ success: true, data: result });
    },
  });

  // PUT /api/proposals/:proposal_id/withdraw — provider withdraws
  app.put('/:proposal_id/withdraw', {
    preHandler: [requireRole('provider')],
    handler: async (request, reply) => {
      const { proposal_id } = request.params as { proposal_id: string };
      const result = await broadcastService.withdrawProposal(request.user!.user_id, proposal_id);
      return reply.send({ success: true, data: result });
    },
  });
}
