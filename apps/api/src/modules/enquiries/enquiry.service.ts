import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendNotificationEmail } from '../notifications/notification.service.js';
import type {
  CreateEnquiryInput,
  ReplyEnquiryInput,
  ListEnquiriesInput,
} from '../../shared/validators/enquiry.validators.js';

// ---- Create Enquiry ----

export async function createEnquiry(userId: string, input: CreateEnquiryInput) {
  // Verify provider exists
  const provider = await prisma.trainingProvider.findUnique({
    where: { provider_id: input.provider_id },
    select: { provider_id: true, user_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  // Verify program if provided
  if (input.program_id) {
    const program = await prisma.trainingProgram.findUnique({
      where: { program_id: input.program_id },
      select: { status: true, provider_id: true },
    });
    if (!program || program.status !== 'published') {
      throw AppError.notFound('Program not found');
    }
    if (program.provider_id !== input.provider_id) {
      throw AppError.badRequest('Program does not belong to this provider');
    }
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      requester_id: userId,
      ...input,
      status: 'sent',
    },
  });

  // Increment program enquiry count
  if (input.program_id) {
    await prisma.trainingProgram.update({
      where: { program_id: input.program_id },
      data: { enquiry_count: { increment: 1 } },
    }).catch(() => {});
  }

  // Log activity
  await prisma.userActivity.create({
    data: {
      user_id: userId,
      activity_type: 'enquire',
      target_id: input.program_id || input.provider_id,
      target_type: input.program_id ? 'program' : 'provider',
    },
  }).catch(() => {});

  // Notify provider
  await prisma.notification.create({
    data: {
      user_id: provider.user_id,
      type: 'enquiry_received',
      title: 'New enquiry received',
      message: `You received a new ${input.enquiry_type.replace('_', ' ')} enquiry: "${input.subject}"`,
      reference_id: enquiry.enquiry_id,
      reference_type: 'enquiry',
      action_url: `/provider/enquiries/${enquiry.enquiry_id}`,
    },
  });

  return enquiry;
}

// ---- List Sent Enquiries (requester view) ----

export async function listSentEnquiries(userId: string, input: ListEnquiriesInput) {
  const where: any = { requester_id: userId };
  if (input.status) where.status = input.status;
  if (input.enquiry_type) where.enquiry_type = input.enquiry_type;

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      select: {
        enquiry_id: true,
        subject: true,
        enquiry_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        provider: { select: { provider_name: true, logo_url: true } },
        program: { select: { program_id: true, title: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { updated_at: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return {
    data: enquiries.map((e) => ({
      ...e,
      reply_count: e._count.replies,
      _count: undefined,
    })),
    pagination: {
      total,
      page: input.page,
      limit: input.limit,
      total_pages: Math.ceil(total / input.limit),
    },
  };
}

// ---- List Received Enquiries (provider view) ----

export async function listReceivedEnquiries(userId: string, input: ListEnquiriesInput) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  const where: any = { provider_id: provider.provider_id };
  if (input.status) where.status = input.status;
  if (input.enquiry_type) where.enquiry_type = input.enquiry_type;
  if (input.program_id) where.program_id = input.program_id;

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      select: {
        enquiry_id: true,
        subject: true,
        message: true,
        enquiry_type: true,
        participant_count: true,
        preferred_dates: true,
        budget_range: true,
        status: true,
        created_at: true,
        updated_at: true,
        requester: {
          select: {
            full_name: true,
            role: true,
            employer_profile: { select: { company_name: true } },
          },
        },
        program: { select: { program_id: true, title: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { updated_at: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return {
    data: enquiries.map((e) => ({
      ...e,
      reply_count: e._count.replies,
      _count: undefined,
    })),
    pagination: {
      total,
      page: input.page,
      limit: input.limit,
      total_pages: Math.ceil(total / input.limit),
    },
  };
}

// ---- Get Enquiry Detail ----

export async function getEnquiryDetail(userId: string, enquiryId: string) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { enquiry_id: enquiryId },
    include: {
      requester: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
          role: true,
          employer_profile: {
            select: { company_name: true, industry: true, company_size: true },
          },
        },
      },
      provider: {
        select: {
          provider_id: true,
          provider_name: true,
          contact_email: true,
          user_id: true,
        },
      },
      program: {
        select: { program_id: true, title: true, fee_per_pax: true, fee_per_group: true, delivery_mode: true },
      },
      replies: {
        orderBy: { created_at: 'asc' },
        include: {
          sender: { select: { full_name: true, role: true } },
        },
      },
      proposals: {
        include: {
          provider: { select: { provider_name: true, logo_url: true, quality_tier: true } },
        },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!enquiry) throw AppError.notFound('Enquiry not found');

  // Check access: must be requester or provider
  const isRequester = enquiry.requester.user_id === userId;
  const isProvider = enquiry.provider.user_id === userId;

  if (!isRequester && !isProvider) {
    throw AppError.forbidden('Access denied');
  }

  // Mark as read if provider viewing for the first time
  if (isProvider && enquiry.status === 'sent') {
    await prisma.enquiry.update({
      where: { enquiry_id: enquiryId },
      data: { status: 'read' },
    });
  }

  return enquiry;
}

// ---- Reply to Enquiry ----

export async function replyToEnquiry(userId: string, enquiryId: string, input: ReplyEnquiryInput) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { enquiry_id: enquiryId },
    include: {
      requester: { select: { user_id: true } },
      provider: { select: { provider_id: true, user_id: true } },
    },
  });

  if (!enquiry) throw AppError.notFound('Enquiry not found');
  if (enquiry.status === 'closed') throw AppError.badRequest('Enquiry is closed');

  const isRequester = enquiry.requester.user_id === userId;
  const isProvider = enquiry.provider.user_id === userId;

  if (!isRequester && !isProvider) {
    throw AppError.forbidden('Access denied');
  }

  const reply = await prisma.enquiryReply.create({
    data: {
      enquiry_id: enquiryId,
      sender_id: userId,
      message: input.message,
      attachments: input.attachments,
    },
  });

  // Update enquiry status
  await prisma.enquiry.update({
    where: { enquiry_id: enquiryId },
    data: { status: 'replied' },
  });

  // Update provider response metrics if provider is replying
  if (isProvider) {
    const timeDiffMs = Date.now() - new Date(enquiry.created_at).getTime();
    const hoursToRespond = timeDiffMs / (1000 * 60 * 60);

    // Update average response time (simplified running average)
    const provider = await prisma.trainingProvider.findUnique({
      where: { provider_id: enquiry.provider.provider_id },
      select: { average_response_time: true, response_rate: true },
    });

    if (provider) {
      const currentAvg = Number(provider.average_response_time);
      const newAvg = currentAvg > 0 ? (currentAvg + hoursToRespond) / 2 : hoursToRespond;

      await prisma.trainingProvider.update({
        where: { provider_id: enquiry.provider.provider_id },
        data: { average_response_time: Math.round(newAvg * 100) / 100 },
      });
    }
  }

  // Notify the other party
  const notifyUserId = isRequester ? enquiry.provider.user_id : enquiry.requester.user_id;

  await prisma.notification.create({
    data: {
      user_id: notifyUserId,
      type: 'enquiry_reply',
      title: 'New reply on your enquiry',
      message: `New reply on "${enquiry.subject}"`,
      reference_id: enquiryId,
      reference_type: 'enquiry',
      action_url: isRequester
        ? `/provider/enquiries/${enquiryId}`
        : `/employer/enquiries/${enquiryId}`,
    },
  });

  // Send email notification (fire and forget)
  sendNotificationEmail(
    notifyUserId,
    'enquiry_reply',
    `New reply on your enquiry: ${enquiry.subject}`,
    `<h1>New Reply on Your Enquiry</h1><p>There is a new reply on your enquiry: <strong>${enquiry.subject}</strong>.</p><p>Log in to view the full message and respond.</p>`,
  ).catch(() => {});

  return reply;
}

// ---- Close Enquiry ----

export async function closeEnquiry(userId: string, enquiryId: string) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { enquiry_id: enquiryId },
    select: { requester_id: true, provider: { select: { user_id: true } }, status: true },
  });

  if (!enquiry) throw AppError.notFound('Enquiry not found');
  if (enquiry.requester_id !== userId) throw AppError.forbidden('Only the requester can close an enquiry');
  if (enquiry.status === 'closed') throw AppError.badRequest('Enquiry is already closed');

  await prisma.enquiry.update({
    where: { enquiry_id: enquiryId },
    data: { status: 'closed' },
  });

  // Notify provider
  await prisma.notification.create({
    data: {
      user_id: enquiry.provider.user_id,
      type: 'enquiry_reply',
      title: 'Enquiry closed',
      message: 'An enquiry has been closed by the requester.',
      reference_id: enquiryId,
      reference_type: 'enquiry',
    },
  });

  return { enquiry_id: enquiryId, status: 'closed' };
}

// ---- Provider Enquiry Stats ----

export async function getEnquiryStats(userId: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true, average_response_time: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [total, pending, replied, thisMonth, lastMonth] = await Promise.all([
    prisma.enquiry.count({ where: { provider_id: provider.provider_id } }),
    prisma.enquiry.count({ where: { provider_id: provider.provider_id, status: { in: ['sent', 'read'] } } }),
    prisma.enquiry.count({ where: { provider_id: provider.provider_id, status: 'replied' } }),
    prisma.enquiry.count({
      where: { provider_id: provider.provider_id, created_at: { gte: thisMonthStart } },
    }),
    prisma.enquiry.count({
      where: {
        provider_id: provider.provider_id,
        created_at: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
  ]);

  return {
    total_received: total,
    pending_reply: pending,
    replied,
    average_response_hours: Number(provider.average_response_time),
    this_month: thisMonth,
    last_month: lastMonth,
  };
}

// ---- Client Tracker (aggregated by employer) ----

export async function getClientTracker(userId: string) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  const enquiries = await prisma.enquiry.findMany({
    where: { provider_id: provider.provider_id },
    select: {
      enquiry_id: true,
      status: true,
      updated_at: true,
      requester: {
        select: {
          user_id: true,
          full_name: true,
          employer_profile: { select: { company_name: true } },
        },
      },
    },
    orderBy: { updated_at: 'desc' },
  });

  // Aggregate by requester
  const clientMap = new Map<
    string,
    { user_id: string; name: string; company: string | null; enquiry_count: number; latest_status: string; last_contact: Date }
  >();

  for (const e of enquiries) {
    const existing = clientMap.get(e.requester.user_id);
    if (existing) {
      existing.enquiry_count++;
    } else {
      clientMap.set(e.requester.user_id, {
        user_id: e.requester.user_id,
        name: e.requester.full_name,
        company: e.requester.employer_profile?.company_name || null,
        enquiry_count: 1,
        latest_status: e.status,
        last_contact: e.updated_at,
      });
    }
  }

  return Array.from(clientMap.values()).sort(
    (a, b) => b.last_contact.getTime() - a.last_contact.getTime(),
  );
}

// ---- Submit Proposal via Enquiry ----

export async function submitProposalViaEnquiry(userId: string, enquiryId: string, input: any) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { user_id: userId },
    select: { provider_id: true, provider_name: true },
  });
  if (!provider) throw AppError.notFound('Provider not found');

  const enquiry = await prisma.enquiry.findUnique({
    where: { enquiry_id: enquiryId },
    include: { requester: { select: { user_id: true, full_name: true } } },
  });
  if (!enquiry) throw AppError.notFound('Enquiry not found');
  if (enquiry.provider_id !== provider.provider_id) throw AppError.forbidden('Not your enquiry');

  // Check if proposal already submitted for this enquiry
  const existing = await prisma.tpProposal.findFirst({
    where: { enquiry_id: enquiryId, provider_id: provider.provider_id },
  });
  if (existing) throw AppError.conflict('You have already submitted a proposal for this enquiry');

  const proposal = await prisma.tpProposal.create({
    data: {
      enquiry_id: enquiryId,
      provider_id: provider.provider_id,
      program_id: input.program_id || null,
      proposal_message: input.proposal_message,
      fee_per_pax: input.fee_per_pax || null,
      fee_per_group: input.fee_per_group || null,
      proposed_fee: input.proposed_fee || 0,
      fee_breakdown: input.fee_breakdown || null,
      proposed_schedule: input.proposed_schedule || '',
      proposed_duration: input.proposed_duration || null,
      trainer_details: input.trainer_details || null,
      value_add_offers: input.value_add_offers || [],
      attachments: input.attachments || [],
      status: 'submitted',
    },
  });

  // Update enquiry status
  await prisma.enquiry.update({
    where: { enquiry_id: enquiryId },
    data: { status: 'replied' },
  });

  // Notify the employer
  await prisma.notification.create({
    data: {
      user_id: enquiry.requester.user_id,
      type: 'proposal_received',
      title: 'Proposal received from enquiry',
      message: `${provider.provider_name} submitted a proposal in response to your enquiry "${enquiry.subject}"`,
      reference_id: enquiryId,
      reference_type: 'enquiry',
      action_url: `/employer/enquiries/${enquiryId}`,
    },
  });

  // Send email notification (fire and forget)
  sendNotificationEmail(
    enquiry.requester.user_id,
    'proposal_received',
    `You received a new proposal from ${provider.provider_name}`,
    `<h1>New Proposal Received</h1><p><strong>${provider.provider_name}</strong> submitted a proposal in response to your enquiry: <strong>${enquiry.subject}</strong>.</p><p>Log in to review the proposal and take action.</p>`,
  ).catch(() => {});

  return proposal;
}
