import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  adminListUsersSchema,
  updateUserStatusSchema,
  verifyProviderSchema,
} from '../../shared/validators/admin.validators.js';
import { prisma } from '../../config/database.js';
import * as adminService from './admin.service.js';
import * as dashboardService from './dashboard.service.js';
import * as programService from '../programs/program.service.js';

const reviewProgramSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require auth + admin role
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  // ============================================================
  // DASHBOARD & PLATFORM
  // ============================================================

  // GET /api/admin/dashboard/stats
  app.get('/dashboard/stats', async (_request, reply) => {
    const stats = await dashboardService.getDashboardStats();
    return reply.send({ success: true, data: stats });
  });

  // GET /api/admin/dashboard/activity
  app.get('/dashboard/activity', async (request, reply) => {
    const limit = Number((request.query as any).limit) || 10;
    const activity = await dashboardService.getRecentActivity(limit);
    return reply.send({ success: true, data: activity });
  });

  // GET /api/admin/health
  app.get('/health', async (_request, reply) => {
    const health = await dashboardService.getHealthStatus();
    return reply.send({ success: true, data: health });
  });

  // GET /api/admin/audit-logs
  app.get('/audit-logs', async (request, reply) => {
    const q = request.query as any;
    const result = await dashboardService.getAuditLogs(
      {
        admin_user_id: q.admin_user_id,
        action: q.action,
        target_type: q.target_type,
        date_from: q.date_from,
        date_to: q.date_to,
      },
      Number(q.page) || 1,
      Number(q.limit) || 20,
    );
    return reply.send({ success: true, ...result });
  });

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  // GET /api/admin/users
  app.get('/users', {
    preHandler: [validateQuery(adminListUsersSchema)],
    handler: async (request, reply) => {
      const result = await adminService.listUsers(request.query as any);
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/admin/users/:user_id
  app.get('/users/:user_id', async (request, reply) => {
    const { user_id } = request.params as { user_id: string };
    const user = await adminService.getUserDetail(user_id);
    return reply.send({ success: true, data: user });
  });

  // PUT /api/admin/users/:user_id/status
  app.put('/users/:user_id/status', {
    preHandler: [validate(updateUserStatusSchema)],
    handler: async (request, reply) => {
      const { user_id } = request.params as { user_id: string };
      const result = await adminService.updateUserStatus(
        request.user!.user_id,
        user_id,
        request.body as any,
      );
      return reply.send({ success: true, data: result });
    },
  });

  // ============================================================
  // PROVIDER MANAGEMENT
  // ============================================================

  // GET /api/admin/providers
  app.get('/providers', async (request, reply) => {
    const q = request.query as any;
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const where: any = {};
    if (q.status) where.verification_status = q.status;
    if (q.search) {
      where.provider_name = { contains: q.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      prisma.trainingProvider.findMany({
        where,
        include: { user: { select: { email: true, status: true, full_name: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trainingProvider.count({ where }),
    ]);
    return reply.send({
      success: true,
      data,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  });

  // GET /api/admin/providers/pending
  app.get('/providers/pending', async (request, reply) => {
    const { page, limit } = (request.query as any) || {};
    const result = await adminService.listPendingProviders(
      Number(page) || 1,
      Number(limit) || 20,
    );
    return reply.send({ success: true, ...result });
  });

  // PUT /api/admin/providers/:provider_id/verify
  app.put('/providers/:provider_id/verify', {
    preHandler: [validate(verifyProviderSchema)],
    handler: async (request, reply) => {
      const { provider_id } = request.params as { provider_id: string };
      const result = await adminService.verifyProvider(
        request.user!.user_id,
        provider_id,
        request.body as any,
      );
      return reply.send({ success: true, data: result });
    },
  });

  // ============================================================
  // PROGRAM MODERATION
  // ============================================================

  // GET /api/admin/programs
  app.get('/programs', async (request, reply) => {
    const q = request.query as any;
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.search) {
      where.title = { contains: q.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      prisma.trainingProgram.findMany({
        where,
        include: {
          provider: { select: { provider_name: true } },
          category: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trainingProgram.count({ where }),
    ]);
    return reply.send({
      success: true,
      data,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  });

  // GET /api/admin/programs/pending
  app.get('/programs/pending', async (request, reply) => {
    const { page, limit } = (request.query as any) || {};
    const result = await programService.listPendingPrograms(
      Number(page) || 1,
      Number(limit) || 20,
    );
    return reply.send({ success: true, ...result });
  });

  // PUT /api/admin/programs/:program_id/review
  app.put('/programs/:program_id/review', {
    preHandler: [validate(reviewProgramSchema)],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const { action, rejection_reason } = request.body as {
        action: 'approve' | 'reject';
        rejection_reason?: string;
      };
      const result = await programService.reviewProgram(
        request.user!.user_id,
        program_id,
        action,
        rejection_reason,
      );
      return reply.send({ success: true, data: result });
    },
  });
}
