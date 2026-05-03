import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

// ---- CSV Parsing ----

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue; // skip empty rows
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (values[j] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---- Import from CSV ----

export async function importFromCSV(userId: string, csvText: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider profile not found');

  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    throw AppError.badRequest('No data found in CSV. Please check the file format.');
  }

  // Map CSV columns to program fields (flexible column matching)
  const programs = rows.map((row, i) => ({
    index: i,
    title: row.title || row.program_title || row.course_title || row.name || '',
    short_description: row.short_description || '',
    description: row.description || row.program_description || row.details || '',
    objective: row.objective || row.objectives || row.learning_outcomes || row.outcomes || '',
    target_group: row.target_group || row.target_audience || row.audience || row.who_should_attend || '',
    program_type: (row.program_type || row.type || 'public').toLowerCase(),
    skill_type: (row.skill_type || 'both').toLowerCase(),
    delivery_mode: (row.delivery_mode || row.mode || row.delivery || 'physical').toLowerCase(),
    duration_days: parseNum(row.duration_days || row.days || row.duration),
    duration_hours: parseNum(row.duration_hours || row.hours || row.total_hours),
    fee_per_pax: parseNum(row.fee_per_pax || row.fee || row.price || row.price_per_pax),
    fee_per_group: parseNum(row.fee_per_group || row.group_fee || row.inhouse_fee || row.in_house_fee),
    early_bird_fee: parseNum(row.early_bird_fee || row.early_bird),
    city: row.city || row.location || '',
    state: row.state || '',
    max_participants: parseNum(row.max_participants || row.max_pax),
    language: row.language || 'English',
    prerequisites: row.prerequisites || '',
    is_certification: parseBool(row.is_certification || row.certification),
    certification_name: row.certification_name || '',
    certification_body: row.certification_body || '',
    hrd_corp_claimable: parseBool(row.hrd_corp_claimable || row.hrd_corp || row.hrdc),
    hrd_corp_scheme: row.hrd_corp_scheme || row.scheme || '',
    modules: row.modules || row.agenda || row.training_modules || '',
    category_suggestion: row.category || row.category_suggestion || '',
    category_id: '',
    selected: true,
  }));

  // Filter out rows without title
  const valid = programs.filter((p) => p.title);
  if (valid.length === 0) {
    throw AppError.badRequest('No programs with titles found. Make sure your CSV has a "title" column.');
  }

  return {
    extracted_count: valid.length,
    skipped_count: programs.length - valid.length,
    programs: valid,
  };
}

function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function parseBool(val: string | undefined): boolean {
  if (!val) return false;
  return ['yes', 'true', '1', 'y'].includes(val.toLowerCase().trim());
}

// Parse "Day 1: Module A, Module B | Day 2: Module C, Module D" into agenda JSON
function parseModules(text: string): any[] | undefined {
  if (!text || !text.trim()) return undefined;

  const days = text.split('|').map((d) => d.trim()).filter(Boolean);
  if (days.length === 0) return undefined;

  return days.map((dayText, i) => {
    // Try to extract "Day N:" prefix
    const dayMatch = dayText.match(/^Day\s*(\d+)\s*:\s*(.*)/i);
    const dayNum = dayMatch ? parseInt(dayMatch[1]) : i + 1;
    const modulesText = dayMatch ? dayMatch[2] : dayText;

    const slots = modulesText.split(',').map((m) => m.trim()).filter(Boolean).map((m) => {
      const isBreak = /break|lunch|tea|dinner|night/i.test(m);
      return { module_title: m, is_break: isBreak };
    });

    return { day: dayNum, slots };
  });
}

// ---- Save Imported Programs ----

export async function saveImportedPrograms(
  userId: string,
  programs: Array<{
    title: string;
    description: string;
    objective?: string;
    target_group?: string;
    duration_days?: number;
    duration_hours?: number;
    fee_per_pax?: number;
    fee_per_group?: number;
    delivery_mode?: string;
    language?: string;
    category_id?: string;
  }>,
) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider profile not found');

  const created = [];
  const errors = [];

  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    try {
      if (!p.title) {
        errors.push({ index: i, title: p.title, error: 'Title is required' });
        continue;
      }

      let categoryId = p.category_id;
      if (!categoryId) {
        const defaultCat = await prisma.category.findFirst({ where: { parent_id: null, status: 'active' } });
        categoryId = defaultCat?.category_id;
      }
      if (!categoryId) {
        errors.push({ index: i, title: p.title, error: 'No category available' });
        continue;
      }

      const slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 200) + '-' + Date.now().toString(36);

      const program = await prisma.trainingProgram.create({
        data: {
          provider_id: provider.provider_id,
          category_id: categoryId,
          title: p.title,
          slug,
          short_description: (p as any).short_description || undefined,
          description: p.description || p.title,
          objective: p.objective || undefined,
          target_group: p.target_group || undefined,
          program_type: (p as any).program_type || 'public',
          skill_type: (p as any).skill_type || 'both',
          delivery_mode: p.delivery_mode || 'physical',
          duration_days: p.duration_days || undefined,
          duration_hours: p.duration_hours || undefined,
          fee_per_pax: p.fee_per_pax || undefined,
          fee_per_group: p.fee_per_group || undefined,
          early_bird_fee: (p as any).early_bird_fee || undefined,
          city: (p as any).city || undefined,
          state: (p as any).state || undefined,
          max_participants: (p as any).max_participants || undefined,
          language: p.language || 'English',
          prerequisites: (p as any).prerequisites || undefined,
          is_certification: (p as any).is_certification || false,
          certification_name: (p as any).certification_name || undefined,
          hrd_corp_claimable: (p as any).hrd_corp_claimable || false,
          hrd_corp_scheme: (p as any).hrd_corp_scheme || undefined,
          agenda: (p as any).modules ? parseModules((p as any).modules) : undefined,
          status: 'draft',
        },
      });

      created.push({ index: i, program_id: program.program_id, title: program.title });
    } catch (err: any) {
      errors.push({ index: i, title: p.title, error: err.message || 'Unknown error' });
    }
  }

  return { created_count: created.length, error_count: errors.length, created, errors };
}
