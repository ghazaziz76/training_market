import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';

export function validate<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      throw new AppError(
        `Validation error: ${errors.map((e) => e.field ? `${e.field}: ${e.message}` : e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
      );
    }

    (request.body as T) = result.data;
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      throw new AppError(
        `Query validation error: ${errors.map((e) => e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
      );
    }

    (request.query as T) = result.data;
  };
}
