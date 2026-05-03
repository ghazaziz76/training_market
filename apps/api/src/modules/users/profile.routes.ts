import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  updateEmployerProfileSchema,
  updateIndividualProfileSchema,
  updateProviderProfileSchema,
} from '../../shared/validators/profile.validators.js';
import * as profileService from './profile.service.js';

export async function employerProfileRoutes(app: FastifyInstance) {
  // All routes require auth + employer role
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('employer'));

  // GET /api/employer/profile
  app.get('/profile', async (request, reply) => {
    const profile = await profileService.getEmployerProfile(request.user!.user_id);
    return reply.send({ success: true, data: profile });
  });

  // PUT /api/employer/profile
  app.put('/profile', {
    preHandler: [validate(updateEmployerProfileSchema)],
    handler: async (request, reply) => {
      const profile = await profileService.updateEmployerProfile(
        request.user!.user_id,
        request.body as any,
      );
      return reply.send({ success: true, data: profile });
    },
  });
}

export async function individualProfileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('individual'));

  // GET /api/individual/profile
  app.get('/profile', async (request, reply) => {
    const profile = await profileService.getIndividualProfile(request.user!.user_id);
    return reply.send({ success: true, data: profile });
  });

  // PUT /api/individual/profile
  app.put('/profile', {
    preHandler: [validate(updateIndividualProfileSchema)],
    handler: async (request, reply) => {
      const profile = await profileService.updateIndividualProfile(
        request.user!.user_id,
        request.body as any,
      );
      return reply.send({ success: true, data: profile });
    },
  });
}

export async function providerProfileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('provider'));

  // GET /api/provider/profile
  app.get('/profile', async (request, reply) => {
    const profile = await profileService.getProviderProfile(request.user!.user_id);
    return reply.send({ success: true, data: profile });
  });

  // PUT /api/provider/profile
  app.put('/profile', {
    preHandler: [validate(updateProviderProfileSchema)],
    handler: async (request, reply) => {
      const profile = await profileService.updateProviderProfile(
        request.user!.user_id,
        request.body as any,
      );
      return reply.send({ success: true, data: profile });
    },
  });
}
