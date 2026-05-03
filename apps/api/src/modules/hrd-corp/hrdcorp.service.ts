import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import type {
  CreateChecklistInput,
  UpdateChecklistItemsInput,
} from '../../shared/validators/hrdcorp.validators.js';

async function getEmployerId(userId: string): Promise<string> {
  const profile = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
    select: { employer_id: true },
  });
  if (!profile) throw AppError.notFound('Employer profile not found');
  return profile.employer_id;
}

// ---- Get Guidance for a Program ----

export async function getGuidanceForProgram(userId: string, programId: string) {
  const employer = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
    select: {
      employer_id: true,
      hrd_corp_registered: true,
      hrd_corp_levy_balance: true,
    },
  });
  if (!employer) throw AppError.notFound('Employer profile not found');

  const program = await prisma.trainingProgram.findUnique({
    where: { program_id: programId },
    include: {
      provider: {
        select: {
          provider_name: true,
          hrd_corp_registered_provider: true,
          hrd_corp_provider_id: true,
          contact_email: true,
          contact_phone: true,
        },
      },
    },
  });
  if (!program) throw AppError.notFound('Program not found');

  // Employer readiness assessment
  const readiness_issues: string[] = [];
  if (!employer.hrd_corp_registered) {
    readiness_issues.push('Your company is not marked as HRD Corp registered. Update your profile if this is incorrect.');
  }
  if (!employer.hrd_corp_levy_balance || Number(employer.hrd_corp_levy_balance) <= 0) {
    readiness_issues.push('No levy balance recorded. Update your levy balance in your profile.');
  }
  if (!program.provider.hrd_corp_registered_provider) {
    readiness_issues.push('This training provider is not marked as HRD Corp registered.');
  }
  if (!program.hrd_corp_claimable) {
    readiness_issues.push('This program is not marked as HRD Corp claimable.');
  }

  // Get scheme guidance
  let scheme_guidance = null;
  if (program.hrd_corp_scheme) {
    scheme_guidance = await prisma.hrdCorpGuidanceRule.findUnique({
      where: { scheme_code: program.hrd_corp_scheme },
    });
  }

  // If no specific scheme, get default SBL_KHAS
  if (!scheme_guidance) {
    scheme_guidance = await prisma.hrdCorpGuidanceRule.findUnique({
      where: { scheme_code: 'SBL_KHAS' },
    });
  }

  // Check document availability from enquiries/proposals
  const documents_from_provider: Array<{ item: string; available: boolean; source: string | null }> = [];

  if (scheme_guidance) {
    const requiredDocs = scheme_guidance.required_documents as Array<{
      item: string;
      source: string;
      mandatory: boolean;
    }>;

    for (const doc of requiredDocs) {
      if (doc.source === 'provider') {
        // Check if we have documents from enquiry replies
        const hasFromEnquiry = await prisma.enquiryReply.findFirst({
          where: {
            enquiry: {
              requester_id: userId,
              program_id: programId,
            },
            attachments: { not: '[]' },
          },
        });

        documents_from_provider.push({
          item: doc.item,
          available: !!hasFromEnquiry,
          source: hasFromEnquiry ? 'enquiry reply' : null,
        });
      }
    }
  }

  return {
    program_info: {
      title: program.title,
      provider_name: program.provider.provider_name,
      delivery_mode: program.delivery_mode,
      duration_days: program.duration_days,
      duration_hours: program.duration_hours,
      fee_per_pax: program.fee_per_pax,
      fee_per_group: program.fee_per_group,
      program_type: program.program_type,
      objective: program.objective,
      target_group: program.target_group,
      hrd_corp_claimable: program.hrd_corp_claimable,
      hrd_corp_scheme: program.hrd_corp_scheme,
      hrd_corp_program_id: program.hrd_corp_program_id,
      provider_hrd_corp_registered: program.provider.hrd_corp_registered_provider,
      provider_hrd_corp_id: program.provider.hrd_corp_provider_id,
    },
    employer_readiness: {
      is_hrd_corp_registered: employer.hrd_corp_registered,
      has_active_levy: Number(employer.hrd_corp_levy_balance) > 0,
      levy_balance: employer.hrd_corp_levy_balance,
      readiness_issues,
    },
    scheme_guidance: scheme_guidance
      ? {
          scheme_name: scheme_guidance.scheme_name,
          scheme_code: scheme_guidance.scheme_code,
          description: scheme_guidance.description,
          eligibility_criteria: scheme_guidance.eligibility_criteria,
          required_documents: scheme_guidance.required_documents,
          process_steps: scheme_guidance.process_steps,
          useful_links: scheme_guidance.useful_links,
          notes: scheme_guidance.notes,
        }
      : null,
    document_availability: documents_from_provider,
  };
}

// ---- Create Checklist ----

export async function createChecklist(userId: string, input: CreateChecklistInput) {
  const employerId = await getEmployerId(userId);

  const rule = await prisma.hrdCorpGuidanceRule.findUnique({
    where: { scheme_code: input.scheme_code },
  });
  if (!rule) throw AppError.notFound('HRD Corp scheme not found');

  const requiredDocs = rule.required_documents as Array<{
    item: string;
    source: string;
    mandatory: boolean;
  }>;

  // Build checklist items with initial status
  const checklist_items = requiredDocs.map((doc) => ({
    item: doc.item,
    source: doc.source,
    mandatory: doc.mandatory,
    status: 'pending',
    document_url: null,
    received_at: null,
    notes: '',
  }));

  const checklist = await prisma.hrdCorpChecklist.create({
    data: {
      employer_id: employerId,
      program_id: input.program_id,
      proposal_id: input.proposal_id,
      enquiry_id: input.enquiry_id,
      scheme_code: input.scheme_code,
      checklist_items,
      overall_readiness_pct: 0,
      status: 'in_progress',
    },
  });

  return checklist;
}

// ---- List Checklists ----

export async function listChecklists(userId: string) {
  const employerId = await getEmployerId(userId);

  const checklists = await prisma.hrdCorpChecklist.findMany({
    where: { employer_id: employerId },
    orderBy: { created_at: 'desc' },
    select: {
      checklist_id: true,
      scheme_code: true,
      overall_readiness_pct: true,
      status: true,
      created_at: true,
      rule: { select: { scheme_name: true } },
    },
  });

  // Get program/proposal titles for context
  const enriched = await Promise.all(
    checklists.map(async (c) => {
      let context_title = '';
      // We need the raw checklist to get program_id
      const full = await prisma.hrdCorpChecklist.findUnique({
        where: { checklist_id: c.checklist_id },
        select: { program_id: true, proposal_id: true },
      });

      if (full?.program_id) {
        const program = await prisma.trainingProgram.findUnique({
          where: { program_id: full.program_id },
          select: { title: true, provider: { select: { provider_name: true } } },
        });
        if (program) context_title = `${program.title} — ${program.provider.provider_name}`;
      }

      return {
        ...c,
        scheme_name: c.rule.scheme_name,
        context_title,
        rule: undefined,
      };
    }),
  );

  return enriched;
}

// ---- Get Checklist Detail ----

export async function getChecklistDetail(userId: string, checklistId: string) {
  const employerId = await getEmployerId(userId);

  const checklist = await prisma.hrdCorpChecklist.findUnique({
    where: { checklist_id: checklistId },
    include: {
      rule: true,
    },
  });

  if (!checklist) throw AppError.notFound('Checklist not found');
  if (checklist.employer_id !== employerId) throw AppError.forbidden('Not your checklist');

  return checklist;
}

// ---- Update Checklist Items ----

export async function updateChecklistItems(
  userId: string,
  checklistId: string,
  input: UpdateChecklistItemsInput,
) {
  const employerId = await getEmployerId(userId);

  const checklist = await prisma.hrdCorpChecklist.findUnique({
    where: { checklist_id: checklistId },
  });

  if (!checklist) throw AppError.notFound('Checklist not found');
  if (checklist.employer_id !== employerId) throw AppError.forbidden('Not your checklist');

  const existingItems = checklist.checklist_items as Array<Record<string, any>>;

  // Merge updates into existing items
  for (const update of input.items) {
    const existing = existingItems.find((i) => i.item === update.item);
    if (existing) {
      existing.status = update.status;
      if (update.notes !== undefined) existing.notes = update.notes;
      if (update.document_url !== undefined) existing.document_url = update.document_url;
      if (update.status === 'received' || update.status === 'completed') {
        existing.received_at = new Date().toISOString();
      }
    }
  }

  // Calculate readiness percentage
  const mandatoryItems = existingItems.filter((i) => i.mandatory !== false);
  const completedMandatory = mandatoryItems.filter(
    (i) => i.status === 'received' || i.status === 'completed' || i.status === 'not_applicable',
  );
  const readiness = mandatoryItems.length > 0
    ? Math.round((completedMandatory.length / mandatoryItems.length) * 100)
    : 0;

  const allMandatoryDone = readiness === 100;

  await prisma.hrdCorpChecklist.update({
    where: { checklist_id: checklistId },
    data: {
      checklist_items: existingItems,
      overall_readiness_pct: readiness,
      status: allMandatoryDone ? 'ready' : 'in_progress',
    },
  });

  return {
    checklist_id: checklistId,
    overall_readiness_pct: readiness,
    status: allMandatoryDone ? 'ready' : 'in_progress',
    items: existingItems,
  };
}

// ---- List All Schemes ----

export async function listSchemes() {
  return prisma.hrdCorpGuidanceRule.findMany({
    where: { status: 'active' },
    select: {
      scheme_name: true,
      scheme_code: true,
      description: true,
    },
    orderBy: { scheme_name: 'asc' },
  });
}
