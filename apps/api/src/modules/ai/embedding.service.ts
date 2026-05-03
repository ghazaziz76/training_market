import { prisma } from '../../config/database.js';
import { generateEmbedding, isAIConfigured } from './ai-client.js';

// ---- Build embedding text from program data ----

function buildEmbeddingText(program: Record<string, any>): string {
  const parts = [
    program.title,
    program.description,
    program.objective ? `Objective: ${program.objective}` : '',
    program.target_group ? `Target group: ${program.target_group}` : '',
    program.category_name ? `Category: ${program.category_name}` : '',
    program.industry_focus?.length ? `Industries: ${program.industry_focus.join(', ')}` : '',
    program.skill_tag_names?.length ? `Skills: ${program.skill_tag_names.join(', ')}` : '',
    program.skill_type ? `Skill type: ${program.skill_type}` : '',
    `Delivery: ${program.delivery_mode}`,
    program.location ? `Location: ${program.location}` : '',
    program.duration_days ? `Duration: ${program.duration_days} days` : '',
    program.is_certification ? `Certification: ${program.certification_name || 'Yes'}` : '',
    program.hrd_corp_claimable ? 'HRD Corp Claimable' : '',
    program.program_type ? `Program type: ${program.program_type}` : '',
  ];

  return parts.filter(Boolean).join('. ');
}

// ---- Generate and store embedding for a program ----

export async function generateProgramEmbedding(programId: string) {
  if (!isAIConfigured()) {
    console.log('AI not configured, skipping embedding generation');
    return;
  }

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    include: {
      category: { select: { name: true } },
      skill_tags: { include: { skill_tag: { select: { name: true } } } },
    },
  });

  if (!program) return;

  const text = buildEmbeddingText({
    ...program,
    category_name: program.category?.name,
    skill_tag_names: program.skill_tags.map((st) => st.skill_tag.name),
  });

  try {
    const result = await generateEmbedding(text);

    // Store using raw SQL since Prisma doesn't natively support vector type
    await prisma.$executeRawUnsafe(
      `INSERT INTO program_embeddings (program_id, embedding, embedding_model, created_at, updated_at)
       VALUES ($1::uuid, $2::vector, $3, NOW(), NOW())
       ON CONFLICT (program_id) DO UPDATE SET
         embedding = $2::vector,
         embedding_model = $3,
         updated_at = NOW()`,
      programId,
      `[${result.embedding.join(',')}]`,
      result.model,
    );
  } catch (error) {
    console.error(`Embedding generation failed for program ${programId}:`, error);
  }
}

// ---- Batch generate embeddings for all programs without one ----

export async function generateMissingEmbeddings() {
  if (!isAIConfigured()) return { processed: 0 };

  const programs = await prisma.$queryRawUnsafe<Array<{ program_id: string }>>(
    `SELECT p.program_id FROM training_programs p
     LEFT JOIN program_embeddings pe ON p.program_id = pe.program_id
     WHERE p.status = 'published' AND pe.program_id IS NULL
     LIMIT 50`,
  );

  let processed = 0;
  for (const p of programs) {
    await generateProgramEmbedding(p.program_id);
    processed++;
    // Rate limit: small delay between calls
    await new Promise((r) => setTimeout(r, 200));
  }

  return { processed };
}

// ---- Semantic search using vector similarity ----

export async function semanticSearch(
  queryText: string,
  filters: {
    delivery_mode?: string;
    state?: string;
    max_fee?: number;
    hrd_corp_claimable?: boolean;
    category_id?: string;
    program_type?: string;
    skill_type?: string;
  } = {},
  limit: number = 10,
): Promise<Array<{ program_id: string; distance: number }>> {
  if (!isAIConfigured()) return [];

  try {
    const result = await generateEmbedding(queryText);
    const vectorStr = `[${result.embedding.join(',')}]`;

    // Build filter clauses
    const conditions: string[] = ["p.status = 'published'"];
    const params: any[] = [vectorStr, limit];
    let paramIdx = 3;

    if (filters.delivery_mode) {
      conditions.push(`p.delivery_mode = $${paramIdx}`);
      params.push(filters.delivery_mode);
      paramIdx++;
    }
    if (filters.state) {
      conditions.push(`p.state ILIKE $${paramIdx}`);
      params.push(`%${filters.state}%`);
      paramIdx++;
    }
    if (filters.max_fee) {
      conditions.push(`p.fee_per_pax <= $${paramIdx}`);
      params.push(filters.max_fee);
      paramIdx++;
    }
    if (filters.hrd_corp_claimable) {
      conditions.push(`p.hrd_corp_claimable = true`);
    }
    if (filters.category_id) {
      conditions.push(`p.category_id = $${paramIdx}::uuid`);
      params.push(filters.category_id);
      paramIdx++;
    }
    if (filters.program_type) {
      conditions.push(`(p.program_type = $${paramIdx} OR p.program_type = 'both')`);
      params.push(filters.program_type);
      paramIdx++;
    }
    if (filters.skill_type) {
      conditions.push(`(p.skill_type = $${paramIdx} OR p.skill_type = 'both')`);
      params.push(filters.skill_type);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const results = await prisma.$queryRawUnsafe<Array<{ program_id: string; distance: number }>>(
      `SELECT p.program_id, pe.embedding <=> $1::vector AS distance
       FROM training_programs p
       JOIN program_embeddings pe ON p.program_id = pe.program_id
       WHERE ${whereClause}
       ORDER BY distance ASC
       LIMIT $2`,
      ...params,
    );

    return results;
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}
