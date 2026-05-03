import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import crypto from 'crypto';

// ---- Check Entitlement ----

export async function checkEntitlement(userId: string, featureKey: string) {
  const entitlement = await prisma.featureEntitlement.findUnique({
    where: { user_id_feature_key: { user_id: userId, feature_key: featureKey } },
  });

  return {
    feature_key: featureKey,
    active: entitlement?.status === 'active',
    activated_at: entitlement?.activated_at || null,
    activation_method: entitlement?.activation_method || null,
  };
}

// ---- List All Entitlements for User ----

export async function listEntitlements(userId: string) {
  const entitlements = await prisma.featureEntitlement.findMany({
    where: { user_id: userId, status: 'active' },
    select: {
      feature_key: true,
      activation_method: true,
      activated_at: true,
    },
    orderBy: { activated_at: 'desc' },
  });

  return entitlements;
}

// ---- Register Activation Code (called by mobile app) ----

export async function registerActivationCode(
  code: string,
  featureKey: string,
  googlePlayOrderId?: string,
) {
  const existing = await prisma.activationCode.findUnique({ where: { code } });
  if (existing) throw AppError.conflict('Activation code already registered');

  return prisma.activationCode.create({
    data: {
      code,
      feature_key: featureKey,
      google_play_order_id: googlePlayOrderId || null,
      status: 'available',
    },
  });
}

// ---- Activate via Code (employer enters on web) ----

export async function activateWithCode(userId: string, code: string) {
  const activation = await prisma.activationCode.findUnique({ where: { code } });

  if (!activation) throw AppError.notFound('Invalid activation code');
  if (activation.status === 'redeemed') throw AppError.badRequest('This code has already been used');
  if (activation.status === 'revoked') throw AppError.badRequest('This code has been revoked');

  // Check if user already has this feature
  const existing = await prisma.featureEntitlement.findUnique({
    where: {
      user_id_feature_key: { user_id: userId, feature_key: activation.feature_key },
    },
  });
  if (existing?.status === 'active') {
    throw AppError.badRequest('You already have this feature activated');
  }

  // Redeem the code and create entitlement in a transaction
  const [, entitlement] = await prisma.$transaction([
    prisma.activationCode.update({
      where: { code },
      data: {
        status: 'redeemed',
        redeemed_by: userId,
        redeemed_at: new Date(),
      },
    }),
    prisma.featureEntitlement.upsert({
      where: {
        user_id_feature_key: { user_id: userId, feature_key: activation.feature_key },
      },
      create: {
        user_id: userId,
        feature_key: activation.feature_key,
        activation_code: code,
        activation_method: 'code',
        status: 'active',
      },
      update: {
        activation_code: code,
        activation_method: 'code',
        status: 'active',
        activated_at: new Date(),
      },
    }),
  ]);

  return {
    feature_key: entitlement.feature_key,
    active: true,
    activated_at: entitlement.activated_at,
  };
}

// ---- Generate QR Session Token ----

export function generateQrSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---- Activate via QR (called by mobile app after scanning) ----

export async function activateWithQr(
  sessionToken: string,
  activationCode: string,
  googlePlayOrderId?: string,
  resolveSession?: (userId: string) => void,
) {
  // Validate the activation code
  const activation = await prisma.activationCode.findUnique({
    where: { code: activationCode },
  });

  if (!activation) throw AppError.notFound('Invalid activation code');
  if (activation.status !== 'available') {
    throw AppError.badRequest('This code is not available for activation');
  }

  // The QR session links back to a web session — we return the validated data
  // The web polling endpoint will complete the activation once it finds the match
  return {
    session_token: sessionToken,
    activation_code: activationCode,
    feature_key: activation.feature_key,
    validated: true,
  };
}
