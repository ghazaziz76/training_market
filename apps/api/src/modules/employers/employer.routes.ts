import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as levyService from './levy-optimizer.service.js';
import * as effectivenessService from './effectiveness.service.js';
import * as planService from './training-plan.service.js';
import * as poolService from './group-pool.service.js';
import * as entitlementService from './entitlement.service.js';
import { calculateGrant, type CalculatorInput } from './grant-calculator.service.js';
import { prisma } from '../../config/database.js';

const updateLevySchema = z.object({
  total_levy: z.number().min(0),
  utilized_amount: z.number().min(0),
  year: z.number().int().optional(),
});

const createTrackingSchema = z.object({
  program_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  kpi_description: z.string().min(5),
  baseline_value: z.string().min(1),
  target_value: z.string().min(1),
});

const submitSurveySchema = z.object({
  survey_type: z.enum(['30_day', '60_day', '90_day']),
  impact_rating: z.number().int().min(1).max(5),
  actual_value: z.string(),
  feedback: z.string(),
  would_recommend: z.boolean(),
});

const createPlanSchema = z.object({
  year: z.number().int(),
  total_budget: z.number().min(0),
  departments: z.array(z.object({
    name: z.string(),
    headcount: z.number().int().min(1),
    skill_gaps: z.array(z.string()),
    budget_allocation: z.number().min(0),
  })),
});

const joinPoolSchema = z.object({
  participant_count: z.number().int().min(1),
});

const activateCodeSchema = z.object({
  code: z.string().regex(/^HRD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid activation code format'),
});

const registerCodeSchema = z.object({
  code: z.string().regex(/^HRD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  feature_key: z.string().default('hrd_grant_calculator'),
  google_play_order_id: z.string().optional(),
});

const activateQrSchema = z.object({
  session_token: z.string(),
  activation_code: z.string().regex(/^HRD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  google_play_order_id: z.string().optional(),
});

const grantCalculatorSchema = z.object({
  training_type: z.enum(['in_house', 'local_public', 'overseas_training', 'overseas_seminar', 'e_learning', 'remote_online']),
  trainer_type: z.enum(['internal', 'external', 'overseas']),
  training_venue: z.enum(['employer_premises', 'external_premises']),
  course_category: z.enum(['general', 'focus_area', 'industry_specific', 'professional_certification']),
  duration_type: z.enum(['full_day', 'half_day', 'custom_hours']),
  custom_hours: z.number().min(1).max(7).optional(),
  number_of_days: z.number().int().min(1),
  pax: z.number().int().min(1),
  travel_distance: z.enum(['under_100km', 'over_100km', 'not_applicable']),
  course_fee_charged: z.number().min(0).optional(),
  air_ticket_cost: z.number().min(0).optional(),
  chartered_transport_cost: z.number().min(0).optional(),
  consumable_materials_cost: z.number().min(0).optional(),
  allowance_type: z.enum(['meal', 'trainee']),
});

export async function employerFeatureRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('employer'));

  // ---- Selected Training (for calendar) ----
  app.get('/selected-training', async (request, reply) => {
    const userId = request.user!.user_id;
    // Get employer profile
    const employer = await prisma.employerProfile.findUnique({
      where: { user_id: userId },
      select: { employer_id: true },
    });
    if (!employer) return reply.send({ success: true, data: [] });

    // Get all selected proposals from broadcasts
    const broadcastProposals = await prisma.tpProposal.findMany({
      where: {
        status: 'selected',
        request: { employer_id: employer.employer_id },
      },
      select: {
        proposal_id: true,
        proposed_fee: true,
        proposed_schedule: true,
        proposed_duration: true,
        status: true,
        created_at: true,
        provider: { select: { provider_name: true } },
        program: { select: { program_id: true, title: true } },
        request: { select: { request_id: true, title: true, preferred_dates: true, training_days: true } },
      },
    });

    // Get selected proposals from enquiries (proposals without request_id that belong to this employer's enquiries)
    const enquiryProposals = await prisma.tpProposal.findMany({
      where: {
        status: 'selected',
        request_id: null as any,
      },
      select: {
        proposal_id: true,
        proposed_fee: true,
        proposed_schedule: true,
        proposed_duration: true,
        status: true,
        created_at: true,
        provider: { select: { provider_name: true } },
        program: { select: { program_id: true, title: true } },
      },
    });

    const data = [
      ...broadcastProposals.map((p) => ({
        proposal_id: p.proposal_id,
        title: p.program?.title || p.request?.title || 'Training',
        provider_name: p.provider?.provider_name || 'Provider',
        proposed_fee: p.proposed_fee,
        proposed_schedule: p.proposed_schedule,
        proposed_duration: p.proposed_duration,
        preferred_dates: p.request?.preferred_dates,
        training_days: p.request?.training_days,
        source: 'broadcast' as const,
        source_id: p.request?.request_id,
        created_at: p.created_at,
      })),
      ...enquiryProposals.map((p) => ({
        proposal_id: p.proposal_id,
        title: p.program?.title || 'Training',
        provider_name: p.provider?.provider_name || 'Provider',
        proposed_fee: p.proposed_fee,
        proposed_schedule: p.proposed_schedule,
        proposed_duration: p.proposed_duration,
        preferred_dates: null,
        training_days: null,
        source: 'enquiry' as const,
        source_id: null,
        created_at: p.created_at,
      })),
    ];

    return reply.send({ success: true, data });
  });

  // ---- Levy Optimizer ----

  app.get('/levy-status', async (request, reply) => {
    const data = await levyService.getLevyStatus(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  app.put('/levy-balance', {
    preHandler: [validate(updateLevySchema)],
    handler: async (request, reply) => {
      const { total_levy, utilized_amount, year } = request.body as any;
      const data = await levyService.updateLevyBalance(request.user!.user_id, total_levy, utilized_amount, year);
      return reply.send({ success: true, data });
    },
  });

  app.get('/levy-optimizer/recommendations', async (request, reply) => {
    const data = await levyService.getLevyRecommendations(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  // ---- Effectiveness Tracking ----

  app.post('/effectiveness/track', {
    preHandler: [validate(createTrackingSchema)],
    handler: async (request, reply) => {
      const data = await effectivenessService.createTracking(request.user!.user_id, request.body as any);
      return reply.status(201).send({ success: true, data });
    },
  });

  app.get('/effectiveness', async (request, reply) => {
    const data = await effectivenessService.listMyTracking(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  app.post('/effectiveness/:record_id/survey', {
    preHandler: [validate(submitSurveySchema)],
    handler: async (request, reply) => {
      const { record_id } = request.params as { record_id: string };
      const data = await effectivenessService.submitSurvey(request.user!.user_id, record_id, request.body as any);
      return reply.send({ success: true, data });
    },
  });

  // ---- Annual Training Plan ----

  app.get('/training-plans', async (request, reply) => {
    const data = await planService.listPlans(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  app.post('/training-plans', {
    preHandler: [validate(createPlanSchema)],
    handler: async (request, reply) => {
      const data = await planService.createPlan(request.user!.user_id, request.body as any);
      return reply.status(201).send({ success: true, data });
    },
  });

  app.post('/training-plans/:plan_id/generate-ai', async (request, reply) => {
    const { plan_id } = request.params as { plan_id: string };
    const data = await planService.generateAISuggestions(request.user!.user_id, plan_id);
    return reply.send({ success: true, data });
  });

  app.get('/training-plans/:plan_id/progress', async (request, reply) => {
    const { plan_id } = request.params as { plan_id: string };
    const data = await planService.getPlanProgress(request.user!.user_id, plan_id);
    return reply.send({ success: true, data });
  });

  // ---- Group Training Pool ----

  app.get('/group-training', async (request, reply) => {
    const data = await poolService.listPoolOpportunities(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  app.post('/group-training/:pool_id/join', {
    preHandler: [validate(joinPoolSchema)],
    handler: async (request, reply) => {
      const { pool_id } = request.params as { pool_id: string };
      const { participant_count } = request.body as { participant_count: number };
      const data = await poolService.joinPool(request.user!.user_id, pool_id, participant_count);
      return reply.send({ success: true, data });
    },
  });

  app.post('/group-training/:pool_id/leave', async (request, reply) => {
    const { pool_id } = request.params as { pool_id: string };
    const data = await poolService.leavePool(request.user!.user_id, pool_id);
    return reply.send({ success: true, data });
  });

  // ---- Feature Entitlements ----

  // Check if user has a specific feature
  app.get('/entitlements', async (request, reply) => {
    const { feature } = request.query as { feature?: string };
    if (feature) {
      const data = await entitlementService.checkEntitlement(request.user!.user_id, feature);
      return reply.send({ success: true, data });
    }
    const data = await entitlementService.listEntitlements(request.user!.user_id);
    return reply.send({ success: true, data });
  });

  // Activate feature with code (employer enters on web)
  app.post('/activate', {
    preHandler: [validate(activateCodeSchema)],
    handler: async (request, reply) => {
      const { code } = request.body as { code: string };
      const data = await entitlementService.activateWithCode(request.user!.user_id, code);
      return reply.send({ success: true, data });
    },
  });

  // Register activation code (called by mobile app after purchase)
  app.post('/activation-codes', {
    preHandler: [validate(registerCodeSchema)],
    handler: async (request, reply) => {
      const { code, feature_key, google_play_order_id } = request.body as any;
      const data = await entitlementService.registerActivationCode(code, feature_key, google_play_order_id);
      return reply.status(201).send({ success: true, data: { code: data.code, feature_key: data.feature_key } });
    },
  });

  // Generate QR session for web activation
  app.get('/activation-qr', async (_request, reply) => {
    const sessionToken = entitlementService.generateQrSessionToken();
    return reply.send({
      success: true,
      data: {
        session_token: sessionToken,
        activation_url: '/api/employer/activate-qr',
        expires_in: 300, // 5 minutes
      },
    });
  });

  // Activate via QR (called by mobile app after scanning)
  app.post('/activate-qr', {
    preHandler: [validate(activateQrSchema)],
    handler: async (request, reply) => {
      const { session_token, activation_code } = request.body as any;
      const data = await entitlementService.activateWithQr(session_token, activation_code);
      return reply.send({ success: true, data });
    },
  });

  // ---- HRD Grant Calculator ----

  app.post('/grant-calculator', {
    preHandler: [validate(grantCalculatorSchema)],
    handler: async (request, reply) => {
      // Check entitlement first
      const entitlement = await entitlementService.checkEntitlement(
        request.user!.user_id,
        'hrd_grant_calculator',
      );
      if (!entitlement.active) {
        return reply.status(403).send({
          success: false,
          message: 'HRD Grant Calculator is a premium feature. Please activate it with your Google Play purchase code.',
          data: { requires_activation: true, feature_key: 'hrd_grant_calculator' },
        });
      }

      const input = request.body as CalculatorInput;
      const data = calculateGrant(input);
      return reply.send({ success: true, data });
    },
  });
}
