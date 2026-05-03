import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

const CATEGORIES_CACHE_KEY = 'categories:tree';
const TAGS_CACHE_KEY = 'skill_tags:all';

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/categories — public, cached
  app.get('/', async (_request, reply) => {
    // Check cache
    const cached = await redis.get(CATEGORIES_CACHE_KEY);
    if (cached) {
      return reply.send({ success: true, data: JSON.parse(cached) });
    }

    // Build category tree
    const categories = await prisma.category.findMany({
      where: { parent_id: null, status: 'active' },
      orderBy: { sort_order: 'asc' },
      include: {
        children: {
          where: { status: 'active' },
          orderBy: { sort_order: 'asc' },
          select: { category_id: true, name: true, slug: true },
        },
        _count: { select: { programs: { where: { status: 'published' } } } },
      },
    });

    const tree = categories.map((cat) => ({
      category_id: cat.category_id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      program_count: cat._count.programs,
      subcategories: cat.children,
    }));

    // Cache for 1 hour
    await redis.set(CATEGORIES_CACHE_KEY, JSON.stringify(tree), 'EX', 3600);

    return reply.send({ success: true, data: tree });
  });
}

export async function skillTagRoutes(app: FastifyInstance) {
  // GET /api/skill-tags — public, cached
  app.get('/', async (request, reply) => {
    const { category_id, search } = request.query as {
      category_id?: string;
      search?: string;
    };

    // Only cache the full unfiltered list
    if (!category_id && !search) {
      const cached = await redis.get(TAGS_CACHE_KEY);
      if (cached) {
        return reply.send({ success: true, data: JSON.parse(cached) });
      }
    }

    const where: any = {};
    if (category_id) where.category_id = category_id;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const tags = await prisma.skillTag.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { tag_id: true, name: true, slug: true, category_id: true },
    });

    if (!category_id && !search) {
      await redis.set(TAGS_CACHE_KEY, JSON.stringify(tags), 'EX', 3600);
    }

    return reply.send({ success: true, data: tags });
  });
}

// ---- Admin CRUD for categories and tags ----

const categorySchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().max(100).optional(),
  sort_order: z.number().int().default(0),
});

const tagSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255),
  category_id: z.string().uuid().nullable().optional(),
});

export async function adminCategoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('admin'));

  // POST /api/admin/categories
  app.post('/categories', {
    preHandler: [validate(categorySchema)],
    handler: async (request, reply) => {
      const cat = await prisma.category.create({ data: request.body as any });
      await redis.del(CATEGORIES_CACHE_KEY);
      return reply.status(201).send({ success: true, data: cat });
    },
  });

  // PUT /api/admin/categories/:id
  app.put('/categories/:id', {
    preHandler: [validate(categorySchema.partial())],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const cat = await prisma.category.update({ where: { category_id: id }, data: request.body as any });
      await redis.del(CATEGORIES_CACHE_KEY);
      return reply.send({ success: true, data: cat });
    },
  });

  // DELETE /api/admin/categories/:id
  app.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const count = await prisma.trainingProgram.count({ where: { category_id: id, status: 'published' } });
    if (count > 0) {
      return reply.status(400).send({
        success: false,
        message: `Cannot delete: ${count} published programs use this category`,
      });
    }
    await prisma.category.update({ where: { category_id: id }, data: { status: 'archived' } });
    await redis.del(CATEGORIES_CACHE_KEY);
    return reply.send({ success: true, message: 'Category archived' });
  });

  // POST /api/admin/skill-tags
  app.post('/skill-tags', {
    preHandler: [validate(tagSchema)],
    handler: async (request, reply) => {
      const tag = await prisma.skillTag.create({ data: request.body as any });
      await redis.del(TAGS_CACHE_KEY);
      return reply.status(201).send({ success: true, data: tag });
    },
  });

  // PUT /api/admin/skill-tags/:id
  app.put('/skill-tags/:id', {
    preHandler: [validate(tagSchema.partial())],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const tag = await prisma.skillTag.update({ where: { tag_id: id }, data: request.body as any });
      await redis.del(TAGS_CACHE_KEY);
      return reply.send({ success: true, data: tag });
    },
  });

  // DELETE /api/admin/skill-tags/:id
  app.delete('/skill-tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.programSkillTag.deleteMany({ where: { tag_id: id } });
    await prisma.skillTag.delete({ where: { tag_id: id } });
    await redis.del(TAGS_CACHE_KEY);
    return reply.send({ success: true, message: 'Skill tag deleted' });
  });
}
