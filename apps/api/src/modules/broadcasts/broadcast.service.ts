import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { calculateAcm, type AcmInput } from '../hrd-corp/acm-calculator.service.js';
import { sendEmail, proposalReceivedEmailHtml, proposalSelectedEmailHtml, newBroadcastEmailHtml } from '../../shared/helpers/email.js';
import { sendNotificationEmail } from '../notifications/notification.service.js';
import type {
  CreateBroadcastInput,
  ListBroadcastFeedInput,
  SubmitProposalInput,
} from '../../shared/validators/broadcast.validators.js';

// ---- Helpers ----

function formatBudgetRange(min: any, max: any): string | null {
  const hasMin = min != null && Number(min) > 0;
  const hasMax = max != null && Number(max) > 0;
  if (hasMin && hasMax) return `RM ${Number(min).toLocaleString()} – RM ${Number(max).toLocaleString()}`;
  if (hasMin) return `From RM ${Number(min).toLocaleString()}`;
  if (hasMax) return `Up to RM ${Number(max).toLocaleString()}`;
  return null;
}

async function getEmployerId(userId: string): Promise<string> {
  const profile = await prisma.employerProfile.findUnique({
    where: { user_id: userId },
    select: { employer_id: true },
  });
  if (!profile) throw AppError.notFound('Employer profile not found');
  return profile.employer_id;
}

async function getProviderId(userId: string): Promise<string> {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider profile not found');
  return provider.provider_id;
}

function calculateValueScore(
  proposal: { proposed_fee: number; value_add_offers: any },
  request: { budget_min: number | null; budget_max: number | null },
  provider: { quality_tier: string; average_rating: number; response_rate: number; total_completed_programs: number },
): number {
  let score = 0;

  // Fee fit (30%)
  if (request.budget_max) {
    const feeRatio = proposal.proposed_fee / Number(request.budget_max);
    if (feeRatio <= 1) score += (1 - feeRatio * 0.5) * 30;
    else score += Math.max(0, 30 - (feeRatio - 1) * 30);
  } else {
    score += 15; // no budget specified, neutral
  }

  // Provider quality tier (25%)
  const tierScores: Record<string, number> = { premium: 25, trusted: 18, verified: 12, unverified: 5 };
  score += tierScores[provider.quality_tier] || 5;

  // Track record (25%)
  const ratingScore = (Number(provider.average_rating) / 5) * 10;
  const responseScore = (Number(provider.response_rate) / 100) * 8;
  const experienceScore = Math.min(Number(provider.total_completed_programs) / 50, 1) * 7;
  score += ratingScore + responseScore + experienceScore;

  // Value-add offers (20%)
  const offers = Array.isArray(proposal.value_add_offers) ? proposal.value_add_offers : [];
  score += Math.min(offers.length * 5, 20);

  return Math.round(Math.min(score, 100));
}

// ---- Create Broadcast Request ----

export async function createBroadcast(userId: string, input: CreateBroadcastInput) {
  const employerId = await getEmployerId(userId);

  const broadcast = await prisma.trainingRequestBroadcast.create({
    data: {
      employer_id: employerId,
      ...input,
      response_deadline: new Date(input.response_deadline),
      status: 'open',
    },
  });

  // Notify all active providers (async, non-blocking)
  notifyProviders(broadcast.request_id, input.title).catch(() => {});

  return broadcast;
}

async function notifyProviders(requestId: string, title: string) {
  const providers = await prisma.trainingProvider.findMany({
    where: { status: 'active' },
    select: { user_id: true, provider_name: true, contact_email: true },
  });

  if (providers.length === 0) return;

  await prisma.notification.createMany({
    data: providers.map((p) => ({
      user_id: p.user_id,
      type: 'broadcast_new',
      title: 'New training request',
      message: `An employer is looking for: "${title}"`,
      reference_id: requestId,
      reference_type: 'broadcast_request',
      action_url: `/provider/broadcasts/${requestId}`,
    })),
  });

  // Send emails to providers with contact email
  for (const p of providers) {
    if (p.contact_email) {
      sendEmail({ to: p.contact_email, subject: `New Training Request: ${title}`, html: newBroadcastEmailHtml(p.provider_name || 'Provider', title) }).catch(() => {});
    }
  }
}

// ---- List Employer's Broadcast Requests ----

export async function listMyBroadcasts(userId: string, page: number = 1, limit: number = 20) {
  const employerId = await getEmployerId(userId);

  const where = { employer_id: employerId };
  const [requests, total] = await Promise.all([
    prisma.trainingRequestBroadcast.findMany({
      where,
      select: {
        request_id: true,
        title: true,
        description: true,
        participant_count: true,
        preferred_dates: true,
        training_days: true,
        training_type: true,
        budget_min: true,
        budget_max: true,
        response_deadline: true,
        total_proposals: true,
        awarded_provider_id: true,
        status: true,
        created_at: true,
        proposals: {
          where: { status: 'selected' },
          select: {
            proposal_id: true,
            proposed_fee: true,
            proposed_schedule: true,
            proposed_duration: true,
            proposal_message: true,
            provider: { select: { provider_id: true, provider_name: true } },
            program: { select: { program_id: true, title: true } },
          },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trainingRequestBroadcast.count({ where }),
  ]);

  return {
    data: requests.map((r) => {
      const selected = r.proposals?.[0] || null;
      return {
        ...r,
        budget_range: formatBudgetRange(r.budget_min, r.budget_max),
        selected_proposal: selected ? {
          proposal_id: selected.proposal_id,
          proposed_fee: selected.proposed_fee,
          proposed_schedule: selected.proposed_schedule,
          proposed_duration: selected.proposed_duration,
          provider_name: selected.provider?.provider_name,
          program_title: selected.program?.title,
        } : null,
        proposals: undefined,
      };
    }),
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

// ---- Get Broadcast Detail (employer view — includes proposals) ----

export async function getBroadcastDetail(userId: string, requestId: string) {
  const employerId = await getEmployerId(userId);

  const broadcast = await prisma.trainingRequestBroadcast.findUnique({
    where: { request_id: requestId },
    include: {
      proposals: {
        include: {
          provider: {
            select: {
              provider_id: true,
              provider_name: true,
              logo_url: true,
              quality_tier: true,
              average_rating: true,
            },
          },
        },
        orderBy: { ai_value_score: 'desc' },
      },
    },
  });

  if (!broadcast) throw AppError.notFound('Broadcast request not found');
  if (broadcast.employer_id !== employerId) throw AppError.forbidden('Not your request');

  return broadcast;
}

// ---- Provider Feed (list open requests) ----

export async function getBroadcastFeed(userId: string, input: ListBroadcastFeedInput) {
  const providerId = await getProviderId(userId);

  const where: any = {
    status: 'open',
    response_deadline: { gte: new Date() },
  };

  if (input.industry) where.industry_context = { contains: input.industry, mode: 'insensitive' };
  if (input.preferred_mode && input.preferred_mode !== 'any') where.preferred_mode = input.preferred_mode;
  if (input.location) where.preferred_location = { contains: input.location, mode: 'insensitive' };
  if (input.min_budget) where.budget_max = { gte: input.min_budget };
  if (input.max_budget) where.budget_min = { lte: input.max_budget };
  if (input.skill_topic) {
    where.OR = [
      { title: { contains: input.skill_topic, mode: 'insensitive' } },
      { description: { contains: input.skill_topic, mode: 'insensitive' } },
      { target_skills: { has: input.skill_topic } },
    ];
  }

  let orderBy: any;
  switch (input.sort_by) {
    case 'deadline':
      orderBy = { response_deadline: 'asc' };
      break;
    case 'newest':
    default:
      orderBy = { created_at: 'desc' };
      break;
  }

  const [requests, total] = await Promise.all([
    prisma.trainingRequestBroadcast.findMany({
      where,
      select: {
        request_id: true,
        title: true,
        description: true,
        target_audience: true,
        participant_count: true,
        training_days: true,
        training_type: true,
        preferred_mode: true,
        preferred_location: true,
        budget_min: true,
        budget_max: true,
        target_skills: true,
        response_deadline: true,
        total_proposals: true,
        status: true,
        created_at: true,
        employer: {
          select: {
            company_name: true,
            industry: true,
            company_size: true,
          },
        },
      },
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.trainingRequestBroadcast.count({ where }),
  ]);

  // Check if provider already submitted proposal for each request
  const requestIds = requests.map((r) => r.request_id);
  const myProposals = await prisma.tpProposal.findMany({
    where: { provider_id: providerId, request_id: { in: requestIds } },
    select: { request_id: true },
  });
  const submittedSet = new Set(myProposals.map((p) => p.request_id));

  const now = new Date();
  return {
    data: requests.map((r) => ({
      ...r,
      description: r.description.slice(0, 300),
      budget_range: formatBudgetRange(r.budget_min, r.budget_max),
      days_remaining: Math.ceil(
        (new Date(r.response_deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      my_proposal_submitted: submittedSet.has(r.request_id),
    })),
    pagination: { total, page: input.page, limit: input.limit, total_pages: Math.ceil(total / input.limit) },
  };
}

// ---- Provider: Get Request Detail ----

export async function getRequestDetailForProvider(userId: string, requestId: string) {
  const providerId = await getProviderId(userId);

  const request = await prisma.trainingRequestBroadcast.findUnique({
    where: { request_id: requestId },
    include: {
      employer: { select: { company_name: true, industry: true, company_size: true } },
    },
  });

  if (!request) throw AppError.notFound('Request not found');

  // Get provider's own proposal if exists
  const myProposal = await prisma.tpProposal.findUnique({
    where: { request_id_provider_id: { request_id: requestId, provider_id: providerId } },
  });

  return { ...request, my_proposal: myProposal };
}

// ---- Close Broadcast ----

export async function closeBroadcast(userId: string, requestId: string, reason?: string) {
  const employerId = await getEmployerId(userId);

  const broadcast = await prisma.trainingRequestBroadcast.findUnique({
    where: { request_id: requestId },
  });
  if (!broadcast) throw AppError.notFound('Request not found');
  if (broadcast.employer_id !== employerId) throw AppError.forbidden('Not your request');

  await prisma.trainingRequestBroadcast.update({
    where: { request_id: requestId },
    data: { status: 'closed' },
  });

  // Notify providers who submitted proposals
  const proposals = await prisma.tpProposal.findMany({
    where: { request_id: requestId },
    include: { provider: { select: { user_id: true } } },
  });

  if (proposals.length > 0) {
    await prisma.notification.createMany({
      data: proposals.map((p) => ({
        user_id: p.provider.user_id,
        type: 'proposal_rejected',
        title: 'Training request closed',
        message: `The training request "${broadcast.title}" has been closed.`,
        reference_id: requestId,
        reference_type: 'broadcast_request',
      })),
    });
  }

  return { request_id: requestId, status: 'closed' };
}

// ============================================================
// PROPOSALS
// ============================================================

// ---- Submit Proposal ----

export async function submitProposal(userId: string, requestId: string, input: SubmitProposalInput) {
  const providerId = await getProviderId(userId);

  const request = await prisma.trainingRequestBroadcast.findUnique({
    where: { request_id: requestId },
  });

  if (!request) throw AppError.notFound('Request not found');
  if (request.status !== 'open') throw AppError.badRequest('Request is no longer open');
  if (new Date() > new Date(request.response_deadline)) {
    throw AppError.badRequest('Response deadline has passed');
  }

  // Check duplicate
  const existing = await prisma.tpProposal.findUnique({
    where: { request_id_provider_id: { request_id: requestId, provider_id: providerId } },
  });
  if (existing) throw AppError.conflict('You have already submitted a proposal for this request');

  // Get provider for value scoring
  const provider = await prisma.trainingProvider.findUnique({
    where: { provider_id: providerId },
    select: { quality_tier: true, average_rating: true, response_rate: true, total_completed_programs: true },
  });

  const aiValueScore = provider
    ? calculateValueScore(
        { proposed_fee: input.proposed_fee, value_add_offers: input.value_add_offers },
        { budget_min: request.budget_min ? Number(request.budget_min) : null, budget_max: request.budget_max ? Number(request.budget_max) : null },
        {
          quality_tier: provider.quality_tier,
          average_rating: Number(provider.average_rating),
          response_rate: Number(provider.response_rate),
          total_completed_programs: provider.total_completed_programs,
        },
      )
    : null;

  const proposal = await prisma.tpProposal.create({
    data: {
      request_id: requestId,
      provider_id: providerId,
      program_id: input.program_id,
      proposal_message: input.proposal_message,
      fee_per_pax: input.fee_per_pax,
      fee_per_group: input.fee_per_group,
      proposed_fee: input.proposed_fee,
      fee_breakdown: input.fee_breakdown,
      proposed_schedule: input.proposed_schedule,
      proposed_duration: input.proposed_duration,
      trainer_details: input.trainer_details,
      value_add_offers: input.value_add_offers,
      attachments: input.attachments,
      ai_value_score: aiValueScore,
      status: 'submitted',
    },
  });

  // Increment total proposals
  await prisma.trainingRequestBroadcast.update({
    where: { request_id: requestId },
    data: { total_proposals: { increment: 1 } },
  });

  // Notify employer
  const employer = await prisma.employerProfile.findUnique({
    where: { employer_id: request.employer_id },
    select: { user_id: true },
  });

  if (employer) {
    await prisma.notification.create({
      data: {
        user_id: employer.user_id,
        type: 'proposal_received',
        title: 'New proposal received',
        message: `A training provider submitted a proposal for "${request.title}"`,
        reference_id: proposal.proposal_id,
        reference_type: 'proposal',
        action_url: `/employer/broadcasts/${requestId}`,
      },
    });

    // Send email notification (fire and forget)
    sendNotificationEmail(
      employer.user_id,
      'proposal_received',
      `You received a new proposal for "${request.title}"`,
      `<h1>New Proposal Received</h1><p>A training provider submitted a proposal for your training request: <strong>${request.title}</strong>.</p><p>Log in to review the proposal, compare with others, and select the best fit for your team.</p>`,
    ).catch(() => {});
  }

  return proposal;
}

// ---- Get Proposal Detail ----

export async function getProposalDetail(userId: string, proposalId: string) {
  const proposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    include: {
      request: { select: { request_id: true, title: true, employer_id: true } },
      enquiry: { select: { enquiry_id: true, subject: true, requester_id: true } },
      provider: {
        select: {
          provider_id: true,
          provider_name: true,
          logo_url: true,
          quality_tier: true,
          average_rating: true,
          total_completed_programs: true,
          response_rate: true,
          user_id: true,
        },
      },
      program: {
        select: { title: true, description: true, objective: true, delivery_mode: true },
      },
    },
  });

  if (!proposal) throw AppError.notFound('Proposal not found');

  // Access check: employer (request owner or enquiry requester) or provider (proposal owner)
  let isEmployer = false;
  if (proposal.request?.employer_id) {
    const employer = await prisma.employerProfile.findUnique({
      where: { employer_id: proposal.request.employer_id },
      select: { user_id: true },
    });
    isEmployer = employer?.user_id === userId;
  }
  if (!isEmployer && proposal.enquiry?.requester_id) {
    isEmployer = proposal.enquiry.requester_id === userId;
  }

  const isProvider = proposal.provider.user_id === userId;

  if (!isEmployer && !isProvider) throw AppError.forbidden('Access denied');

  return proposal;
}

// ---- Get Proposal Detail (extended for PDF) ----

export async function getProposalDetailForPdf(userId: string, proposalId: string) {
  const proposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    include: {
      request: {
        select: {
          request_id: true,
          title: true,
          description: true,
          employer_id: true,
          participant_count: true,
          preferred_mode: true,
          preferred_location: true,
          budget_min: true,
          budget_max: true,
        },
      },
      enquiry: { select: { enquiry_id: true, subject: true, requester_id: true } },
      provider: {
        select: {
          provider_id: true,
          provider_name: true,
          logo_url: true,
          quality_tier: true,
          average_rating: true,
          total_completed_programs: true,
          response_rate: true,
          user_id: true,
        },
      },
      program: {
        select: { title: true, description: true, objective: true, delivery_mode: true },
      },
    },
  });

  if (!proposal) throw AppError.notFound('Proposal not found');

  // Access check: employer (request owner or enquiry requester) or provider (proposal owner)
  let isEmployer = false;
  if (proposal.request?.employer_id) {
    const employer = await prisma.employerProfile.findUnique({
      where: { employer_id: proposal.request.employer_id },
      select: { user_id: true },
    });
    isEmployer = employer?.user_id === userId;
  }
  if (!isEmployer && proposal.enquiry?.requester_id) {
    isEmployer = proposal.enquiry.requester_id === userId;
  }
  const isProvider = proposal.provider.user_id === userId;

  if (!isEmployer && !isProvider) throw AppError.forbidden('Access denied');

  return proposal;
}

// ---- Employer Actions on Proposals ----

export async function shortlistProposal(userId: string, proposalId: string) {
  const { proposal, broadcast } = await verifyEmployerOwnsProposal(userId, proposalId);

  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'shortlisted' },
  });

  await prisma.notification.create({
    data: {
      user_id: proposal.provider.user_id,
      type: 'proposal_shortlisted',
      title: 'Your proposal has been shortlisted!',
      message: `Your proposal for "${broadcast.title}" has been shortlisted.`,
      reference_id: proposalId,
      reference_type: 'proposal',
      action_url: `/provider/proposals`,
    },
  });

  return { proposal_id: proposalId, status: 'shortlisted' };
}

export async function selectProposal(userId: string, proposalId: string) {
  const { proposal, broadcast } = await verifyEmployerOwnsProposal(userId, proposalId);

  // Get full proposal details for training plan
  const fullProposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    include: {
      provider: { select: { provider_id: true, provider_name: true, user_id: true } },
    },
  });

  const isBroadcastProposal = !!proposal.request;

  // Select this proposal
  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'selected' },
  });

  // Award the broadcast (only for broadcast proposals)
  if (isBroadcastProposal) {
    await prisma.trainingRequestBroadcast.update({
      where: { request_id: broadcast.request_id },
      data: { status: 'awarded', awarded_provider_id: proposal.provider_id },
    });
  }

  // Increment provider awards
  await prisma.trainingProvider.update({
    where: { provider_id: proposal.provider_id },
    data: { awards_won: { increment: 1 } },
  });

  // ---- Add to Training Plan ----
  const employerId = isBroadcastProposal ? broadcast.employer_id : await getEmployerId(userId);
  const employer = await prisma.employerProfile.findUnique({
    where: { employer_id: employerId },
    select: { employer_id: true },
  });

  if (employer) {
    const currentYear = new Date().getFullYear();

    // Find or create training plan for current year
    let plan = await prisma.annualTrainingPlan.findUnique({
      where: { employer_id_year: { employer_id: employer.employer_id, year: currentYear } },
    });

    if (!plan) {
      plan = await prisma.annualTrainingPlan.create({
        data: {
          employer_id: employer.employer_id,
          year: currentYear,
          total_budget: 0,
          departments: [],
          planned_items: [],
          status: 'active',
        },
      });
    }

    // Add selected proposal as a planned item
    const existingItems = Array.isArray(plan.planned_items) ? (plan.planned_items as any[]) : [];
    const alreadyAdded = existingItems.some((item: any) => item.proposal_id === proposalId);

    if (!alreadyAdded) {
      // Use program title if available, then broadcast/enquiry title as fallback
      const programTitle = fullProposal?.program_id
        ? (await prisma.trainingProgram.findUnique({ where: { program_id: fullProposal.program_id }, select: { title: true } }))?.title
        : null;
      const itemTitle = programTitle || broadcast.title || 'Training Program';

      const newItem = {
        proposal_id: proposalId,
        request_title: itemTitle,
        provider_name: fullProposal?.provider?.provider_name || 'Provider',
        provider_id: proposal.provider_id,
        program_id: fullProposal?.program_id || null,
        proposed_fee: fullProposal?.proposed_fee ? Number(fullProposal.proposed_fee) : 0,
        proposed_schedule: fullProposal?.proposed_schedule || '',
        proposed_duration: fullProposal?.proposed_duration || '',
        status: 'upcoming',
        added_at: new Date().toISOString(),
      };

      const updatedItems = [...existingItems, newItem];
      const totalCost = updatedItems.reduce((sum: number, i: any) => sum + (i.proposed_fee || 0), 0);

      await prisma.annualTrainingPlan.update({
        where: { plan_id: plan.plan_id },
        data: {
          planned_items: updatedItems,
          total_budget: totalCost,
        },
      });
    }
  }

  // ---- HRD Corp Estimate Notification to Employer ----
  const fullBroadcast = isBroadcastProposal
    ? await prisma.trainingRequestBroadcast.findUnique({ where: { request_id: broadcast.request_id } })
    : null;

  const employerUser = await prisma.employerProfile.findUnique({
    where: { employer_id: employerId },
    select: { user_id: true, hrd_corp_registered: true },
  });

  if (employerUser) {
    const totalFee = fullProposal?.proposed_fee ? Number(fullProposal.proposed_fee) : 0;
    const paxCount = fullBroadcast?.participant_count || 1;
    const isInHouse = fullBroadcast?.training_type === 'in_house';
    const durationDays = fullBroadcast?.training_days || (fullProposal?.proposed_duration ? parseInt(fullProposal.proposed_duration.replace(/\D/g, ''), 10) || 1 : 1);

    // Estimate HRD Corp claimable using ACM logic
    const acmInput: AcmInput = {
      training_type: isInHouse ? 'in_house' : 'public_local',
      trainer_type: 'external',
      venue: 'external_premises',
      course_category: 'general',
      duration_type: durationDays > 0 ? 'full_day' : 'half_day',
      num_days: durationDays,
      num_trainees: paxCount,
      allowance_type: 'meal',
    };

    const acmResult = calculateAcm(acmInput);
    const claimable = Math.min(acmResult.net_claimable, totalFee);
    const outOfPocket = Math.max(0, totalFee - claimable);

    const fmtRM = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Build notification message
    let hrdMessage = `You've selected "${broadcast.title}" from ${fullProposal?.provider?.provider_name || 'a provider'} at ${fmtRM(totalFee)}.`;

    if (employerUser.hrd_corp_registered) {
      hrdMessage += `\n\nHRD Corp Estimate (ACM):\n`;
      hrdMessage += `- Total Training Cost: ${fmtRM(totalFee)}\n`;
      hrdMessage += `- Estimated HRD Corp Claimable: ${fmtRM(claimable)}\n`;
      hrdMessage += `- Estimated Out-of-Pocket: ${fmtRM(outOfPocket)}\n\n`;
      hrdMessage += `Cost items: ${acmResult.cost_items.map((i) => `${i.item}: ${fmtRM(i.amount)}`).join(', ')}.\n`;
      hrdMessage += `Note: This is an estimate based on HRD Corp ACM (Aug 2025) for general course, external trainer, full day. Actual claimable amount is subject to HRD Corp approval. Attendance must be ≥75%.`;
    } else {
      hrdMessage += ` This amount is payable directly to the training provider.`;
    }

    // Update levy utilization if HRD Corp registered
    if (employerUser.hrd_corp_registered && claimable > 0) {
      const currentYear = new Date().getFullYear();
      const levyRecord = await prisma.levyUtilizationRecord.findUnique({
        where: { employer_id_year: { employer_id: employerId, year: currentYear } },
      });
      if (levyRecord) {
        const newUtilized = Number(levyRecord.utilized_amount) + claimable;
        const newRemaining = Math.max(0, Number(levyRecord.total_levy) - newUtilized);
        const newPct = Number(levyRecord.total_levy) > 0 ? Math.round((newUtilized / Number(levyRecord.total_levy)) * 100) : 0;
        await prisma.levyUtilizationRecord.update({
          where: { employer_id_year: { employer_id: broadcast.employer_id, year: currentYear } },
          data: { utilized_amount: newUtilized, remaining_amount: newRemaining, utilization_percentage: newPct },
        });
      }
    }

    await prisma.notification.create({
      data: {
        user_id: employerUser.user_id,
        type: 'proposal_selected',
        title: employerUser.hrd_corp_registered
          ? `Training Selected — HRD Corp Estimate: ${fmtRM(claimable)} claimable`
          : `Training Selected — ${broadcast.title}`,
        message: hrdMessage,
        reference_id: proposalId,
        reference_type: 'proposal',
        action_url: `/employer/broadcasts/${broadcast.request_id}`,
      },
    });
  }

  // Notify selected provider
  await prisma.notification.create({
    data: {
      user_id: proposal.provider.user_id,
      type: 'proposal_selected',
      title: 'Congratulations! Your proposal was selected!',
      message: `You have been selected for "${broadcast.title}". The employer will be in touch.`,
      reference_id: proposalId,
      reference_type: 'proposal',
      action_url: `/provider/proposals`,
    },
  });

  // Notify all other providers with proposals (broadcast only)
  if (isBroadcastProposal) {
    const otherProposals = await prisma.tpProposal.findMany({
      where: {
        request_id: broadcast.request_id,
        proposal_id: { not: proposalId },
        status: { in: ['submitted', 'shortlisted'] },
      },
      include: { provider: { select: { user_id: true } } },
    });

    if (otherProposals.length > 0) {
      await prisma.notification.createMany({
        data: otherProposals.map((p) => ({
          user_id: p.provider.user_id,
          type: 'proposal_rejected',
          title: 'Training request awarded',
          message: `The request "${broadcast.title}" has been awarded to another provider.`,
          reference_id: p.proposal_id,
          reference_type: 'proposal',
        })),
      });
    }
  }

  return { proposal_id: proposalId, status: 'selected' };
}

export async function rejectProposal(userId: string, proposalId: string, reason?: string) {
  const { proposal, broadcast } = await verifyEmployerOwnsProposal(userId, proposalId);

  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'rejected', employer_notes: reason },
  });

  await prisma.notification.create({
    data: {
      user_id: proposal.provider.user_id,
      type: 'proposal_rejected',
      title: 'Proposal not selected',
      message: `Your proposal for "${broadcast.title}" was not selected.`,
      reference_id: proposalId,
      reference_type: 'proposal',
    },
  });

  return { proposal_id: proposalId, status: 'rejected' };
}

// ---- Employer: Cancel a Selected Proposal ----

export async function cancelSelectedProposal(userId: string, proposalId: string) {
  const { proposal, broadcast } = await verifyEmployerOwnsProposal(userId, proposalId);

  if (proposal.status !== 'selected') {
    throw AppError.badRequest('Can only cancel proposals that are selected');
  }

  // Get full proposal for fee details
  const fullProposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    include: { provider: { select: { user_id: true, provider_name: true } } },
  });

  // 1. Update proposal status to cancelled
  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'cancelled' },
  });

  // 2. Reopen the broadcast
  await prisma.trainingRequestBroadcast.update({
    where: { request_id: broadcast.request_id },
    data: { status: 'open', awarded_provider_id: null },
  });

  // 3. Decrement provider awards
  if (proposal.provider_id) {
    await prisma.trainingProvider.update({
      where: { provider_id: proposal.provider_id },
      data: { awards_won: { decrement: 1 } },
    }).catch(() => {});
  }

  // 4. Remove from training plan
  const currentYear = new Date().getFullYear();
  const employer = await prisma.employerProfile.findUnique({
    where: { employer_id: broadcast.employer_id },
    select: { employer_id: true },
  });

  if (employer) {
    const plan = await prisma.annualTrainingPlan.findUnique({
      where: { employer_id_year: { employer_id: employer.employer_id, year: currentYear } },
    });

    if (plan) {
      const items = Array.isArray(plan.planned_items) ? (plan.planned_items as any[]) : [];
      const updatedItems = items.filter((item: any) => item.proposal_id !== proposalId);
      const totalCost = updatedItems.reduce((sum: number, i: any) => sum + (i.proposed_fee || 0), 0);

      await prisma.annualTrainingPlan.update({
        where: { plan_id: plan.plan_id },
        data: { planned_items: updatedItems, total_budget: totalCost },
      });
    }

    // 5. Refund levy utilization
    const totalFee = fullProposal?.proposed_fee ? Number(fullProposal.proposed_fee) : 0;
    const fullBroadcast = await prisma.trainingRequestBroadcast.findUnique({
      where: { request_id: broadcast.request_id },
    });

    if (fullBroadcast) {
      const isInHouse = fullBroadcast.training_type === 'in_house';
      const durationDays = fullBroadcast.training_days || 1;
      const paxCount = fullBroadcast.participant_count || 1;

      const acmInput: AcmInput = {
        training_type: isInHouse ? 'in_house' : 'public_local',
        trainer_type: 'external',
        venue: 'external_premises',
        course_category: 'general',
        duration_type: durationDays > 0 ? 'full_day' : 'half_day',
        num_days: durationDays,
        num_trainees: paxCount,
        allowance_type: 'meal',
      };

      const acmResult = calculateAcm(acmInput);
      const claimable = Math.min(acmResult.net_claimable, totalFee);

      const levyRecord = await prisma.levyUtilizationRecord.findUnique({
        where: { employer_id_year: { employer_id: employer.employer_id, year: currentYear } },
      });

      if (levyRecord && claimable > 0) {
        const newUtilized = Math.max(0, Number(levyRecord.utilized_amount) - claimable);
        const newRemaining = Number(levyRecord.total_levy) - newUtilized;
        const newPct = Number(levyRecord.total_levy) > 0 ? Math.round((newUtilized / Number(levyRecord.total_levy)) * 100) : 0;
        await prisma.levyUtilizationRecord.update({
          where: { employer_id_year: { employer_id: employer.employer_id, year: currentYear } },
          data: { utilized_amount: newUtilized, remaining_amount: newRemaining, utilization_percentage: newPct },
        });
      }
    }
  }

  // 6. Notify the TP
  if (fullProposal?.provider?.user_id) {
    await prisma.notification.create({
      data: {
        user_id: fullProposal.provider.user_id,
        type: 'proposal_rejected',
        title: 'Training cancelled by employer',
        message: `The employer has cancelled the training "${broadcast.title}". The broadcast is now open again for proposals.`,
        reference_id: proposalId,
        reference_type: 'proposal',
        action_url: '/provider/proposals',
      },
    });
  }

  return { proposal_id: proposalId, status: 'cancelled' };
}

// ---- Employer: Dismiss/Archive Proposal ----

export async function dismissProposal(userId: string, proposalId: string) {
  await verifyEmployerOwnsProposal(userId, proposalId);

  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'dismissed' },
  });

  return { proposal_id: proposalId, status: 'dismissed' };
}

// ---- Provider: Withdraw Proposal ----

export async function withdrawProposal(userId: string, proposalId: string) {
  const providerId = await getProviderId(userId);

  const proposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    select: { provider_id: true, request_id: true, status: true },
  });

  if (!proposal) throw AppError.notFound('Proposal not found');
  if (proposal.provider_id !== providerId) throw AppError.forbidden('Not your proposal');
  if (proposal.status !== 'submitted') throw AppError.badRequest('Can only withdraw submitted proposals');

  await prisma.tpProposal.update({
    where: { proposal_id: proposalId },
    data: { status: 'withdrawn' },
  });

  await prisma.trainingRequestBroadcast.update({
    where: { request_id: proposal.request_id },
    data: { total_proposals: { decrement: 1 } },
  });

  return { proposal_id: proposalId, status: 'withdrawn' };
}

// ---- Provider: My Proposals ----

export async function listMyProposals(userId: string, status?: string, page: number = 1, limit: number = 20) {
  const providerId = await getProviderId(userId);

  const where: any = { provider_id: providerId };
  if (status) where.status = status;

  const [proposals, total, stats] = await Promise.all([
    prisma.tpProposal.findMany({
      where,
      select: {
        proposal_id: true,
        request_id: true,
        enquiry_id: true,
        proposed_fee: true,
        ai_value_score: true,
        status: true,
        created_at: true,
        request: {
          select: {
            request_id: true,
            title: true,
            participant_count: true,
            budget_min: true,
            budget_max: true,
            employer: { select: { company_name: true } },
          },
        },
        enquiry: {
          select: {
            enquiry_id: true,
            subject: true,
            requester: { select: { full_name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tpProposal.count({ where }),
    prisma.tpProposal.groupBy({
      by: ['status'],
      where: { provider_id: providerId },
      _count: true,
    }),
  ]);

  const statsSummary: Record<string, number> = {};
  for (const s of stats) {
    statsSummary[s.status] = s._count;
  }

  const totalSubmitted = Object.values(statsSummary).reduce((a, b) => a + b, 0);
  const selected = statsSummary['selected'] || 0;

  return {
    data: proposals,
    stats: {
      total_submitted: totalSubmitted,
      shortlisted: statsSummary['shortlisted'] || 0,
      selected,
      rejected: statsSummary['rejected'] || 0,
      win_rate: totalSubmitted > 0 ? Math.round((selected / totalSubmitted) * 100) : 0,
    },
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

// ---- Helper: verify employer owns the proposal's request ----

async function verifyEmployerOwnsProposal(userId: string, proposalId: string) {
  const employerId = await getEmployerId(userId);

  const proposal = await prisma.tpProposal.findUnique({
    where: { proposal_id: proposalId },
    include: {
      request: { select: { request_id: true, employer_id: true, title: true } },
      enquiry: { select: { enquiry_id: true, subject: true, requester_id: true, provider_id: true } },
      provider: { select: { provider_id: true, user_id: true } },
    },
  });

  if (!proposal) throw AppError.notFound('Proposal not found');

  // Check ownership: either via broadcast request or via enquiry
  if (proposal.request) {
    if (proposal.request.employer_id !== employerId) throw AppError.forbidden('Not your request');
  } else if (proposal.enquiry) {
    if (proposal.enquiry.requester_id !== userId) throw AppError.forbidden('Not your enquiry');
  } else {
    throw AppError.forbidden('Access denied');
  }

  // Return broadcast-like object for compatibility
  const broadcast = proposal.request || {
    request_id: proposal.enquiry?.enquiry_id || '',
    employer_id: employerId,
    title: proposal.enquiry?.subject || 'Enquiry Proposal',
  };

  return { proposal, broadcast };
}
