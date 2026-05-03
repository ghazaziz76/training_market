import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createProgramSchema,
  updateProgramSchema,
  listProgramsSchema,
} from '../../shared/validators/program.validators.js';
import * as programService from './program.service.js';
import * as catalogService from './catalog-import.service.js';

export async function programRoutes(app: FastifyInstance) {
  // POST /api/programs/import-csv — upload CSV file for bulk import
  app.post('/import-csv', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.status(400).send({ success: false, message: 'No file provided' });

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const csvText = buffer.toString('utf-8');
      const result = await catalogService.importFromCSV(request.user!.user_id, csvText);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/programs/import-save — save extracted programs as drafts
  app.post('/import-save', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const { programs } = request.body as { programs: any[] };
      if (!programs || !Array.isArray(programs)) {
        return reply.status(400).send({ success: false, message: 'Programs array required' });
      }
      const result = await catalogService.saveImportedPrograms(request.user!.user_id, programs);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/programs — create program (provider only)
  app.post('/', {
    preHandler: [authenticate, requireRole('provider'), validate(createProgramSchema)],
    handler: async (request, reply) => {
      const program = await programService.createProgram(request.user!.user_id, request.body as any);
      return reply.status(201).send({ success: true, data: program });
    },
  });

  // GET /api/programs/my-programs — provider's own programs
  app.get('/my-programs', {
    preHandler: [authenticate, requireRole('provider'), validateQuery(listProgramsSchema)],
    handler: async (request, reply) => {
      const result = await programService.listMyPrograms(request.user!.user_id, request.query as any);
      return reply.send({ success: true, ...result });
    },
  });

  // GET /api/programs/:program_id — view program detail
  app.get('/:program_id', async (request, reply) => {
    const { program_id } = request.params as { program_id: string };
    const userId = request.user?.user_id;
    const program = await programService.getProgram(program_id, userId);
    return reply.send({ success: true, data: program });
  });

  // PUT /api/programs/:program_id — update program (provider owner only)
  app.put('/:program_id', {
    preHandler: [authenticate, requireRole('provider'), validate(updateProgramSchema)],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const program = await programService.updateProgram(
        request.user!.user_id,
        program_id,
        request.body as any,
      );
      return reply.send({ success: true, data: program });
    },
  });

  // DELETE /api/programs/:program_id — archive program (provider owner only)
  app.delete('/:program_id', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const result = await programService.archiveProgram(request.user!.user_id, program_id);
      return reply.send({ success: true, data: result });
    },
  });

  // POST /api/programs/:program_id/duplicate — duplicate program (provider only)
  app.post('/:program_id/duplicate', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const program = await programService.duplicateProgram(request.user!.user_id, program_id);
      return reply.status(201).send({ success: true, data: program });
    },
  });

  // PUT /api/programs/:program_id/submit — submit for review
  app.put('/:program_id/submit', {
    preHandler: [authenticate, requireRole('provider')],
    handler: async (request, reply) => {
      const { program_id } = request.params as { program_id: string };
      const result = await programService.submitForReview(request.user!.user_id, program_id);
      return reply.send({ success: true, data: result });
    },
  });
}
