import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../../shared/validators/auth.validators.js';
import * as authService from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', {
    preHandler: [validate(registerSchema)],
    handler: async (request, reply) => {
      const result = await authService.registerUser(request.body as any);
      return reply.status(201).send({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: result,
      });
    },
  });

  // POST /api/auth/verify-email
  app.post('/verify-email', {
    preHandler: [validate(verifyEmailSchema)],
    handler: async (request, reply) => {
      const { token } = request.body as { token: string };
      const result = await authService.verifyEmail(token);
      return reply.send({
        success: true,
        message: 'Email verified successfully',
        data: result,
      });
    },
  });

  // POST /api/auth/resend-verification
  app.post('/resend-verification', {
    preHandler: [validate(resendVerificationSchema)],
    handler: async (request, reply) => {
      const { email } = request.body as { email: string };
      await authService.resendVerification(email);
      return reply.send({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    },
  });

  // POST /api/auth/login
  app.post('/login', {
    preHandler: [validate(loginSchema)],
    handler: async (request, reply) => {
      const result = await authService.loginUser(request.body as any);
      return reply.send({
        success: true,
        data: result,
      });
    },
  });

  // POST /api/auth/refresh-token
  app.post('/refresh-token', {
    preHandler: [validate(refreshTokenSchema)],
    handler: async (request, reply) => {
      const { refresh_token } = request.body as { refresh_token: string };
      const result = await authService.refreshAccessToken(refresh_token);
      return reply.send({
        success: true,
        data: result,
      });
    },
  });

  // POST /api/auth/logout
  app.post('/logout', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      await authService.logoutUser(request.user!.user_id);
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    },
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', {
    preHandler: [validate(forgotPasswordSchema)],
    handler: async (request, reply) => {
      const { email } = request.body as { email: string };
      await authService.forgotPassword(email);
      return reply.send({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    },
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', {
    preHandler: [validate(resetPasswordSchema)],
    handler: async (request, reply) => {
      await authService.resetPassword(request.body as any);
      return reply.send({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    },
  });

  // PUT /api/auth/change-password
  app.put('/change-password', {
    preHandler: [authenticate, validate(changePasswordSchema)],
    handler: async (request, reply) => {
      await authService.changePassword(request.user!.user_id, request.body as any);
      return reply.send({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    },
  });
}
