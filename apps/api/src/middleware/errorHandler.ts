import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // AppError (our custom errors)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      errors: error.validation.map((v) => ({
        field: v.instancePath?.replace('/', '') || v.params?.missingProperty,
        message: v.message,
      })),
    });
  }

  // Unexpected errors
  console.error('Unhandled error:', error);

  return reply.status(500).send({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    code: 'INTERNAL_ERROR',
  });
}
