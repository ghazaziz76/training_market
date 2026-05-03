import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  CreateProgramInput,
  UpdateProgramInput,
  ListProgramsInput,
} from '../../shared/validators/program.validators.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 490);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  const existing = await prisma.trainingProgram.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  return slug;
}

// ---- Get provider_id from user_id ----
async function getProviderId(userId: string): Promise<string> {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider profile not found');
  return provider.provider_id;
}

// ---- Create Program ----
export async function createProgram(userId: string, input: CreateProgramInput) {
  const providerId = await getProviderId(userId);

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { category_id: input.category_id } });
  if (!category) throw AppError.badRequest('Invalid category');

  const slug = await uniqueSlug(input.title);

  const { skill_tag_ids, ...programData } = input;

  const program = await prisma.trainingProgram.create({
    data: {
      provider_id: providerId,
      slug,
      ...programData,
      agenda: input.agenda ?? [],
      industry_focus: input.industry_focus ?? [],
      status: 'draft',
    },
  });

  // Assign skill tags if provided
  if (skill_tag_ids?.length) {
    await prisma.programSkillTag.createMany({
      data: skill_tag_ids.map((tag_id) => ({
        program_id: program.program_id,
        tag_id,
      })),
      skipDuplicates: true,
    });
  }

  return program;
}

// ---- Get Program by ID ----
export async function getProgram(programId: string, userId?: string) {
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    include: {
      provider: {
        select: {
          provider_id: true,
          provider_name: true,
          logo_url: true,
          quality_tier: true,
          average_rating: true,
          user_id: true,
        },
      },
      category: { select: { category_id: true, name: true, slug: true } },
      skill_tags: { include: { skill_tag: { select: { tag_id: true, name: true } } } },
      program_trainers: { include: { trainer: true } },
      schedules: {
        where: { status: 'open' },
        orderBy: { start_date: 'asc' },
      },
      promotions: {
        where: { status: 'active' },
      },
    },
  });

  if (!program) throw AppError.notFound('Program not found');

  // Non-published programs only visible to owner or admin
  if (program.status !== 'published') {
    if (!userId || program.provider.user_id !== userId) {
      throw AppError.notFound('Program not found');
    }
  }

  return program;
}

// ---- Update Program ----
export async function updateProgram(userId: string, programId: string, input: UpdateProgramInput) {
  const providerId = await getProviderId(userId);

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    select: { provider_id: true, status: true },
  });

  if (!program) throw AppError.notFound('Program not found');
  if (program.provider_id !== providerId) throw AppError.forbidden('Not your program');

  const { skill_tag_ids, ...updateData } = input;

  const updated = await prisma.trainingProgram.update({
    where: { program_id: programId },
    data: {
      ...updateData,
      agenda: input.agenda !== undefined ? input.agenda : undefined,
      industry_focus: input.industry_focus !== undefined ? input.industry_focus : undefined,
    },
  });

  // Update skill tags if provided
  if (skill_tag_ids !== undefined) {
    await prisma.programSkillTag.deleteMany({ where: { program_id: programId } });
    if (skill_tag_ids.length) {
      await prisma.programSkillTag.createMany({
        data: skill_tag_ids.map((tag_id) => ({
          program_id: programId,
          tag_id,
        })),
        skipDuplicates: true,
      });
    }
  }

  return updated;
}

// ---- Archive Program (soft delete) ----
export async function archiveProgram(userId: string, programId: string) {
  const providerId = await getProviderId(userId);

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    select: { provider_id: true },
  });

  if (!program) throw AppError.notFound('Program not found');
  if (program.provider_id !== providerId) throw AppError.forbidden('Not your program');

  await prisma.trainingProgram.update({
    where: { program_id: programId },
    data: { status: 'archived' },
  });

  return { program_id: programId, status: 'archived' };
}

// ---- List Provider's Own Programs ----
export async function listMyPrograms(userId: string, input: ListProgramsInput) {
  const providerId = await getProviderId(userId);

  const where: any = { provider_id: providerId };

  if (input.status) where.status = input.status;
  if (input.category_id) where.category_id = input.category_id;
  if (input.search) {
    where.title = { contains: input.search, mode: 'insensitive' };
  }

  const [programs, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      select: {
        program_id: true,
        title: true,
        short_description: true,
        description: true,
        category: { select: { name: true } },
        program_type: true,
        skill_type: true,
        is_certification: true,
        fee_per_pax: true,
        fee_per_group: true,
        delivery_mode: true,
        duration_days: true,
        duration_hours: true,
        status: true,
        view_count: true,
        enquiry_count: true,
        published_at: true,
        created_at: true,
      },
      orderBy: { [input.sort_by]: input.sort_order },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  return {
    data: programs,
    pagination: {
      total,
      page: input.page,
      limit: input.limit,
      total_pages: Math.ceil(total / input.limit),
    },
  };
}

// ---- Submit for Review ----
export async function submitForReview(userId: string, programId: string) {
  const providerId = await getProviderId(userId);

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
  });

  if (!program) throw AppError.notFound('Program not found');
  if (program.provider_id !== providerId) throw AppError.forbidden('Not your program');

  if (program.status !== 'draft' && program.status !== 'rejected') {
    throw AppError.badRequest('Program can only be submitted from draft or rejected status');
  }

  // Validate required fields for submission
  const errors: string[] = [];
  if (!program.title) errors.push('Title is required');
  if (!program.description) errors.push('Description is required');
  if (!program.objective) errors.push('Objective is required');
  if (!program.target_group) errors.push('Target group is required');
  if (!program.category_id) errors.push('Category is required');
  if (!program.delivery_mode) errors.push('Delivery mode is required');
  if (!program.duration_days && !program.duration_hours) errors.push('Duration is required');

  // Pricing validation based on program type
  if (program.program_type === 'public' || program.program_type === 'both') {
    if (!program.fee_per_pax) errors.push('Fee per pax is required for public programs');
  }
  if (program.program_type === 'in_house' || program.program_type === 'both') {
    if (!program.fee_per_group) errors.push('Fee per group is required for in-house programs');
  }

  if (errors.length > 0) {
    throw AppError.badRequest(`Cannot submit: ${errors.join(', ')}`);
  }

  await prisma.trainingProgram.update({
    where: { program_id: programId },
    data: { status: 'pending_review', rejection_reason: null },
  });

  // Create notification for admin
  const admins = await prisma.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { user_id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        user_id: admin.user_id,
        type: 'program_pending_review',
        title: 'New program submitted for review',
        message: `"${program.title}" has been submitted for review.`,
        reference_id: programId,
        reference_type: 'program',
        action_url: `/admin/programs/${programId}/review`,
      })),
    });
  }

  return { program_id: programId, status: 'pending_review' };
}

// ---- Duplicate Program ----
export async function duplicateProgram(userId: string, programId: string) {
  const providerId = await getProviderId(userId);

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    include: {
      skill_tags: { select: { tag_id: true } },
    },
  });

  if (!program) throw AppError.notFound('Program not found');
  if (program.provider_id !== providerId) throw AppError.forbidden('Not your program');

  const newTitle = `Copy of ${program.title}`;
  const slug = await uniqueSlug(newTitle);

  const duplicate = await prisma.trainingProgram.create({
    data: {
      provider_id: providerId,
      category_id: program.category_id,
      subcategory_id: program.subcategory_id,
      custom_category: program.custom_category,
      title: newTitle,
      slug,
      description: program.description,
      objective: program.objective,
      target_group: program.target_group,
      duration_hours: program.duration_hours,
      duration_days: program.duration_days,
      program_type: program.program_type,
      fee_per_pax: program.fee_per_pax,
      fee_per_group: program.fee_per_group,
      min_group_size: program.min_group_size,
      max_group_size: program.max_group_size,
      early_bird_fee: program.early_bird_fee,
      fee_notes: program.fee_notes,
      agenda: program.agenda ?? [],
      skill_type: program.skill_type,
      is_certification: program.is_certification,
      certification_name: program.certification_name,
      certification_body: program.certification_body,
      certification_doc_url: program.certification_doc_url,
      short_description: program.short_description,
      prerequisites: program.prerequisites,
      industry_focus: program.industry_focus,
      delivery_mode: program.delivery_mode,
      location: program.location,
      city: program.city,
      state: program.state,
      min_participants: program.min_participants,
      max_participants: program.max_participants,
      language: program.language,
      materials_provided: program.materials_provided,
      thumbnail_url: program.thumbnail_url,
      brochure_url: program.brochure_url,
      hrd_corp_claimable: program.hrd_corp_claimable,
      hrd_corp_scheme: program.hrd_corp_scheme,
      hrd_corp_program_id: program.hrd_corp_program_id,
      status: 'draft',
    },
  });

  // Copy skill tags
  if (program.skill_tags.length > 0) {
    await prisma.programSkillTag.createMany({
      data: program.skill_tags.map((st) => ({
        program_id: duplicate.program_id,
        tag_id: st.tag_id,
      })),
      skipDuplicates: true,
    });
  }

  return duplicate;
}

// ---- Admin: Approve/Reject Program ----
export async function reviewProgram(
  adminUserId: string,
  programId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string,
) {
  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    include: { provider: { include: { user: { select: { user_id: true } } } } },
  });

  if (!program) throw AppError.notFound('Program not found');
  if (program.status !== 'pending_review') {
    throw AppError.badRequest('Program is not pending review');
  }

  if (action === 'approve') {
    await prisma.trainingProgram.update({
      where: { program_id: programId },
      data: {
        status: 'published',
        published_at: new Date(),
        rejection_reason: null,
      },
    });

    await prisma.notification.create({
      data: {
        user_id: program.provider.user.user_id,
        type: 'program_approved',
        title: 'Program approved!',
        message: `Your program "${program.title}" has been approved and is now live on the marketplace.`,
        reference_id: programId,
        reference_type: 'program',
        action_url: `/provider/programs/${programId}`,
      },
    });
  } else {
    if (!rejectionReason) throw AppError.badRequest('Rejection reason is required');

    await prisma.trainingProgram.update({
      where: { program_id: programId },
      data: {
        status: 'rejected',
        rejection_reason: rejectionReason,
      },
    });

    await prisma.notification.create({
      data: {
        user_id: program.provider.user.user_id,
        type: 'program_rejected',
        title: 'Program needs changes',
        message: `Your program "${program.title}" was not approved. Reason: ${rejectionReason}`,
        reference_id: programId,
        reference_type: 'program',
        action_url: `/provider/programs/${programId}/edit`,
      },
    });
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_user_id: adminUserId,
      action: `program_${action}`,
      target_type: 'program',
      target_id: programId,
      details: { rejection_reason: rejectionReason },
    },
  });

  return { program_id: programId, status: action === 'approve' ? 'published' : 'rejected' };
}

// ---- Admin: List Pending Programs ----
export async function listPendingPrograms(page: number = 1, limit: number = 20) {
  const where = { status: 'pending_review' };

  const [programs, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      include: {
        provider: { select: { provider_name: true, quality_tier: true } },
        category: { select: { name: true } },
      },
      orderBy: { updated_at: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  return {
    data: programs,
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}
