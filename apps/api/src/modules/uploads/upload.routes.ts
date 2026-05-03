import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadRoutes(app: FastifyInstance) {
  // POST /api/uploads — upload a single file (requires auth)
  app.post('/', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ success: false, message: 'No file provided' });
      }

      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG',
        });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({ success: false, message: 'File too large. Maximum 10MB.' });
      }

      const ext = extname(data.filename) || '.bin';
      const storedName = `${randomUUID()}${ext}`;

      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(join(UPLOAD_DIR, storedName), buffer);

      return reply.status(201).send({
        success: true,
        data: {
          file_name: data.filename,
          file_url: `/api/uploads/files/${storedName}`,
          file_type: data.mimetype,
          file_size: buffer.length,
        },
      });
    },
  });

  // GET /api/uploads/files/:filename — serve uploaded file (PUBLIC — no auth, cross-origin allowed)
  app.get('/files/:filename', async (request, reply) => {
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    const { filename } = request.params as { filename: string };

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return reply.status(400).send({ success: false, message: 'Invalid filename' });
    }

    const filePath = join(UPLOAD_DIR, filename);

    try {
      const { readFile } = await import('fs/promises');
      const fileBuffer = await readFile(filePath);

      const ext = extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
      };

      reply.header('Content-Type', mimeMap[ext] || 'application/octet-stream');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.send(fileBuffer);
    } catch {
      return reply.status(404).send({ success: false, message: 'File not found' });
    }
  });
}
