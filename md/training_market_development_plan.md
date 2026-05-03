# Training Market — High Level Development Plan

## 1. Technology Stack

### Database
- **PostgreSQL** — primary relational database
- Row level security for multi tenant data isolation
- pgcrypto extension for field level encryption
- pg_trgm extension for fast text search
- pgvector extension for AI semantic matching (vector embeddings)

### Backend
- **Node.js** with **Express.js** or **Fastify** — API server
- **TypeScript** — type safety across backend
- **Prisma** or **TypeORM** — database ORM for PostgreSQL
- **Redis** — caching, session management, real time notifications
- **Bull** or **BullMQ** — background job queue for notifications, AI processing, broadcast distribution

### Web Frontend
- **Next.js** (React) — web application for all portals (employer, individual, TP, admin)
- **TypeScript** — type safety across frontend
- **Tailwind CSS** — styling and responsive design
- **Zustand** or **Redux Toolkit** — state management

### Mobile App (Android)
- **React Native** — Android app (can extend to iOS later)
- Shared business logic and API calls with web frontend
- Native feel with React Native Paper or NativeWind for styling

### AI Layer
- **OpenAI API** or **Anthropic Claude API** — for AI Training Advisor chatbot and recommendation explanations
- **LangChain** (Node.js version) — for AI orchestration and conversation management
- **pgvector** — for semantic search and program matching embeddings

### Infrastructure
- **Docker** — containerized deployment
- Cloud hosting (AWS, GCP, or DigitalOcean — to be decided)
- **Nginx** — reverse proxy and load balancing
- **GitHub** — version control
- **GitHub Actions** — CI/CD pipeline

### Payments
- **Stripe** or **Billplz** (Malaysian payment gateway) — for TP subscription billing

---

## 2. Development Phases

---

### Phase 1: Foundation and Database Setup
**Goal:** Set up the project structure, database, and core infrastructure.

#### 1.1 Project Initialization
- initialize monorepo structure (backend, web, mobile)
- configure TypeScript across all projects
- set up Git repository and branching strategy
- set up environment configuration (development, staging, production)
- set up Docker Compose for local development

#### 1.2 PostgreSQL Database Setup
- install and configure PostgreSQL
- enable required extensions (pgcrypto, pg_trgm, pgvector, uuid-ossp)
- configure database roles and permissions
- set up database encryption at rest
- configure connection pooling
- create database migration system using Prisma or TypeORM

#### 1.3 Core Database Schema — Users and Auth
Tables:
- users (user_id, role, full_name, email, phone, password_hash, status, created_at, updated_at)
- employer_profiles (employer_id, user_id, company_name, registration_no, industry, company_size, contact_person, location, hrd_corp_registered_status, hrd_corp_levy_balance, training_interests)
- individual_profiles (individual_id, user_id, occupation, education_level, location, skill_interests, career_goals, preferred_training_mode)
- training_providers (provider_id, user_id, provider_name, registration_no, business_description, contact_person, website, accreditation_details, quality_tier, hrd_corp_registered_provider, response_rate, average_response_time, status)
- subscriptions (subscription_id, provider_id, plan_name, billing_cycle, amount, payment_status, start_date, end_date)

#### 1.4 Core Database Schema — Training Catalog
Tables:
- training_programs (program_id, provider_id, title, category, subcategory, description, learning_outcomes, target_audience, industry_focus, skill_tags, delivery_mode, location, duration, fee, schedule, certification, hrd_corp_relevant_fields, effectiveness_score, status, created_at, updated_at)
- categories (category_id, name, parent_category_id, icon, sort_order, status)
- skill_tags (tag_id, name, category_id)
- trainers (trainer_id, provider_id, name, qualification, specialization, bio)

#### 1.5 Core Database Schema — Interactions
Tables:
- enquiries (enquiry_id, requester_id, provider_id, program_id, enquiry_type, message, status, created_at)
- training_request_broadcasts (request_id, employer_id, title, description, target_audience, participant_count, preferred_mode, preferred_location, preferred_dates, budget_range, industry_context, target_skills, response_deadline, status, created_at)
- tp_proposals (proposal_id, request_id, provider_id, program_id, proposal_message, proposed_fee, proposed_schedule, trainer_details, value_add_offers, attachments, status, created_at)
- user_activities (activity_id, user_id, activity_type, target_id, target_type, created_at)

#### 1.6 Core Database Schema — Features
Tables:
- featured_listings (listing_id, program_id, provider_id, listing_type, start_date, end_date, priority_rank, status)
- promotions (promotion_id, program_id, provider_id, promotion_type, discount_value, start_date, end_date, status)
- group_training_pools (pool_id, program_id, skill_topic, delivery_mode, location, target_date_range, total_participants, status, created_at)
- pool_participants (participant_id, pool_id, employer_id, participant_count)
- effectiveness_records (record_id, program_id, provider_id, employer_id, kpi_description, baseline_value, target_value, actual_value, survey_30_day, survey_60_day, survey_90_day, impact_rating, created_at)
- annual_training_plans (plan_id, employer_id, year, total_budget, planned_programs, planned_participants, completion_percentage, status, created_at)
- levy_utilization_records (record_id, employer_id, year, total_levy, utilized_amount, remaining_amount, utilization_percentage, last_updated)
- notifications (notification_id, user_id, type, title, message, is_read, reference_id, reference_type, created_at)
- search_history (history_id, user_id, search_query, filters_applied, results_count, created_at)

#### 1.7 Database Seed Data
- create seed script for categories and subcategories
- create seed script for skill tags
- create seed script for sample users (employer, individual, TP, admin)
- create seed script for sample training programs

**Deliverable:** Fully configured PostgreSQL database with all tables, migrations, seed data, and local Docker setup.

---

### Phase 2: Authentication and User Registration
**Goal:** Users can register, log in, and manage profiles across all roles.

#### 2.1 Backend API — Auth Service
- POST /api/auth/register (employer, individual, provider, admin)
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/refresh-token
- JWT token based authentication
- role based access control middleware
- password hashing with bcrypt
- email verification flow

#### 2.2 Backend API — User Profile Service
- GET/PUT /api/employer/profile
- GET/PUT /api/individual/profile
- GET/PUT /api/provider/profile
- profile image upload
- profile completion percentage indicator

#### 2.3 Web Frontend — Auth Pages
- registration page with role selection (employer, individual, training provider)
- login page
- forgot password page
- email verification page
- terms and conditions acceptance

#### 2.4 Web Frontend — Profile Setup
- employer profile form (company details, industry, size, HRD Corp status, training interests)
- individual profile form (occupation, education, skills, goals)
- training provider profile form (company details, accreditation, description)
- profile completion wizard

#### 2.5 Mobile App — Auth Screens
- registration screen with role selection
- login screen
- forgot password screen
- profile setup wizard (employer and individual only for mobile)

#### 2.6 Admin — User Management
- admin user list view with filters by role and status
- admin user detail view
- admin user approval and suspension controls
- provider verification workflow

**Deliverable:** Working registration, login, and profile management for all user roles on web and mobile.

---

### Phase 3: Training Provider — Program Management
**Goal:** Training providers can add, edit, and manage their training programs.

#### 3.1 Backend API — Training Catalog Service
- POST /api/programs (create program)
- GET /api/programs/:id (view program)
- PUT /api/programs/:id (update program)
- DELETE /api/programs/:id (archive program)
- GET /api/programs/my-programs (provider's own programs)
- POST /api/programs/:id/schedule (add session schedule)
- POST /api/programs/:id/trainers (assign trainers)
- program status workflow (draft, pending review, published, archived)

#### 3.2 Backend API — Category and Taxonomy
- GET /api/categories (list all categories and subcategories)
- GET /api/skill-tags (list all skill tags)
- admin CRUD for categories and skill tags

#### 3.3 Web Frontend — TP Program Management Dashboard
- my programs list view with status filters
- program create and edit form with all fields
- rich text editor for program description and learning outcomes
- schedule and session management
- trainer assignment
- pricing and fee configuration
- HRD Corp relevant fields section
- program preview before publishing
- program analytics summary per program (views, clicks, enquiries)

#### 3.4 Admin — Program Moderation
- pending program review queue
- program approval and rejection with feedback
- program content moderation tools

**Deliverable:** Training providers can fully manage their training catalog through the web portal.

---

### Phase 4: Training Storefront and Search
**Goal:** Employers and individuals see an interactive storefront and can search and discover programs.

#### 4.1 Backend API — Search and Discovery Service
- GET /api/search/programs (keyword search with filters)
- GET /api/storefront/featured (featured programs)
- GET /api/storefront/trending (trending programs)
- GET /api/storefront/new (recently added programs)
- GET /api/storefront/categories (browse by category)
- GET /api/storefront/recommended (personalized recommendations)
- GET /api/search/history (user search history)
- full text search using PostgreSQL pg_trgm
- filter by category, industry, delivery mode, location, price range, duration
- relevance scoring and ranking

#### 4.2 Backend API — Personalization Service
- track user views, clicks, saves, and searches
- generate personalized recommendations based on profile and behavior
- recently viewed programs
- saved programs and favorites

#### 4.3 Web Frontend — Employer Storefront Homepage
- hero banner carousel with featured programs
- recommended for you section
- trending programs section
- browse by category cards
- browse by industry section
- new programs section
- search bar with auto suggest
- quick filter bar
- provider spotlight section
- upcoming sessions section

#### 4.4 Web Frontend — Search Results Page
- search results with program cards
- filter sidebar (category, delivery mode, location, price, duration, provider tier)
- sort options (relevance, price, date, rating)
- save search functionality
- compare programs side by side

#### 4.5 Web Frontend — Program Detail Page
- full program description, outcomes, agenda
- trainer profiles
- schedule and available sessions
- fee breakdown
- provider profile summary with quality tier badge
- related programs from same provider
- similar programs from other providers
- action buttons: save, compare, enquire, nudge for quotation

#### 4.6 Web Frontend — Individual Storefront Homepage
- similar to employer but personalized for career goals
- popular programs among similar learners
- free vs paid filters
- learning path suggestions

#### 4.7 Mobile App — Storefront and Search
- mobile storefront home screen with same sections (adapted for mobile layout)
- search with filters
- program cards optimized for mobile
- program detail screen
- save and compare on mobile

**Deliverable:** Interactive storefront experience on web and mobile with full search, filtering, and personalization.

---

### Phase 5: Enquiry System and Employer-TP Interaction
**Goal:** Employers can enquire, nudge for quotations, and interact with training providers.

#### 5.1 Backend API — Enquiry Service
- POST /api/enquiries (create enquiry)
- GET /api/enquiries/my-enquiries (requester view)
- GET /api/enquiries/received (provider view)
- PUT /api/enquiries/:id/respond (provider responds)
- enquiry status tracking (sent, read, replied, closed)
- notification triggers on new enquiry and response

#### 5.2 Web Frontend — Employer Enquiry Flow
- enquiry form from program detail page
- nudge for quotation button
- my enquiries dashboard with status tracking

#### 5.3 Web Frontend — TP Enquiry Management
- received enquiries list with filters
- enquiry detail view with employer information
- respond to enquiry with message and document attachments
- client engagement tracker

#### 5.4 Mobile App — Enquiry Screens
- enquiry submission from program detail
- my enquiries list and status
- push notifications for enquiry responses

**Deliverable:** Working enquiry and communication flow between employers and training providers.

---

### Phase 6: Training Request Broadcast and TP Proposals
**Goal:** Employers can broadcast training requests and TPs can respond with proposals.

#### 6.1 Backend API — Broadcast Service
- POST /api/broadcast-requests (create broadcast request)
- GET /api/broadcast-requests/my-requests (employer view)
- GET /api/broadcast-requests/feed (TP view of all open requests)
- GET /api/broadcast-requests/:id (request detail)
- POST /api/broadcast-requests/:id/proposals (TP submits proposal)
- GET /api/broadcast-requests/:id/proposals (employer views all proposals)
- PUT /api/proposals/:id/status (employer shortlists, selects, or rejects)
- broadcast notification to all registered TPs on new request
- request status lifecycle (open, reviewing, closed, awarded)
- request deadline management and auto close

#### 6.2 Web Frontend — Employer Broadcast
- create training request form with all fields
- my broadcast requests dashboard
- proposals received per request with side by side comparison
- shortlist and select workflow
- award notification to selected TP

#### 6.3 Web Frontend — TP Request Feed and Proposal
- open requests feed with filters (industry, topic, location, budget)
- request detail view
- submit proposal form with quotation, program details, schedule, trainer info, value add offers, and document attachments
- my proposals dashboard with status tracking

#### 6.4 Mobile App — Broadcast and Proposals
- employer: create broadcast request on mobile
- employer: view proposals on mobile
- TP: view request feed and submit proposals (basic mobile flow, full management on web)

**Deliverable:** Full two way marketplace with broadcast requests and competitive proposals.

---

### Phase 7: HRD Corp Guidance Layer
**Goal:** Employers receive structured guidance for HRD Corp grant applications after matching.

#### 7.1 Backend API — HRD Corp Guidance Service
- GET /api/hrd-corp/guidance/:program_id (guidance for a matched program)
- GET /api/hrd-corp/checklist/:employer_id (employer specific checklist)
- checklist item tracking (completed, pending, missing info)
- document readiness assessment

#### 7.2 Web Frontend — HRD Corp Guidance View
- HRD Corp guidance page accessible from program detail and proposal detail
- structured display of required fields: provider details, program title, objectives, training mode, duration, trainer category, fee breakdown, supporting documents
- employer checklist with completion tracking
- document download or collection from TP responses
- guidance notes and next step instructions

#### 7.3 Mobile App — HRD Corp Guidance
- simplified guidance view on mobile
- checklist with completion tracking
- document access

**Deliverable:** Employers have clear HRD Corp application guidance with all necessary information collected.

---

### Phase 8: Subscription and Billing for Training Providers
**Goal:** Training providers can subscribe, pay, and manage their subscription.

#### 8.1 Backend API — Subscription Service
- POST /api/subscriptions/checkout (initiate subscription payment)
- GET /api/subscriptions/my-subscription (current subscription status)
- POST /api/subscriptions/renew
- webhook handler for payment gateway callbacks
- subscription status management (active, expired, suspended)
- grace period handling
- renewal reminder scheduling

#### 8.2 Payment Gateway Integration
- integrate Stripe or Billplz (Malaysian gateway)
- FPX online banking support
- credit and debit card support
- invoice generation
- receipt generation
- payment history

#### 8.3 Web Frontend — TP Subscription Management
- subscription plan display
- checkout and payment flow
- subscription status dashboard
- payment history and invoices
- renewal management

#### 8.4 Admin — Billing Management
- subscription overview across all providers
- manual subscription adjustment
- payment status monitoring
- revenue reporting

**Deliverable:** Training providers can subscribe, pay, and maintain their subscription with automated billing.

---

### Phase 9: Notification System
**Goal:** All users receive relevant notifications across web and mobile.

#### 9.1 Backend — Notification Service
- notification creation and storage
- email notification delivery (using SendGrid, AWS SES, or similar)
- in app notification delivery
- push notification delivery for mobile (Firebase Cloud Messaging)
- notification preferences per user
- notification scheduling for reminders and alerts

#### 9.2 Notification Types
- new enquiry received (TP)
- enquiry response received (employer)
- new broadcast request published (all TPs)
- proposal received (employer)
- proposal status updated (TP)
- subscription renewal reminder (TP)
- program approved or rejected (TP)
- HRD Corp deadline reminders (employer)
- saved search alerts (employer, individual)
- recommendation alerts (employer, individual)

#### 9.3 Web Frontend — Notification Center
- notification bell with unread count
- notification dropdown with recent notifications
- notification settings page

#### 9.4 Mobile App — Push Notifications
- Firebase Cloud Messaging integration
- push notification handling
- notification inbox screen

**Deliverable:** Comprehensive notification system across email, in app, and mobile push.

---

### Phase 10: AI Matching Engine (Basic)
**Goal:** AI recommends relevant programs based on employer and individual needs.

#### 10.1 Backend — AI Matching Service
- program embedding generation using AI API (OpenAI or Claude)
- store embeddings in pgvector
- semantic matching between user needs and program descriptions
- ranking engine combining semantic score with structured filters (price, location, mode, industry, duration)
- match explanation generation
- API endpoints for recommendations

#### 10.2 Integration Points
- storefront personalized recommendations powered by AI matching
- search results enhanced with semantic relevance
- broadcast request auto suggestion of relevant TPs

#### 10.3 Web and Mobile — AI Recommendations
- recommended for you section on storefront
- match score and explanation on program cards
- why this program is recommended explanation on detail page

**Deliverable:** Basic AI matching engine providing relevant program recommendations.

---

### Phase 11: Admin Portal
**Goal:** Full admin control over the platform.

#### 11.1 Backend API — Admin Service
- user management endpoints
- program moderation endpoints
- category and taxonomy management endpoints
- platform analytics endpoints
- storefront content management endpoints

#### 11.2 Web Frontend — Admin Dashboard
- dashboard with platform statistics (users, programs, enquiries, subscriptions, revenue)
- user management with filters, search, approve, suspend
- provider verification workflow
- program moderation queue
- category and taxonomy editor
- storefront content manager (banners, featured programs, spotlights)
- broadcast request oversight
- subscription and revenue reports
- system health monitoring

**Deliverable:** Admin team can manage all platform operations.

---

### Phase 12: Analytics and Reporting
**Goal:** Providers and admins have access to performance analytics.

#### 12.1 Backend — Analytics Service
- event tracking pipeline (views, clicks, enquiries, proposals, enrollments)
- aggregation jobs for daily, weekly, and monthly metrics
- provider specific analytics
- platform wide analytics for admin

#### 12.2 Web Frontend — TP Analytics Dashboard
- program views, clicks, and enquiry counts
- enquiry conversion rates
- search appearance frequency
- broadcast request response performance
- comparison against previous period

#### 12.3 Web Frontend — Admin Analytics
- platform overview metrics
- user growth trends
- search trends and popular categories
- provider performance rankings
- revenue metrics

**Deliverable:** Data driven dashboards for training providers and admin.

---

### Phase 13: Differentiating Features — Wave 1
**Goal:** Launch key differentiating features that create competitive advantage.

#### 13.1 AI Training Advisor Chatbot
- conversational AI interface on web and mobile
- integration with training catalog for real time program suggestions
- multi turn conversation with follow up questions
- ability to initiate broadcast request from conversation
- conversation history storage

#### 13.2 Provider Quality Tier System
- tier calculation engine based on verification, ratings, response rate, completed programs
- Verified, Trusted, and Premium tier levels
- tier badge display on storefront, search results, and provider profile
- tier based ranking boost in search and recommendations
- provider dashboard showing tier progress

#### 13.3 HRD Corp Levy Optimizer
- employer levy balance input
- remaining utilization calculation
- AI suggested programs to maximize levy usage
- levy planner with timeline and budget allocation
- utilization alerts and reminders

**Deliverable:** Three flagship differentiating features live.

---

### Phase 14: Differentiating Features — Wave 2
**Goal:** Expand differentiation with advanced features.

#### 14.1 Training Request Competitive Bidding Enhancements
- proposal count visibility for TPs
- AI value scoring of proposals
- value add offer support
- selected provider award badge
- bid analytics

#### 14.2 Group Training Pool
- overlapping demand detection engine
- pool formation and employer notification
- employer opt in workflow
- TP group rate offer submission
- pooled session coordination

#### 14.3 Training Effectiveness Tracking
- post training KPI checkpoint setup
- automated 30, 60, 90 day follow up surveys
- impact rating collection
- effectiveness score integration into AI ranking
- employer effectiveness dashboard

#### 14.4 Annual Training Plan Builder
- employer inputs departments, teams, skills gaps, budget
- AI generates suggested annual plan
- plan adjustment and approval
- progress tracking throughout the year
- year end completion report export

**Deliverable:** Full suite of differentiating features deployed.

---

### Phase 15: Market Intelligence and Social Proof
**Goal:** Generate and display market intelligence and social proof data.

#### 15.1 Market Intelligence Service
- aggregation pipeline for anonymized platform data
- trending skills and topics by industry
- employer benchmarking (training spend vs industry average)
- TP opportunity gap detection
- pricing benchmark reports

#### 15.2 Social Proof Integration
- anonymized enrollment counts on program cards
- industry activity indicators
- verified review display from training completions

#### 15.3 Smart Training Calendar
- unified session calendar across all TPs
- employee conflict detection
- optimal timing suggestions
- calendar sync API (Google, Outlook)

**Deliverable:** Intelligence driven features that make the platform smarter with usage.

---

### Phase 16: Polish, Optimization, and Launch Preparation
**Goal:** Production readiness.

#### 16.1 Performance Optimization
- database query optimization and indexing
- API response caching with Redis
- image and asset optimization
- lazy loading and code splitting on web
- mobile app performance tuning

#### 16.2 Security Hardening
- penetration testing
- SQL injection and XSS prevention audit
- rate limiting on all API endpoints
- data encryption audit
- OWASP top 10 compliance check

#### 16.3 Testing
- unit tests for backend services
- integration tests for API endpoints
- end to end tests for critical user flows
- mobile app testing on target Android devices
- load testing for expected concurrent users

#### 16.4 Launch Preparation
- production environment setup
- domain and SSL configuration
- Google Play Store submission for Android app
- monitoring and alerting setup (uptime, errors, performance)
- backup and disaster recovery verification
- admin user training
- seed production data (categories, tags)
- onboard initial training providers

**Deliverable:** Platform ready for production launch.

---

## 3. Phase Summary and Priority

| Phase | Name | Priority | Depends On |
|-------|------|----------|------------|
| 1 | Foundation and Database Setup | Must have | — |
| 2 | Authentication and User Registration | Must have | Phase 1 |
| 3 | TP Program Management | Must have | Phase 2 |
| 4 | Training Storefront and Search | Must have | Phase 3 |
| 5 | Enquiry System | Must have | Phase 4 |
| 6 | Broadcast Requests and Proposals | Must have | Phase 5 |
| 7 | HRD Corp Guidance Layer | Must have | Phase 5 |
| 8 | Subscription and Billing | Must have | Phase 2 |
| 9 | Notification System | Must have | Phase 2 |
| 10 | AI Matching Engine (Basic) | Must have | Phase 3, 4 |
| 11 | Admin Portal | Must have | Phase 2 |
| 12 | Analytics and Reporting | Should have | Phase 5 |
| 13 | Differentiating Features Wave 1 | Should have | Phase 10 |
| 14 | Differentiating Features Wave 2 | Nice to have | Phase 13 |
| 15 | Market Intelligence and Social Proof | Nice to have | Phase 12, 14 |
| 16 | Polish and Launch | Must have | All above |

## 4. Suggested Team Structure

| Role | Responsibility |
|------|---------------|
| Backend Developer | Node.js API, PostgreSQL, AI integration |
| Frontend Developer (Web) | Next.js web application, all portals |
| Mobile Developer | React Native Android app |
| UI/UX Designer | Storefront design, user flows, mobile design |
| AI/ML Engineer | AI matching, advisor, levy optimizer (can be part time or API based) |
| Project Manager | Coordination, timelines, stakeholder communication |
| QA Tester | Testing across web and mobile |

For a lean start, a team of 3 to 4 developers can handle Phases 1 through 11 if the backend and web developers are senior.

## 5. MVP Definition

**MVP includes Phases 1 through 11** — this gives you:
- working database and infrastructure
- user registration for all roles
- TP program management
- interactive storefront
- search and discovery
- enquiry system
- broadcast requests and proposals
- HRD Corp guidance
- subscription billing
- notifications
- basic AI matching
- admin portal

**Post MVP includes Phases 12 through 16** — analytics, all differentiating features, market intelligence, and launch preparation.
