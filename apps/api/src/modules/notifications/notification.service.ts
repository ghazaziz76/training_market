import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendEmail } from '../../shared/helpers/email.js';

// ============================================================
// NOTIFICATION CREATION (used by other modules)
// ============================================================

interface CreateNotificationParams {
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_id?: string;
  reference_type?: string;
  action_url?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({ data: params });

  // Invalidate unread count cache
  await redis.del(`notifications:unread:${params.user_id}`);

  // Publish to SSE channel
  await redis.publish(
    `notifications:${params.user_id}`,
    JSON.stringify(notification),
  );

  return notification;
}

export async function createBatchNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'user_id'>,
) {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((user_id) => ({ user_id, ...params })),
  });

  // Invalidate caches and publish
  const pipeline = redis.pipeline();
  for (const userId of userIds) {
    pipeline.del(`notifications:unread:${userId}`);
    pipeline.publish(`notifications:${userId}`, JSON.stringify({ ...params, user_id: userId }));
  }
  await pipeline.exec();
}

// ============================================================
// NOTIFICATION QUERIES
// ============================================================

export async function listNotifications(
  userId: string,
  isRead?: boolean,
  page: number = 1,
  limit: number = 20,
) {
  const where: any = { user_id: userId };
  if (isRead !== undefined) where.is_read = isRead;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    getUnreadCount(userId),
  ]);

  return {
    data: notifications,
    unread_count: unreadCount,
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const cacheKey = `notifications:unread:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return parseInt(cached, 10);

  const count = await prisma.notification.count({
    where: { user_id: userId, is_read: false },
  });

  await redis.set(cacheKey, count.toString(), 'EX', 300);
  return count;
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { notification_id: notificationId },
  });

  if (!notification) throw AppError.notFound('Notification not found');
  if (notification.user_id !== userId) throw AppError.forbidden('Not your notification');

  await prisma.notification.update({
    where: { notification_id: notificationId },
    data: { is_read: true },
  });

  await redis.del(`notifications:unread:${userId}`);
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });

  await redis.del(`notifications:unread:${userId}`);
}

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { notification_id: notificationId },
  });

  if (!notification) throw AppError.notFound('Notification not found');
  if (notification.user_id !== userId) throw AppError.forbidden('Not your notification');

  await prisma.notification.delete({ where: { notification_id: notificationId } });
  await redis.del(`notifications:unread:${userId}`);
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export async function getPreferences(userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { user_id: userId },
  });

  if (!prefs) {
    // Create defaults
    prefs = await prisma.notificationPreference.create({
      data: { user_id: userId },
    });
  }

  return prefs;
}

export async function updatePreferences(userId: string, updates: Record<string, boolean>) {
  await prisma.notificationPreference.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...updates },
    update: updates,
  });

  return getPreferences(userId);
}

// ============================================================
// DEVICE TOKENS (for mobile push)
// ============================================================

export async function registerDeviceToken(
  userId: string,
  deviceToken: string,
  platform: string,
) {
  await prisma.userDeviceToken.upsert({
    where: { device_token: deviceToken },
    create: {
      user_id: userId,
      device_token: deviceToken,
      platform,
      is_active: true,
    },
    update: {
      user_id: userId,
      is_active: true,
      last_used_at: new Date(),
    },
  });
}

export async function unregisterDeviceToken(deviceToken: string) {
  await prisma.userDeviceToken.updateMany({
    where: { device_token: deviceToken },
    data: { is_active: false },
  });
}

// ============================================================
// EMAIL NOTIFICATION HELPER
// ============================================================

export async function sendNotificationEmail(
  userId: string,
  type: string,
  subject: string,
  html: string,
) {
  // Check user preference
  const prefs = await getPreferences(userId);
  const prefKey = `email_${type}` as keyof typeof prefs;

  if (prefKey in prefs && prefs[prefKey] === false) {
    return; // User opted out
  }

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { email: true },
  });

  if (!user) return;

  await sendEmail({ to: user.email, subject, html });
}
