import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import {
  employerProfileRoutes,
  individualProfileRoutes,
  providerProfileRoutes,
} from './modules/users/profile.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { programRoutes } from './modules/programs/program.routes.js';
import { reviewRoutes } from './modules/programs/review.routes.js';
import { trainerRoutes, programTrainerRoutes } from './modules/programs/trainer.routes.js';
import {
  categoryRoutes,
  skillTagRoutes,
  adminCategoryRoutes,
} from './modules/programs/category.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { storefrontRoutes } from './modules/storefront/storefront.routes.js';
import { interactionRoutes } from './modules/storefront/interaction.routes.js';
import { enquiryRoutes } from './modules/enquiries/enquiry.routes.js';
import { broadcastRoutes, proposalRoutes } from './modules/broadcasts/broadcast.routes.js';
import { hrdCorpRoutes } from './modules/hrd-corp/hrdcorp.routes.js';
import { subscriptionRoutes, adminBillingRoutes } from './modules/subscriptions/subscription.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { advisorRoutes } from './modules/ai/advisor.routes.js';
import { providerAnalyticsRoutes, adminAnalyticsRoutes } from './modules/analytics/analytics.routes.js';
import { providerFeatureRoutes, adminTierRoutes } from './modules/providers/provider.routes.js';
import { employerFeatureRoutes } from './modules/employers/employer.routes.js';
import { intelligenceRoutes } from './modules/intelligence/intelligence.routes.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// Plugins
await app.register(cors, {
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
});

await app.register(helmet);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Error handler
app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  environment: env.NODE_ENV,
}));

// API root
app.get('/api', async () => ({
  name: 'Training Market API',
  version: '0.1.0',
}));

// ---- Phase 2: Auth & User Management ----
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(employerProfileRoutes, { prefix: '/api/employer' });
await app.register(individualProfileRoutes, { prefix: '/api/individual' });
await app.register(providerProfileRoutes, { prefix: '/api/provider' });
await app.register(adminRoutes, { prefix: '/api/admin' });

// ---- Phase 3: Program Management ----
await app.register(programRoutes, { prefix: '/api/programs' });
await app.register(reviewRoutes, { prefix: '/api/programs' });
await app.register(trainerRoutes, { prefix: '/api/providers/trainers' });
await app.register(programTrainerRoutes, { prefix: '/api/programs/:program_id/trainers' });
await app.register(categoryRoutes, { prefix: '/api/categories' });
await app.register(skillTagRoutes, { prefix: '/api/skill-tags' });
await app.register(adminCategoryRoutes, { prefix: '/api/admin' });

// ---- Phase 4: Storefront & Search ----
await app.register(searchRoutes, { prefix: '/api/search' });
await app.register(storefrontRoutes, { prefix: '/api/storefront' });
await app.register(interactionRoutes, { prefix: '/api' });

// ---- Phase 5: Enquiry System ----
await app.register(enquiryRoutes, { prefix: '/api/enquiries' });

// ---- Phase 6: Broadcast Requests & Proposals ----
await app.register(broadcastRoutes, { prefix: '/api/broadcast-requests' });
await app.register(proposalRoutes, { prefix: '/api/proposals' });

// ---- Phase 7: HRD Corp Guidance ----
await app.register(hrdCorpRoutes, { prefix: '/api/hrd-corp' });

// ---- Phase 8: Subscription & Billing ----
await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
await app.register(adminBillingRoutes, { prefix: '/api/admin' });

// ---- Phase 9: Notification System ----
await app.register(notificationRoutes, { prefix: '/api/notifications' });

// ---- Phase 10: AI Matching Engine ----
await app.register(aiRoutes, { prefix: '/api/ai' });

// ---- Phase 12: Analytics ----
await app.register(providerAnalyticsRoutes, { prefix: '/api/analytics/provider' });
await app.register(adminAnalyticsRoutes, { prefix: '/api/analytics/admin' });

// ---- Phase 13: Differentiators Wave 1 ----
await app.register(advisorRoutes, { prefix: '/api/advisor' });
await app.register(providerFeatureRoutes, { prefix: '/api/provider' });
await app.register(adminTierRoutes, { prefix: '/api/admin' });

// ---- File Uploads ----
await app.register(uploadRoutes, { prefix: '/api/uploads' });

// ---- Phase 14 & 15: Employer Features + Intelligence ----
await app.register(employerFeatureRoutes, { prefix: '/api/employer' });
await app.register(intelligenceRoutes, { prefix: '/api/intelligence' });

// Start server
const start = async () => {
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${env.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
