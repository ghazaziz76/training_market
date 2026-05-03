import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../shared/errors/AppError.js';
import { checkActiveSubscription } from '../modules/subscriptions/subscription.service.js';

export async function requireActiveSubscription(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (request.user.role !== 'provider') return;

  const hasActive = await checkActiveSubscription(request.user.user_id);
  if (!hasActive) {
    throw AppError.forbidden(
      'Active subscription required. Please subscribe to access this feature.',
      'SUBSCRIPTION_REQUIRED',
    );
  }
}
