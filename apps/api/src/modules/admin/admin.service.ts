import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  sendEmail,
  accountSuspendedEmailHtml,
  providerVerifiedEmailHtml,
} from '../../shared/helpers/email.js';
import type {
  AdminListUsersInput,
  UpdateUserStatusInput,
  VerifyProviderInput,
} from '../../shared/validators/admin.validators.js';

export async function listUsers(input: AdminListUsersInput) {
  const where: any = {};

  if (input.role) where.role = input.role;
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { full_name: { contains: input.search, mode: 'insensitive' } },
      { email: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        user_id: true,
        role: true,
        full_name: true,
        email: true,
        phone: true,
        status: true,
        email_verified: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { [input.sort_by]: input.sort_order },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      total,
      page: input.page,
      limit: input.limit,
      total_pages: Math.ceil(total / input.limit),
    },
  };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      role: true,
      full_name: true,
      email: true,
      phone: true,
      profile_image_url: true,
      status: true,
      email_verified: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      employer_profile: true,
      individual_profile: true,
      provider_profile: true,
    },
  });

  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateUserStatus(
  adminUserId: string,
  targetUserId: string,
  input: UpdateUserStatusInput,
) {
  const user = await prisma.user.findUnique({ where: { user_id: targetUserId } });
  if (!user) throw AppError.notFound('User not found');

  if (user.role === 'admin') {
    throw AppError.forbidden('Cannot change status of admin users');
  }

  await prisma.user.update({
    where: { user_id: targetUserId },
    data: { status: input.status },
  });

  // Invalidate session cache
  await redis.del(`user:session:${targetUserId}`);

  // If suspended, invalidate all sessions
  if (input.status === 'suspended') {
    await prisma.refreshToken.deleteMany({ where: { user_id: targetUserId } });

    await sendEmail({
      to: user.email,
      subject: 'Your Training Market account has been suspended',
      html: accountSuspendedEmailHtml(user.full_name, input.reason || 'Policy violation'),
    });
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_user_id: adminUserId,
      action: `user_status_${input.status}`,
      target_type: 'user',
      target_id: targetUserId,
      details: { reason: input.reason, previous_status: user.status },
    },
  });

  return { user_id: targetUserId, status: input.status };
}

export async function verifyProvider(
  adminUserId: string,
  providerId: string,
  input: VerifyProviderInput,
) {
  const provider = await prisma.trainingProvider.findUnique({
    where: { provider_id: providerId },
    include: { user: { select: { full_name: true, email: true } } },
  });

  if (!provider) throw AppError.notFound('Provider not found');

  const updateData: any = {
    verification_status: input.verification_status,
    verification_notes: input.verification_notes,
  };

  if (input.verification_status === 'verified') {
    updateData.verified_at = new Date();
    updateData.quality_tier = 'verified';
    updateData.quality_tier_updated_at = new Date();
  }

  await prisma.trainingProvider.update({
    where: { provider_id: providerId },
    data: updateData,
  });

  // Send notification email
  if (input.verification_status === 'verified') {
    await sendEmail({
      to: provider.user.email,
      subject: 'Your Training Market provider profile has been verified!',
      html: providerVerifiedEmailHtml(provider.user.full_name),
    });
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      admin_user_id: adminUserId,
      action: `provider_${input.verification_status}`,
      target_type: 'provider',
      target_id: providerId,
      details: { notes: input.verification_notes },
    },
  });

  return { provider_id: providerId, verification_status: input.verification_status };
}

export async function listPendingProviders(page: number = 1, limit: number = 20) {
  const where = { verification_status: 'pending' };

  const [providers, total] = await Promise.all([
    prisma.trainingProvider.findMany({
      where,
      include: {
        user: { select: { full_name: true, email: true, created_at: true } },
      },
      orderBy: { created_at: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trainingProvider.count({ where }),
  ]);

  return {
    data: providers,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}
