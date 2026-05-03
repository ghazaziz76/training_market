import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../shared/helpers/tokens.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { AppError } from '../shared/errors/AppError.js';

export interface AuthenticatedUser {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  status: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Check Redis cache first
    const cacheKey = `user:session:${payload.user_id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      request.user = JSON.parse(cached);
      return;
    }

    // Fallback to database
    const user = await prisma.user.findUnique({
      where: { user_id: payload.user_id },
      select: {
        user_id: true,
        role: true,
        full_name: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (user.status === 'suspended') {
      throw AppError.forbidden('Account is suspended');
    }

    if (user.status === 'deactivated') {
      throw AppError.forbidden('Account is deactivated');
    }

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 300);

    request.user = user;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.unauthorized('Invalid or expired token');
  }
}
