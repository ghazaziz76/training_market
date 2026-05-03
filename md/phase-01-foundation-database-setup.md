# Phase 1: Foundation and Database Setup — Detailed Development Plan

## 1. Objective

Set up the complete project structure, development environment, PostgreSQL database with all required tables, migrations, seed data, and core infrastructure needed for all subsequent phases.

---

## 2. Prerequisites

- Development machines with Node.js 20+, Docker, Git installed
- PostgreSQL 16+ available (via Docker or cloud instance)
- GitHub repository created
- Team access and permissions configured

---

## 3. Detailed Tasks

### 3.1 Monorepo Project Initialization

#### 3.1.1 Create Monorepo Structure
```
training-market/
├── apps/
│   ├── api/                  # Node.js backend API
│   ├── web/                  # Next.js web application
│   └── mobile/               # React Native Android app
├── packages/
│   ├── shared/               # Shared types, constants, utilities
│   ├── ui/                   # Shared UI components (if applicable)
│   └── config/               # Shared configuration (ESLint, TypeScript)
├── database/
│   ├── migrations/           # Database migration files
│   ├── seeds/                # Seed data scripts
│   └── schema/               # Schema documentation
├── docker/
│   ├── docker-compose.yml    # Local development setup
│   ├── Dockerfile.api        # API container
│   └── Dockerfile.web        # Web container
├── docs/                     # Project documentation
├── .github/
│   └── workflows/            # CI/CD pipeline configurations
├── .env.example              # Environment variable template
├── package.json              # Root package.json
├── turbo.json                # Turborepo configuration (if using Turborepo)
└── README.md
```

#### 3.1.2 Initialize Package Managers and Tools
- initialize root package.json with workspaces
- configure Turborepo or Nx for monorepo management
- set up pnpm or yarn workspaces

#### 3.1.3 Configure TypeScript
- root tsconfig.json with base settings
- apps/api/tsconfig.json extending root
- apps/web/tsconfig.json extending root
- apps/mobile/tsconfig.json extending root
- packages/shared/tsconfig.json extending root
- strict mode enabled across all projects
- path aliases configured

#### 3.1.4 Configure Linting and Formatting
- ESLint configuration with TypeScript rules
- Prettier configuration for consistent formatting
- Husky pre-commit hooks for lint and format checks
- lint-staged for running checks only on changed files

#### 3.1.5 Configure Git
- .gitignore for Node.js, React Native, environment files, and build artifacts
- branch protection rules: main (production), develop (integration), feature/* (development)
- conventional commit message format
- PR template

---

### 3.2 Docker Local Development Environment

#### 3.2.1 docker-compose.yml Services
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: 5432:5432
    environment:
      POSTGRES_DB: training_market
      POSTGRES_USER: tm_admin
      POSTGRES_PASSWORD: (from .env)
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports: 6379:6379

  api:
    build: ./docker/Dockerfile.api
    ports: 4000:4000
    depends_on: postgres, redis
    environment: (from .env)
    volumes: ./apps/api:/app (for hot reload)

  web:
    build: ./docker/Dockerfile.web
    ports: 3000:3000
    depends_on: api
    volumes: ./apps/web:/app (for hot reload)
```

#### 3.2.2 Environment Configuration
Create .env.example with all required variables:
```
# Database
DATABASE_URL=postgresql://tm_admin:password@localhost:5432/training_market
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# API
API_PORT=4000
API_BASE_URL=http://localhost:4000

# Web
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:4000

# Payment Gateway
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# Firebase (for mobile push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

---

### 3.3 Backend API Initialization

#### 3.3.1 Initialize Node.js API Project
```
apps/api/
├── src/
│   ├── config/               # Configuration loaders
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── env.ts
│   │   └── index.ts
│   ├── middleware/            # Express/Fastify middleware
│   │   ├── auth.ts           # JWT verification
│   │   ├── rbac.ts           # Role-based access control
│   │   ├── errorHandler.ts   # Global error handler
│   │   ├── rateLimiter.ts    # Rate limiting
│   │   ├── requestLogger.ts  # Request logging
│   │   └── validator.ts      # Request validation
│   ├── modules/              # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── employers/
│   │   ├── individuals/
│   │   ├── providers/
│   │   ├── programs/
│   │   ├── search/
│   │   ├── enquiries/
│   │   ├── broadcasts/
│   │   ├── proposals/
│   │   ├── subscriptions/
│   │   ├── notifications/
│   │   ├── hrd-corp/
│   │   ├── ai/
│   │   ├── analytics/
│   │   ├── storefront/
│   │   └── admin/
│   ├── shared/               # Shared utilities
│   │   ├── errors/
│   │   ├── helpers/
│   │   ├── types/
│   │   └── validators/
│   ├── app.ts                # Express/Fastify app setup
│   └── server.ts             # Server entry point
├── prisma/
│   └── schema.prisma         # Prisma schema
├── tests/
├── package.json
└── tsconfig.json
```

#### 3.3.2 Install Core Dependencies
```
# Runtime
express (or fastify)
@prisma/client
redis (ioredis)
jsonwebtoken
bcryptjs
zod (validation)
cors
helmet
morgan
compression
multer (file uploads)
nodemailer
bullmq

# Development
typescript
prisma
ts-node
tsx (for development)
nodemon
jest
supertest
@types/*
```

#### 3.3.3 Configure Express/Fastify App
- CORS configuration for web and mobile origins
- Helmet security headers
- Request body parsing (JSON, multipart)
- Compression middleware
- Request logging middleware
- Global error handler
- Rate limiting (general and per-endpoint)
- Health check endpoint: GET /api/health

---

### 3.4 PostgreSQL Database Setup

#### 3.4.1 PostgreSQL Configuration
- enable required extensions via init script:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";
  CREATE EXTENSION IF NOT EXISTS "vector";
  ```
- configure connection pooling (PgBouncer or Prisma connection pool)
- set appropriate memory and connection limits
- enable SSL for non-local connections

#### 3.4.2 Database Roles and Permissions
```sql
-- Application role (used by API)
CREATE ROLE tm_app LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE training_market TO tm_app;
GRANT USAGE ON SCHEMA public TO tm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tm_app;

-- Read-only role (for analytics/reporting)
CREATE ROLE tm_readonly LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE training_market TO tm_readonly;
GRANT USAGE ON SCHEMA public TO tm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tm_readonly;

-- Admin role (for migrations)
CREATE ROLE tm_admin LOGIN PASSWORD 'secure_password' SUPERUSER;
```

---

### 3.5 Database Schema — Complete Table Definitions

#### 3.5.1 Users and Authentication

**Table: users**
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('employer', 'individual', 'provider', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    profile_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification', 'deactivated')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

**Table: refresh_tokens**
```sql
CREATE TABLE refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

#### 3.5.2 Profiles

**Table: employer_profiles**
```sql
CREATE TABLE employer_profiles (
    employer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50) CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
    contact_person VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Malaysia',
    hrd_corp_registered BOOLEAN DEFAULT FALSE,
    hrd_corp_levy_balance DECIMAL(12,2),
    training_interests TEXT[],
    profile_completion_pct INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employer_profiles_user ON employer_profiles(user_id);
CREATE INDEX idx_employer_profiles_industry ON employer_profiles(industry);
```

**Table: individual_profiles**
```sql
CREATE TABLE individual_profiles (
    individual_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    occupation VARCHAR(255),
    education_level VARCHAR(100) CHECK (education_level IN ('spm', 'stpm', 'diploma', 'degree', 'masters', 'phd', 'professional_cert', 'other')),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Malaysia',
    skill_interests TEXT[],
    career_goals TEXT,
    preferred_training_mode VARCHAR(50) CHECK (preferred_training_mode IN ('online', 'physical', 'hybrid', 'any')),
    profile_completion_pct INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_individual_profiles_user ON individual_profiles(user_id);
```

**Table: training_providers**
```sql
CREATE TABLE training_providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100),
    business_description TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Malaysia',
    website VARCHAR(500),
    logo_url VARCHAR(500),
    accreditation_details TEXT,
    quality_tier VARCHAR(20) DEFAULT 'verified' CHECK (quality_tier IN ('verified', 'trusted', 'premium')),
    quality_tier_updated_at TIMESTAMP,
    hrd_corp_registered_provider BOOLEAN DEFAULT FALSE,
    hrd_corp_provider_id VARCHAR(100),
    response_rate DECIMAL(5,2) DEFAULT 0,
    average_response_time_hours DECIMAL(8,2),
    total_programs_count INTEGER DEFAULT 0,
    total_completed_programs INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings_count INTEGER DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verification_notes TEXT,
    verified_at TIMESTAMP,
    profile_completion_pct INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_subscription')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_providers_user ON training_providers(user_id);
CREATE INDEX idx_training_providers_quality_tier ON training_providers(quality_tier);
CREATE INDEX idx_training_providers_status ON training_providers(status);
```

#### 3.5.3 Training Catalog

**Table: categories**
```sql
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_category_id UUID REFERENCES categories(category_id),
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_slug ON categories(slug);
```

**Table: skill_tags**
```sql
CREATE TABLE skill_tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id UUID REFERENCES categories(category_id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_skill_tags_category ON skill_tags(category_id);
```

**Table: trainers**
```sql
CREATE TABLE trainers (
    trainer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    qualification TEXT,
    specialization TEXT,
    bio TEXT,
    photo_url VARCHAR(500),
    years_experience INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trainers_provider ON trainers(provider_id);
```

**Table: training_programs**
```sql
CREATE TABLE training_programs (
    program_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    category_id UUID REFERENCES categories(category_id),
    subcategory_id UUID REFERENCES categories(category_id),
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    learning_outcomes TEXT,
    target_audience TEXT,
    prerequisites TEXT,
    industry_focus TEXT[],
    skill_tags UUID[],
    delivery_mode VARCHAR(50) NOT NULL CHECK (delivery_mode IN ('online', 'physical', 'hybrid')),
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    duration_hours INTEGER,
    duration_days INTEGER,
    min_participants INTEGER,
    max_participants INTEGER,
    fee DECIMAL(12,2),
    fee_notes TEXT,
    early_bird_fee DECIMAL(12,2),
    group_discount_info TEXT,
    certification VARCHAR(255),
    language VARCHAR(50) DEFAULT 'English',
    materials_provided TEXT,
    hrd_corp_claimable BOOLEAN DEFAULT FALSE,
    hrd_corp_scheme VARCHAR(100),
    hrd_corp_program_id VARCHAR(100),
    thumbnail_url VARCHAR(500),
    brochure_url VARCHAR(500),
    effectiveness_score DECIMAL(5,2) DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    enquiry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived', 'rejected')),
    rejection_reason TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_programs_provider ON training_programs(provider_id);
CREATE INDEX idx_programs_category ON training_programs(category_id);
CREATE INDEX idx_programs_status ON training_programs(status);
CREATE INDEX idx_programs_delivery ON training_programs(delivery_mode);
CREATE INDEX idx_programs_fee ON training_programs(fee);
CREATE INDEX idx_programs_title_trgm ON training_programs USING gin(title gin_trgm_ops);
CREATE INDEX idx_programs_description_trgm ON training_programs USING gin(description gin_trgm_ops);
```

**Table: program_schedules**
```sql
CREATE TABLE program_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(program_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue VARCHAR(500),
    online_platform VARCHAR(255),
    available_seats INTEGER,
    booked_seats INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedules_program ON program_schedules(program_id);
CREATE INDEX idx_schedules_start ON program_schedules(start_date);
CREATE INDEX idx_schedules_status ON program_schedules(status);
```

**Table: program_trainers**
```sql
CREATE TABLE program_trainers (
    program_id UUID NOT NULL REFERENCES training_programs(program_id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES trainers(trainer_id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, trainer_id)
);
```

#### 3.5.4 Interactions

**Table: enquiries**
```sql
CREATE TABLE enquiries (
    enquiry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(user_id),
    requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('employer', 'individual')),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    program_id UUID REFERENCES training_programs(program_id),
    enquiry_type VARCHAR(50) NOT NULL CHECK (enquiry_type IN ('general', 'quotation_request', 'enrolment_request', 'custom_training')),
    subject VARCHAR(500),
    message TEXT NOT NULL,
    participant_count INTEGER,
    preferred_dates TEXT,
    budget_range VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'replied', 'closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enquiries_requester ON enquiries(requester_id);
CREATE INDEX idx_enquiries_provider ON enquiries(provider_id);
CREATE INDEX idx_enquiries_program ON enquiries(program_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
```

**Table: enquiry_replies**
```sql
CREATE TABLE enquiry_replies (
    reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID NOT NULL REFERENCES enquiries(enquiry_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enquiry_replies_enquiry ON enquiry_replies(enquiry_id);
```

**Table: training_request_broadcasts**
```sql
CREATE TABLE training_request_broadcasts (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    target_audience TEXT,
    participant_count INTEGER,
    preferred_mode VARCHAR(50) CHECK (preferred_mode IN ('online', 'physical', 'hybrid', 'any')),
    preferred_location VARCHAR(255),
    preferred_dates TEXT,
    budget_range VARCHAR(100),
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    industry_context VARCHAR(255),
    target_skills TEXT[],
    response_deadline DATE,
    total_proposals INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'closed', 'awarded', 'expired')),
    awarded_provider_id UUID REFERENCES training_providers(provider_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_employer ON training_request_broadcasts(employer_id);
CREATE INDEX idx_broadcasts_status ON training_request_broadcasts(status);
CREATE INDEX idx_broadcasts_deadline ON training_request_broadcasts(response_deadline);
```

**Table: tp_proposals**
```sql
CREATE TABLE tp_proposals (
    proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES training_request_broadcasts(request_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    program_id UUID REFERENCES training_programs(program_id),
    proposal_message TEXT NOT NULL,
    proposed_fee DECIMAL(12,2),
    fee_breakdown TEXT,
    proposed_schedule TEXT,
    proposed_duration VARCHAR(100),
    trainer_details TEXT,
    value_add_offers TEXT,
    attachments JSONB DEFAULT '[]',
    ai_value_score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'selected', 'rejected', 'withdrawn')),
    employer_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(request_id, provider_id)
);

CREATE INDEX idx_proposals_request ON tp_proposals(request_id);
CREATE INDEX idx_proposals_provider ON tp_proposals(provider_id);
CREATE INDEX idx_proposals_status ON tp_proposals(status);
```

#### 3.5.5 Storefront and Promotions

**Table: featured_listings**
```sql
CREATE TABLE featured_listings (
    listing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES training_programs(program_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES training_providers(provider_id) ON DELETE CASCADE,
    listing_type VARCHAR(50) NOT NULL CHECK (listing_type IN ('featured_program', 'provider_spotlight', 'hero_banner')),
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority_rank INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'expired', 'paused')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_featured_status_dates ON featured_listings(status, start_date, end_date);
```

**Table: promotions**
```sql
CREATE TABLE promotions (
    promotion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(program_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN ('early_bird', 'group_discount', 'limited_time', 'seasonal', 'custom')),
    label VARCHAR(100) NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(12,2),
    conditions TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'expired', 'paused')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promotions_program ON promotions(program_id);
CREATE INDEX idx_promotions_status_dates ON promotions(status, start_date, end_date);
```

#### 3.5.6 User Activity and Analytics

**Table: user_activities**
```sql
CREATE TABLE user_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('view_program', 'search', 'save_program', 'compare', 'enquire', 'click_provider', 'view_category', 'view_broadcast', 'submit_proposal')),
    target_id UUID,
    target_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_user ON user_activities(user_id);
CREATE INDEX idx_activities_type ON user_activities(activity_type);
CREATE INDEX idx_activities_created ON user_activities(created_at);
CREATE INDEX idx_activities_target ON user_activities(target_id, target_type);
```

**Table: search_history**
```sql
CREATE TABLE search_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    search_query VARCHAR(500),
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_created ON search_history(created_at);
```

**Table: saved_programs**
```sql
CREATE TABLE saved_programs (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES training_programs(program_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, program_id)
);
```

#### 3.5.7 Subscriptions and Billing

**Table: subscriptions**
```sql
CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    plan_name VARCHAR(100) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'annual' CHECK (billing_cycle IN ('monthly', 'annual')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MYR',
    payment_gateway VARCHAR(50),
    gateway_subscription_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(payment_status);
CREATE INDEX idx_subscriptions_end ON subscriptions(end_date);
```

**Table: payment_transactions**
```sql
CREATE TABLE payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MYR',
    payment_method VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    invoice_number VARCHAR(100),
    invoice_url VARCHAR(500),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_transactions_provider ON payment_transactions(provider_id);
```

#### 3.5.8 Notifications

**Table: notifications**
```sql
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id UUID,
    reference_type VARCHAR(50),
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

#### 3.5.9 AI and Matching

**Table: ai_match_records**
```sql
CREATE TABLE ai_match_records (
    match_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('search', 'need_request', 'broadcast', 'advisor')),
    request_reference_id UUID,
    user_id UUID NOT NULL REFERENCES users(user_id),
    program_id UUID NOT NULL REFERENCES training_programs(program_id),
    match_score DECIMAL(5,4),
    match_reason TEXT,
    ranking_position INTEGER,
    was_clicked BOOLEAN DEFAULT FALSE,
    was_enquired BOOLEAN DEFAULT FALSE,
    was_enrolled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_user ON ai_match_records(user_id);
CREATE INDEX idx_matches_program ON ai_match_records(program_id);
```

**Table: program_embeddings**
```sql
CREATE TABLE program_embeddings (
    program_id UUID PRIMARY KEY REFERENCES training_programs(program_id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embeddings_vector ON program_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Table: ai_advisor_conversations**
```sql
CREATE TABLE ai_advisor_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    messages JSONB NOT NULL DEFAULT '[]',
    programs_recommended UUID[] DEFAULT '{}',
    broadcast_created BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON ai_advisor_conversations(user_id);
```

#### 3.5.10 Differentiating Features

**Table: group_training_pools**
```sql
CREATE TABLE group_training_pools (
    pool_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES training_programs(program_id),
    skill_topic VARCHAR(255) NOT NULL,
    delivery_mode VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(100),
    target_date_start DATE,
    target_date_end DATE,
    min_participants INTEGER DEFAULT 10,
    total_participants INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'forming' CHECK (status IN ('forming', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pools_status ON group_training_pools(status);
CREATE INDEX idx_pools_topic ON group_training_pools(skill_topic);
```

**Table: pool_participants**
```sql
CREATE TABLE pool_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES group_training_pools(pool_id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    participant_count INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'withdrawn')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pool_participants_pool ON pool_participants(pool_id);
CREATE INDEX idx_pool_participants_employer ON pool_participants(employer_id);
```

**Table: effectiveness_records**
```sql
CREATE TABLE effectiveness_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(program_id),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    schedule_id UUID REFERENCES program_schedules(schedule_id),
    kpi_description TEXT,
    baseline_value TEXT,
    target_value TEXT,
    actual_value TEXT,
    survey_30_day_sent BOOLEAN DEFAULT FALSE,
    survey_30_day_response JSONB,
    survey_60_day_sent BOOLEAN DEFAULT FALSE,
    survey_60_day_response JSONB,
    survey_90_day_sent BOOLEAN DEFAULT FALSE,
    survey_90_day_response JSONB,
    impact_rating INTEGER CHECK (impact_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_effectiveness_program ON effectiveness_records(program_id);
CREATE INDEX idx_effectiveness_provider ON effectiveness_records(provider_id);
CREATE INDEX idx_effectiveness_employer ON effectiveness_records(employer_id);
```

**Table: annual_training_plans**
```sql
CREATE TABLE annual_training_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    year INTEGER NOT NULL,
    total_budget DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'MYR',
    departments JSONB DEFAULT '[]',
    planned_items JSONB DEFAULT '[]',
    total_planned_participants INTEGER DEFAULT 0,
    total_planned_programs INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employer_id, year)
);

CREATE INDEX idx_plans_employer ON annual_training_plans(employer_id);
```

**Table: levy_utilization_records**
```sql
CREATE TABLE levy_utilization_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    year INTEGER NOT NULL,
    total_levy DECIMAL(12,2),
    utilized_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2),
    utilization_percentage DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(employer_id, year)
);

CREATE INDEX idx_levy_employer ON levy_utilization_records(employer_id);
```

---

### 3.6 Database Migration System

#### 3.6.1 Prisma Schema Setup
- define all models in prisma/schema.prisma matching above tables
- configure PostgreSQL provider with pgvector extension support
- generate initial migration: npx prisma migrate dev --name init
- generate Prisma client

#### 3.6.2 Migration Scripts
- migration 001: create users and auth tables
- migration 002: create profile tables (employer, individual, provider)
- migration 003: create categories and skill tags tables
- migration 004: create training programs and related tables
- migration 005: create interaction tables (enquiries, broadcasts, proposals)
- migration 006: create storefront tables (featured, promotions)
- migration 007: create activity and analytics tables
- migration 008: create subscription and payment tables
- migration 009: create notification table
- migration 010: create AI and matching tables
- migration 011: create differentiating feature tables (pools, effectiveness, plans, levy)

---

### 3.7 Seed Data

#### 3.7.1 Categories Seed
```
Technology and IT
├── Software Development
├── Cybersecurity
├── Cloud Computing
├── Data Analytics
├── Artificial Intelligence
├── IT Infrastructure

Leadership and Management
├── Strategic Leadership
├── People Management
├── Project Management
├── Change Management

Finance and Accounting
├── Financial Management
├── Taxation
├── Auditing
├── Budgeting

Sales and Marketing
├── Digital Marketing
├── Sales Skills
├── Brand Management
├── Customer Relationship

Human Resources
├── Talent Management
├── Performance Management
├── Labour Law
├── Compensation and Benefits

Safety and Compliance
├── Occupational Safety (OSHA)
├── Environmental Compliance
├── Quality Management (ISO)
├── Food Safety (HACCP)

Manufacturing and Operations
├── Lean Manufacturing
├── Six Sigma
├── Supply Chain
├── Quality Control

Communication and Soft Skills
├── Public Speaking
├── Business Writing
├── Negotiation
├── Teamwork

Industry Specific
├── Oil and Gas
├── Construction
├── Healthcare
├── Hospitality
├── Retail
```

#### 3.7.2 Skill Tags Seed
- create 100+ common skill tags mapped to categories
- examples: Python, Excel, Public Speaking, OSHA Compliance, Lean Six Sigma, Financial Modelling, Digital Marketing, SQL, Leadership, Project Management, First Aid

#### 3.7.3 Sample Users Seed (Development Only)
- 3 sample employers (different industries and sizes)
- 3 sample individuals (different backgrounds)
- 3 sample training providers (different specializations)
- 1 admin user
- all with known test passwords

#### 3.7.4 Sample Training Programs Seed (Development Only)
- 15-20 sample programs across different categories
- varied delivery modes, prices, locations
- some marked as HRD Corp claimable
- sample schedules attached

---

### 3.8 CI/CD Pipeline Setup

#### 3.8.1 GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
- on push to develop and main
- run linting
- run TypeScript type checking
- run unit tests
- run database migration check (dry run)
- build check for API, web, and mobile
```

#### 3.8.2 Branch Strategy
- main: production deployments
- develop: integration branch
- feature/*: individual feature branches
- hotfix/*: production hotfixes
- PR required for merge to develop and main
- minimum 1 review required

---

## 4. Acceptance Criteria

- [ ] Monorepo structure created with all projects initialized
- [ ] TypeScript configured and compiling across all projects
- [ ] Docker Compose starts PostgreSQL, Redis, API, and Web successfully
- [ ] All PostgreSQL extensions enabled (uuid-ossp, pgcrypto, pg_trgm, vector)
- [ ] All database tables created via migrations
- [ ] All indexes created
- [ ] Database roles and permissions configured
- [ ] Seed data loads successfully (categories, tags, sample users, sample programs)
- [ ] Prisma client generated and connects to database
- [ ] API server starts and returns 200 on GET /api/health
- [ ] Web app starts and renders default page
- [ ] ESLint and Prettier configured and passing
- [ ] GitHub Actions CI pipeline runs successfully
- [ ] .env.example documented with all variables

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Monorepo and tooling setup | 2-3 days |
| Docker environment | 1 day |
| Backend API initialization | 1-2 days |
| PostgreSQL setup and configuration | 1 day |
| Database schema (all tables) | 3-4 days |
| Migrations | 1 day |
| Seed data | 1-2 days |
| CI/CD pipeline | 1 day |
| **Total** | **10-14 days** |

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Schema changes needed later | Use migration system, design for flexibility with JSONB fields where appropriate |
| pgvector not available on chosen host | Verify hosting supports pgvector before committing, or use separate vector DB as fallback |
| Docker performance on Windows (WSL2) | Ensure WSL2 is configured with adequate memory, use named volumes |
| Team unfamiliar with Prisma | Alternatively use TypeORM or Knex if team has more experience |
