# Training Market

Intelligent training marketplace for Malaysia connecting employers, individuals, and training providers with HRD Corp integration.

## Architecture & Development Plan (MD/)

All design docs and phase plans live in the `MD/` folder. **Read these before building new features** — they define the intended behavior, data models, and user flows.

### Core Reference Docs
- **[MD/training_market_architecture-3.md](MD/training_market_architecture-3.md)** — Full system architecture: business model, user groups (employers, individuals, TPs, admin), AI matching engine, HRD Corp layer, data flow, and platform design decisions.
- **[MD/training_market_development_plan.md](MD/training_market_development_plan.md)** — High-level development plan: tech stack choices, all 16 phases overview, database schema design, infrastructure strategy.

### Phase-by-Phase Development Plans
Each phase doc contains: objective, detailed requirements, database tables, API endpoints, frontend pages, and acceptance criteria.

| Phase | File | Status | What It Covers |
|-------|------|--------|----------------|
| 1 | [phase-01-foundation-database-setup.md](MD/phase-01-foundation-database-setup.md) | Done | Project structure, PostgreSQL, Docker, Prisma, core schema |
| 2 | [phase-02-authentication-user-registration.md](MD/phase-02-authentication-user-registration.md) | Done | JWT auth, registration, role-based access, profiles |
| 3 | [phase-03-tp-program-management.md](MD/phase-03-tp-program-management.md) | Done | Training program CRUD, categories, trainers, agenda |
| 4 | [phase-04-training-storefront-search.md](MD/phase-04-training-storefront-search.md) | Done | Storefront, search, filters, program cards, featured listings |
| 5 | [phase-05-enquiry-system.md](MD/phase-05-enquiry-system.md) | Done | Employer-TP enquiries, replies, attachments |
| 6 | [phase-06-broadcast-requests-proposals.md](MD/phase-06-broadcast-requests-proposals.md) | Done | Broadcast requests, proposals, PDF export, AI scoring |
| 7 | [phase-07-hrd-corp-guidance.md](MD/phase-07-hrd-corp-guidance.md) | Done | HRD Corp scheme guidance, checklists, eligibility |
| 8 | [phase-08-subscription-billing.md](MD/phase-08-subscription-billing.md) | Done | Subscription plans, Stripe payments, invoices |
| 9 | [phase-09-notification-system.md](MD/phase-09-notification-system.md) | Done | In-app, email, push notifications, preferences |
| 10 | [phase-10-ai-matching-engine.md](MD/phase-10-ai-matching-engine.md) | Done | Vector embeddings, semantic search, AI recommendations |
| 11 | [phase-11-admin-portal.md](MD/phase-11-admin-portal.md) | Done | Admin dashboard, user/program/provider management |
| 12 | [phase-12-analytics-reporting.md](MD/phase-12-analytics-reporting.md) | Done | Provider + admin analytics dashboards |
| 13 | [phase-13-differentiators-wave1.md](MD/phase-13-differentiators-wave1.md) | Done | AI advisor chatbot, quality tiers, levy optimizer |
| 14 | [phase-14-differentiators-wave2.md](MD/phase-14-differentiators-wave2.md) | Done | Group pools, effectiveness tracking, training plan builder |
| 15 | [phase-15-market-intelligence-social-proof.md](MD/phase-15-market-intelligence-social-proof.md) | Done | Market intelligence, social proof, smart calendar |
| 16 | [phase-16-polish-optimization-launch.md](MD/phase-16-polish-optimization-launch.md) | Pending | Performance, security, testing, production deploy |

When implementing or modifying a feature, **always check the corresponding phase doc first** for the intended design, required endpoints, and expected behavior.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Fastify 5 + TypeScript + Prisma 6 ORM + PostgreSQL 16 (pgvector) + Redis 7
- **Package Manager**: pnpm (monorepo with workspaces)
- **Infrastructure**: Docker (Postgres + Redis only), app servers run via pnpm

## Monorepo Structure

```
training-market/
├── apps/
│   ├── api/               # Fastify backend (port 4000)
│   │   ├── prisma/        # Schema + migrations
│   │   └── src/
│   │       ├── config/    # env.ts, database.ts, redis.ts
│   │       ├── middleware/ # auth, rbac, validate, errorHandler, subscription
│   │       ├── modules/   # Feature modules (see below)
│   │       ├── shared/    # errors/, helpers/, validators/, types/
│   │       └── server.ts  # Fastify app + route registration
│   └── web/               # Next.js frontend (port 3000)
│       └── src/
│           ├── app/       # App Router pages
│           │   ├── (auth)/    # Login, register, forgot-password
│           │   ├── (user)/    # Employer + individual portal
│           │   ├── (vendor)/  # Training provider portal
│           │   └── (admin)/   # Admin portal
│           ├── components/
│           │   ├── ui/        # Reusable: Button, Card, Input, Modal, Table, etc.
│           │   ├── layout/    # AdminSidebar, VendorSidebar, UserNavbar, etc.
│           │   └── storefront/ # HeroBanner, ProgramCard, CategoryCard
│           ├── hooks/     # useAuth
│           ├── stores/    # Zustand: auth.ts, notifications.ts
│           └── lib/       # api.ts, format.ts, utils.ts
└── packages/
    └── shared/            # Constants + types shared across apps
```

## API Modules (apps/api/src/modules/)

| Module | Routes Prefix | Purpose |
|--------|--------------|---------|
| auth/ | /api/auth | Login, register, refresh token, password reset |
| users/ | /api/employer, /api/individual, /api/provider | Profile CRUD |
| admin/ | /api/admin | User/provider/program management |
| programs/ | /api/programs, /api/categories, /api/skill-tags | Training program CRUD, categories, trainers |
| search/ | /api/search | Full-text + vector search |
| storefront/ | /api/storefront, /api (interactions) | Featured listings, promotions, saves |
| enquiries/ | /api/enquiries | Employer-to-provider messaging |
| broadcasts/ | /api/broadcast-requests, /api/proposals | Training request broadcasts + provider proposals + PDF generation |
| hrd-corp/ | /api/hrd-corp | HRD Corp scheme guidance + checklists |
| subscriptions/ | /api/subscriptions | Provider subscription plans + payments |
| notifications/ | /api/notifications | User notifications + push tokens + preferences |
| ai/ | /api/ai, /api/advisor | AI matching, embeddings, advisor chatbot |
| analytics/ | /api/analytics/provider, /api/analytics/admin | Dashboard analytics |
| providers/ | /api/provider | Quality tier management |
| employers/ | /api/employer | Levy optimizer, training plans, group pools, effectiveness |
| intelligence/ | /api/intelligence | Market intelligence reports |
| uploads/ | /api/uploads | File upload (PDF, DOC, JPG, PNG, max 10MB) |

## Key Database Models (43 total in prisma/schema.prisma)

**Core**: User, EmployerProfile, IndividualProfile, TrainingProvider
**Catalog**: TrainingProgram, Category, SkillTag, Trainer, ProgramSchedule
**Marketplace**: Enquiry, EnquiryReply, TrainingRequestBroadcast, TpProposal
**HRD Corp**: HrdCorpGuidanceRule, HrdCorpChecklist
**Billing**: SubscriptionPlan, Subscription, PaymentTransaction
**Storefront**: FeaturedListing, Promotion, SavedProgram
**AI**: ProgramEmbedding (vector), AiMatchRecord, AdvisorConversation
**Analytics**: DailyProgramStats, DailyProviderStats, DailyPlatformStats, UserActivity, SearchHistory
**Employer Features**: AnnualTrainingPlan, LevyUtilizationRecord, GroupTrainingPool, EffectivenessRecord

## Commands

```bash
# Infrastructure
pnpm docker:up              # Start Postgres + Redis containers
pnpm docker:down            # Stop containers

# Development
pnpm dev:api                # Start API server (tsx watch, port 4000)
pnpm dev:web                # Start Next.js dev server (port 3000)

# Database
pnpm db:generate            # Regenerate Prisma client
pnpm db:migrate             # Run migrations (dev)
pnpm db:seed                # Seed database
pnpm db:studio              # Open Prisma Studio GUI

# Build
pnpm build:api              # TypeScript compile
pnpm build:web              # Next.js build

# Quality
pnpm lint                   # ESLint via Turbo
pnpm format                 # Prettier format all
```

## Environment

Config loaded from root `.env` file. API reads it via `dotenv({ path: '../../.env' })`.
Web reads `NEXT_PUBLIC_API_URL` from `apps/web/.env.local`.

Key variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_PORT`, `CORS_ORIGINS`, `OPENAI_API_KEY`.

## Architecture Notes

- **Auth**: JWT access + refresh tokens. Access tokens cached in Redis (5min). Middleware: `authenticate` then `requireRole('employer')`.
- **Validation**: Zod schemas in `shared/validators/`. Middleware: `validate(schema)` for body, `validateQuery(schema)` for query params.
- **Errors**: Custom `AppError` class with `.notFound()`, `.forbidden()`, `.badRequest()`, `.conflict()`.
- **File uploads**: Stored in `apps/api/uploads/` with UUID filenames. Served via `/api/uploads/files/:filename`.
- **PDF generation**: Proposals exported as PDF via `pdfkit` at `GET /api/proposals/:id/pdf`.
- **Training Plans**: Auto-populated when employer selects a proposal (not manually created).
- **Multi-portal UI**: Tailwind color tokens — user (blue), vendor (violet), admin (slate). Layouts: `(auth)`, `(user)`, `(vendor)`, `(admin)`.

## Rules & Conventions

- **Check impact before editing**: Read the file first. Understand existing code before modifying. Trace imports/usages before deleting anything.
- **No placeholders**: Always implement real functionality. Never use TODO comments, mock data, or stub functions as final output.
- **API pattern**: Routes in `module.routes.ts`, business logic in `module.service.ts`, validation in `shared/validators/`. Keep routes thin.
- **Frontend pattern**: Pages in `app/(portal)/role/feature/page.tsx`. Use existing UI components from `components/ui/`. Use `api.ts` client for all API calls.
- **Prisma migrations**: Always run `DATABASE_URL="postgresql://tm_admin:tm_password@localhost:5432/training_market" npx prisma migrate dev --name <name>` from `apps/api/`. Regenerate client after. Restart API to pick up schema changes.
- **After backend changes**: The API uses `tsx watch` which auto-reloads on file changes. But if you add new npm dependencies or change the Prisma schema, you must kill and restart the API process.
- **After frontend changes**: Next.js dev server hot-reloads automatically. No restart needed.
- **Proposal flow**: Provider submits proposal → stored as `TpProposal` with `proposal_message` (includes structured program details), `attachments` (JSON array of uploaded files), `proposed_fee`, etc. Employer actions use `PUT /api/proposals/:id/shortlist|select|reject` (not PATCH).
