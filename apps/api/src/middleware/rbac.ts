import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../shared/errors/AppError.js';

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw AppError.unauthorized('Authentication required');
    }

    // Admin has access to everything
    if (request.user.role === 'admin') {
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw AppError.forbidden(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      );
    }
  };
}

export function requireOwnerOrAdmin(getUserId: (request: FastifyRequest) => string | undefined) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (request.user.role === 'admin') {
      return;
    }

    const resourceUserId = getUserId(request);
    if (resourceUserId !== request.user.user_id) {
      throw AppError.forbidden('Access denied. You can only access your own resources.');
    }
  };
}
