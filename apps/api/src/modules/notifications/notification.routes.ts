import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { redis } from '../../config/redis.js';
import { verifyAccessToken } from '../../shared/helpers/tokens.js';
import * as notificationService from './notification.service.js';

const updatePrefsSchema = z.object({
  email_enquiry_received: z.boolean().optional(),
  email_enquiry_reply: z.boolean().optional(),
  email_broadcast_request: z.boolean().optional(),
  email_proposal_update: z.boolean().optional(),
  email_subscription_reminder: z.boolean().optional(),
  email_marketing: z.boolean().optional(),
  push_enquiry_received: z.boolean().optional(),
  push_enquiry_reply: z.boolean().optional(),
  push_broadcast_request: z.boolean().optional(),
  push_proposal_update: z.boolean().optional(),
});

const registerDeviceSchema = z.object({
  device_token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
});

const unregisterDeviceSchema = z.object({
  device_token: z.string().min(1),
});

export async function notificationRoutes(app: FastifyInstance) {
  // ---- SSE Stream for real-time notifications ----
  app.get('/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate via query param (SSE can't set headers easily)
    const token = (request.query as any).token;
    if (!token) {
      return reply.status(401).send({ success: false, message: 'Token required' });
    }

    let userId: string;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.user_id;
    } catch {
      return reply.status(401).send({ success: false, message: 'Invalid token' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Subscribe to user's notification channel
    const subscriber = redis.duplicate();
    await subscriber.subscribe(`notifications:${userId}`);

    subscriber.on('message', (_channel: string, message: string) => {
      reply.raw.write(`data: ${message}\n\n`);
    });

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      subscriber.unsubscribe();
      subscriber.disconnect();
    });
  });

  // All remaining routes require auth
  app.addHook('preHandler', authenticate);

  // GET /api/notifications — list notifications
  app.get('/', async (request, reply) => {
    const q = request.query as any;
    const isRead = q.is_read === 'true' ? true : q.is_read === 'false' ? false : undefined;
    const result = await notificationService.listNotifications(
      request.user!.user_id,
      isRead,
      Number(q.page) || 1,
      Number(q.limit) || 20,
    );
    return reply.send({ success: true, ...result });
  });

  // GET /api/notifications/unread-count
  app.get('/unread-count', async (request, reply) => {
    const count = await notificationService.getUnreadCount(request.user!.user_id);
    return reply.send({ success: true, data: { unread_count: count } });
  });

  // PUT /api/notifications/:notification_id/read
  app.put('/:notification_id/read', async (request, reply) => {
    const { notification_id } = request.params as { notification_id: string };
    await notificationService.markAsRead(request.user!.user_id, notification_id);
    return reply.send({ success: true, message: 'Marked as read' });
  });

  // PUT /api/notifications/read-all
  app.put('/read-all', async (request, reply) => {
    await notificationService.markAllAsRead(request.user!.user_id);
    return reply.send({ success: true, message: 'All marked as read' });
  });

  // DELETE /api/notifications/:notification_id
  app.delete('/:notification_id', async (request, reply) => {
    const { notification_id } = request.params as { notification_id: string };
    await notificationService.deleteNotification(request.user!.user_id, notification_id);
    return reply.send({ success: true, message: 'Notification deleted' });
  });

  // GET /api/notifications/preferences
  app.get('/preferences', async (request, reply) => {
    const prefs = await notificationService.getPreferences(request.user!.user_id);
    return reply.send({ success: true, data: prefs });
  });

  // PUT /api/notifications/preferences
  app.put('/preferences', {
    preHandler: [validate(updatePrefsSchema)],
    handler: async (request, reply) => {
      const prefs = await notificationService.updatePreferences(
        request.user!.user_id,
        request.body as any,
      );
      return reply.send({ success: true, data: prefs });
    },
  });

  // POST /api/notifications/register-device
  app.post('/register-device', {
    preHandler: [validate(registerDeviceSchema)],
    handler: async (request, reply) => {
      const { device_token, platform } = request.body as { device_token: string; platform: string };
      await notificationService.registerDeviceToken(request.user!.user_id, device_token, platform);
      return reply.send({ success: true, message: 'Device registered' });
    },
  });

  // DELETE /api/notifications/unregister-device
  app.delete('/unregister-device', {
    preHandler: [validate(unregisterDeviceSchema)],
    handler: async (request, reply) => {
      const { device_token } = request.body as { device_token: string };
      await notificationService.unregisterDeviceToken(device_token);
      return reply.send({ success: true, message: 'Device unregistered' });
    },
  });
}
