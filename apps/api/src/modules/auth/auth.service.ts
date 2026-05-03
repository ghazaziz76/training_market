import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
} from '../../shared/helpers/index.js';
import {
  sendEmail,
  verificationEmailHtml,
  passwordResetEmailHtml,
  welcomeEmailHtml,
} from '../../shared/helpers/email.js';
import { env } from '../../config/env.js';
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../../shared/validators/auth.validators.js';

const WEB_URL = env.CORS_ORIGINS.split(',')[0] || 'http://localhost:3000';

export async function registerUser(input: RegisterInput) {
  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const password_hash = await hashPassword(input.password);
  const verificationToken = generateRandomToken();

  const user = await prisma.user.create({
    data: {
      role: input.role,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      password_hash,
      verification_token: hashToken(verificationToken),
      status: 'pending_verification',
    },
  });

  // Create empty profile based on role
  if (input.role === 'employer') {
    await prisma.employerProfile.create({ data: { user_id: user.user_id } });
  } else if (input.role === 'individual') {
    await prisma.individualProfile.create({ data: { user_id: user.user_id } });
  } else if (input.role === 'provider') {
    await prisma.trainingProvider.create({ data: { user_id: user.user_id } });
  }

  // Send verification email
  const verifyUrl = `${WEB_URL}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: input.email,
    subject: 'Verify your Training Market account',
    html: verificationEmailHtml(input.full_name, verifyUrl),
  });

  return { user_id: user.user_id, email: user.email };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { verification_token: tokenHash },
  });

  if (!user) {
    throw AppError.badRequest('Invalid or expired verification token');
  }

  const newStatus = user.role === 'provider' ? 'pending_subscription' : 'active';

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      email_verified: true,
      status: newStatus,
      verification_token: null,
    },
  });

  // Send welcome email
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Training Market!',
    html: welcomeEmailHtml(user.full_name, user.role),
  });

  return { email: user.email, role: user.role, status: newStatus };
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.email_verified) {
    // Always return success to not reveal email existence
    return;
  }

  // Rate limit: check Redis
  const rateLimitKey = `ratelimit:verify:${email}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, 3600);
  if (attempts > 3) {
    throw AppError.tooManyRequests('Too many verification requests. Try again in 1 hour.');
  }

  const verificationToken = generateRandomToken();

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { verification_token: hashToken(verificationToken) },
  });

  const verifyUrl = `${WEB_URL}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Training Market account',
    html: verificationEmailHtml(user.full_name, verifyUrl),
  });
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordValid = await verifyPassword(input.password, user.password_hash);
  if (!passwordValid) {
    // Track failed attempts
    const failKey = `login:fail:${user.user_id}`;
    const attempts = await redis.incr(failKey);
    if (attempts === 1) await redis.expire(failKey, 1800); // 30 min window

    if (attempts >= 10) {
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { status: 'suspended' },
      });
      throw AppError.forbidden('Account locked due to too many failed attempts. Try again in 30 minutes.');
    }

    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.status === 'pending_verification') {
    throw AppError.forbidden('Please verify your email before logging in');
  }

  if (user.status === 'suspended') {
    throw AppError.forbidden('Your account is suspended');
  }

  if (user.status === 'deactivated') {
    throw AppError.forbidden('Your account has been deactivated');
  }

  // Clear failed login attempts
  await redis.del(`login:fail:${user.user_id}`);

  // Create refresh token record
  const refreshTokenRecord = await prisma.refreshToken.create({
    data: {
      user_id: user.user_id,
      token_hash: generateRandomToken(), // placeholder, will update
      device_info: input.device_info,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const access_token = generateAccessToken({
    user_id: user.user_id,
    role: user.role,
  });

  const refresh_token = generateRefreshToken({
    user_id: user.user_id,
    token_id: refreshTokenRecord.token_id,
  });

  // Store refresh token hash
  await prisma.refreshToken.update({
    where: { token_id: refreshTokenRecord.token_id },
    data: { token_hash: hashToken(refresh_token) },
  });

  // Update last login
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { last_login_at: new Date() },
  });

  // Cache user session
  const sessionData = {
    user_id: user.user_id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    status: user.status,
  };
  await redis.set(`user:session:${user.user_id}`, JSON.stringify(sessionData), 'EX', 300);

  // Get profile completion
  let profile_completion_pct = 0;
  if (user.role === 'employer') {
    const profile = await prisma.employerProfile.findUnique({ where: { user_id: user.user_id } });
    profile_completion_pct = profile?.profile_completion_pct ?? 0;
  } else if (user.role === 'individual') {
    const profile = await prisma.individualProfile.findUnique({ where: { user_id: user.user_id } });
    profile_completion_pct = profile?.profile_completion_pct ?? 0;
  } else if (user.role === 'provider') {
    const profile = await prisma.trainingProvider.findUnique({ where: { user_id: user.user_id } });
    profile_completion_pct = profile?.profile_completion_pct ?? 0;
  }

  return {
    tokens: {
      access_token,
      refresh_token,
      expires_in: 900, // 15 min in seconds
    },
    user: {
      user_id: user.user_id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      profile_image_url: user.profile_image_url,
      profile_completion_pct,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token_id: payload.token_id },
  });

  if (!storedToken) {
    throw AppError.unauthorized('Refresh token not found');
  }

  if (storedToken.token_hash !== hashToken(refreshToken)) {
    throw AppError.unauthorized('Refresh token mismatch');
  }

  if (new Date() > storedToken.expires_at) {
    await prisma.refreshToken.delete({ where: { token_id: payload.token_id } });
    throw AppError.unauthorized('Refresh token expired');
  }

  const user = await prisma.user.findUnique({
    where: { user_id: payload.user_id },
    select: { user_id: true, role: true, status: true },
  });

  if (!user || user.status !== 'active') {
    throw AppError.unauthorized('User not found or inactive');
  }

  const access_token = generateAccessToken({
    user_id: user.user_id,
    role: user.role,
  });

  return { access_token, expires_in: 900 };
}

export async function logoutUser(userId: string) {
  // Delete all refresh tokens for user
  await prisma.refreshToken.deleteMany({ where: { user_id: userId } });

  // Clear session cache
  await redis.del(`user:session:${userId}`);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to not reveal email existence
  if (!user) return;

  // Rate limit
  const rateLimitKey = `ratelimit:reset:${email}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, 3600);
  if (attempts > 3) {
    throw AppError.tooManyRequests('Too many reset requests. Try again in 1 hour.');
  }

  const resetToken = generateRandomToken();

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      reset_token: hashToken(resetToken),
      reset_token_expiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const resetUrl = `${WEB_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Reset your Training Market password',
    html: passwordResetEmailHtml(user.full_name, resetUrl),
  });
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);

  const user = await prisma.user.findFirst({
    where: {
      reset_token: tokenHash,
      reset_token_expiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  const password_hash = await hashPassword(input.new_password);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: {
      password_hash,
      reset_token: null,
      reset_token_expiry: null,
    },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { user_id: user.user_id } });
  await redis.del(`user:session:${user.user_id}`);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { user_id: userId } });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const valid = await verifyPassword(input.current_password, user.password_hash);
  if (!valid) {
    throw AppError.badRequest('Current password is incorrect');
  }

  const password_hash = await hashPassword(input.new_password);

  await prisma.user.update({
    where: { user_id: userId },
    data: { password_hash },
  });

  // Invalidate all refresh tokens except we don't know which is current, so invalidate all
  await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  await redis.del(`user:session:${userId}`);
}
