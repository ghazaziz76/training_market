-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "role" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "password_hash" VARCHAR(255) NOT NULL,
    "profile_image_url" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" VARCHAR(255),
    "reset_token" VARCHAR(255),
    "reset_token_expiry" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "token_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_info" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "employer_profiles" (
    "employer_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(255),
    "registration_no" VARCHAR(100),
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "contact_person" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postcode" VARCHAR(10),
    "hrd_corp_registered" BOOLEAN NOT NULL DEFAULT false,
    "hrd_corp_levy_balance" DECIMAL(12,2),
    "training_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profile_completion_pct" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("employer_id")
);

-- CreateTable
CREATE TABLE "individual_profiles" (
    "individual_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "occupation" VARCHAR(255),
    "education_level" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "skill_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "career_goals" TEXT,
    "preferred_training_mode" VARCHAR(20),
    "profile_completion_pct" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_profiles_pkey" PRIMARY KEY ("individual_id")
);

-- CreateTable
CREATE TABLE "training_providers" (
    "provider_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "provider_name" VARCHAR(255),
    "registration_no" VARCHAR(100),
    "business_description" TEXT,
    "contact_person" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postcode" VARCHAR(10),
    "website" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "accreditation_details" TEXT,
    "quality_tier" VARCHAR(20) NOT NULL DEFAULT 'unverified',
    "quality_tier_updated_at" TIMESTAMP(3),
    "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "verification_notes" TEXT,
    "hrd_corp_registered_provider" BOOLEAN NOT NULL DEFAULT false,
    "hrd_corp_provider_id" VARCHAR(100),
    "response_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_response_time" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_completed_programs" INTEGER NOT NULL DEFAULT 0,
    "awards_won" INTEGER NOT NULL DEFAULT 0,
    "profile_completion_pct" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_providers_pkey" PRIMARY KEY ("provider_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "icon" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "skill_tags" (
    "tag_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "category_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_tags_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "program_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT,
    "target_group" TEXT,
    "duration_hours" INTEGER,
    "duration_days" INTEGER,
    "program_type" VARCHAR(20) NOT NULL DEFAULT 'public',
    "fee_per_pax" DECIMAL(12,2),
    "fee_per_group" DECIMAL(12,2),
    "min_group_size" INTEGER,
    "max_group_size" INTEGER,
    "early_bird_fee" DECIMAL(12,2),
    "fee_notes" TEXT,
    "agenda" JSONB NOT NULL DEFAULT '[]',
    "skill_type" VARCHAR(20) NOT NULL DEFAULT 'technical',
    "is_certification" BOOLEAN NOT NULL DEFAULT false,
    "certification_name" VARCHAR(255),
    "short_description" VARCHAR(500),
    "prerequisites" TEXT,
    "industry_focus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delivery_mode" VARCHAR(20) NOT NULL,
    "location" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "min_participants" INTEGER,
    "max_participants" INTEGER,
    "language" VARCHAR(50) NOT NULL DEFAULT 'English',
    "materials_provided" TEXT,
    "thumbnail_url" VARCHAR(500),
    "brochure_url" VARCHAR(500),
    "hrd_corp_claimable" BOOLEAN NOT NULL DEFAULT false,
    "hrd_corp_scheme" VARCHAR(100),
    "hrd_corp_program_id" VARCHAR(100),
    "effectiveness_score" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "enquiry_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("program_id")
);

-- CreateTable
CREATE TABLE "program_skill_tags" (
    "program_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "program_skill_tags_pkey" PRIMARY KEY ("program_id","tag_id")
);

-- CreateTable
CREATE TABLE "program_schedules" (
    "schedule_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "venue" VARCHAR(500),
    "online_platform" VARCHAR(255),
    "available_seats" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "trainers" (
    "trainer_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "qualification" TEXT,
    "specialization" VARCHAR(255),
    "bio" TEXT,
    "photo_url" VARCHAR(500),
    "years_experience" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("trainer_id")
);

-- CreateTable
CREATE TABLE "program_trainers" (
    "program_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,

    CONSTRAINT "program_trainers_pkey" PRIMARY KEY ("program_id","trainer_id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "enquiry_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "requester_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "program_id" UUID,
    "enquiry_type" VARCHAR(30) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "message" TEXT NOT NULL,
    "participant_count" INTEGER,
    "preferred_dates" VARCHAR(255),
    "budget_range" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("enquiry_id")
);

-- CreateTable
CREATE TABLE "enquiry_replies" (
    "reply_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "enquiry_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_replies_pkey" PRIMARY KEY ("reply_id")
);

-- CreateTable
CREATE TABLE "training_request_broadcasts" (
    "request_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employer_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "target_audience" TEXT,
    "participant_count" INTEGER NOT NULL,
    "preferred_mode" VARCHAR(20) NOT NULL DEFAULT 'any',
    "preferred_location" VARCHAR(255),
    "preferred_dates" VARCHAR(255),
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "industry_context" VARCHAR(255),
    "target_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "response_deadline" DATE NOT NULL,
    "total_proposals" INTEGER NOT NULL DEFAULT 0,
    "awarded_provider_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_request_broadcasts_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "tp_proposals" (
    "proposal_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "request_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "program_id" UUID,
    "proposal_message" TEXT NOT NULL,
    "proposed_fee" DECIMAL(12,2) NOT NULL,
    "fee_breakdown" TEXT,
    "proposed_schedule" VARCHAR(500) NOT NULL,
    "proposed_duration" VARCHAR(255),
    "trainer_details" TEXT,
    "value_add_offers" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "ai_value_score" INTEGER,
    "employer_notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tp_proposals_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateTable
CREATE TABLE "hrd_corp_guidance_rules" (
    "rule_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "scheme_name" VARCHAR(255) NOT NULL,
    "scheme_code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "eligibility_criteria" JSONB NOT NULL DEFAULT '[]',
    "required_documents" JSONB NOT NULL DEFAULT '[]',
    "process_steps" JSONB NOT NULL DEFAULT '[]',
    "useful_links" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrd_corp_guidance_rules_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "hrd_corp_checklists" (
    "checklist_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employer_id" UUID NOT NULL,
    "program_id" UUID,
    "proposal_id" UUID,
    "enquiry_id" UUID,
    "scheme_code" VARCHAR(50) NOT NULL,
    "checklist_items" JSONB NOT NULL DEFAULT '[]',
    "overall_readiness_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrd_corp_checklists_pkey" PRIMARY KEY ("checklist_id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "plan_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "plan_name" VARCHAR(255) NOT NULL,
    "plan_code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "billing_cycle" VARCHAR(20) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'MYR',
    "features" JSONB NOT NULL DEFAULT '[]',
    "max_programs" INTEGER,
    "max_featured_listings" INTEGER NOT NULL DEFAULT 0,
    "analytics_level" VARCHAR(20) NOT NULL DEFAULT 'basic',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "subscription_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "gateway_subscription_id" VARCHAR(255),
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "transaction_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'MYR',
    "payment_method" VARCHAR(50),
    "gateway_ref" VARCHAR(255),
    "invoice_number" VARCHAR(50),
    "invoice_url" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "featured_listings" (
    "listing_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID,
    "provider_id" UUID,
    "listing_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "image_url" VARCHAR(500),
    "link_url" VARCHAR(500),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "priority_rank" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_listings_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "promotion_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "promotion_type" VARCHAR(30) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "discount_value" DECIMAL(12,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("promotion_id")
);

-- CreateTable
CREATE TABLE "saved_programs" (
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_programs_pkey" PRIMARY KEY ("user_id","program_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "action_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "user_device_tokens" (
    "token_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "device_token" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_device_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "preference_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "email_enquiry_received" BOOLEAN NOT NULL DEFAULT true,
    "email_enquiry_reply" BOOLEAN NOT NULL DEFAULT true,
    "email_broadcast_request" BOOLEAN NOT NULL DEFAULT true,
    "email_proposal_update" BOOLEAN NOT NULL DEFAULT true,
    "email_subscription_reminder" BOOLEAN NOT NULL DEFAULT true,
    "email_marketing" BOOLEAN NOT NULL DEFAULT false,
    "push_enquiry_received" BOOLEAN NOT NULL DEFAULT true,
    "push_enquiry_reply" BOOLEAN NOT NULL DEFAULT true,
    "push_broadcast_request" BOOLEAN NOT NULL DEFAULT true,
    "push_proposal_update" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "activity_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "activity_type" VARCHAR(30) NOT NULL,
    "target_id" UUID,
    "target_type" VARCHAR(30),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "history_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "search_query" VARCHAR(500) NOT NULL,
    "filters_applied" JSONB NOT NULL DEFAULT '{}',
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "program_embeddings" (
    "program_id" UUID NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embedding_model" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_embeddings_pkey" PRIMARY KEY ("program_id")
);

-- CreateTable
CREATE TABLE "ai_match_records" (
    "match_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "query_text" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "match_reason" TEXT,
    "ranking_position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_match_records_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "advisor_conversations" (
    "conversation_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "messages" JSONB NOT NULL DEFAULT '[]',
    "programs_recommended" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisor_conversations_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "group_training_pools" (
    "pool_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "skill_topic" VARCHAR(255) NOT NULL,
    "delivery_mode" VARCHAR(20) NOT NULL,
    "location" VARCHAR(255),
    "target_date_range" VARCHAR(255),
    "min_participants" INTEGER NOT NULL DEFAULT 10,
    "total_participants" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'forming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_training_pools_pkey" PRIMARY KEY ("pool_id")
);

-- CreateTable
CREATE TABLE "pool_participants" (
    "participant_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pool_id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_participants_pkey" PRIMARY KEY ("participant_id")
);

-- CreateTable
CREATE TABLE "pool_tp_offers" (
    "offer_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pool_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "program_id" UUID,
    "group_fee_per_pax" DECIMAL(12,2) NOT NULL,
    "total_group_fee" DECIMAL(12,2) NOT NULL,
    "proposed_dates" VARCHAR(255),
    "details" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_tp_offers_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "effectiveness_records" (
    "record_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "kpi_description" TEXT NOT NULL,
    "baseline_value" VARCHAR(255) NOT NULL,
    "target_value" VARCHAR(255) NOT NULL,
    "actual_value" VARCHAR(255),
    "survey_30_day" JSONB,
    "survey_60_day" JSONB,
    "survey_90_day" JSONB,
    "impact_rating" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'tracking',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "effectiveness_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "annual_training_plans" (
    "plan_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employer_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "total_budget" DECIMAL(12,2) NOT NULL,
    "departments" JSONB NOT NULL DEFAULT '[]',
    "planned_items" JSONB NOT NULL DEFAULT '[]',
    "completion_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_training_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "levy_utilization_records" (
    "record_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employer_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "total_levy" DECIMAL(12,2) NOT NULL,
    "utilized_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(12,2) NOT NULL,
    "utilization_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levy_utilization_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "daily_program_stats" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_views" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "enquiries" INTEGER NOT NULL DEFAULT 0,
    "search_appearances" INTEGER NOT NULL DEFAULT 0,
    "recommendation_appearances" INTEGER NOT NULL DEFAULT 0,
    "clicks_from_search" INTEGER NOT NULL DEFAULT 0,
    "clicks_from_recommendation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_program_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_provider_stats" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "total_enquiries" INTEGER NOT NULL DEFAULT 0,
    "total_proposals_submitted" INTEGER NOT NULL DEFAULT 0,
    "proposals_shortlisted" INTEGER NOT NULL DEFAULT 0,
    "proposals_selected" INTEGER NOT NULL DEFAULT 0,
    "average_response_hours" DECIMAL(8,2),

    CONSTRAINT "daily_provider_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_platform_stats" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "date" DATE NOT NULL,
    "total_users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "total_searches" INTEGER NOT NULL DEFAULT 0,
    "total_program_views" INTEGER NOT NULL DEFAULT 0,
    "total_enquiries" INTEGER NOT NULL DEFAULT 0,
    "total_broadcast_requests" INTEGER NOT NULL DEFAULT 0,
    "total_proposals" INTEGER NOT NULL DEFAULT 0,
    "total_active_subscriptions" INTEGER NOT NULL DEFAULT 0,
    "daily_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "daily_platform_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_intelligence_reports" (
    "report_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "report_type" VARCHAR(50) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_intelligence_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "log_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "admin_user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "details" JSONB,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "employer_profiles_user_id_key" ON "employer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "employer_profiles_industry_idx" ON "employer_profiles"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "individual_profiles_user_id_key" ON "individual_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_providers_user_id_key" ON "training_providers"("user_id");

-- CreateIndex
CREATE INDEX "training_providers_quality_tier_idx" ON "training_providers"("quality_tier");

-- CreateIndex
CREATE INDEX "training_providers_verification_status_idx" ON "training_providers"("verification_status");

-- CreateIndex
CREATE INDEX "training_providers_status_idx" ON "training_providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_tags_slug_key" ON "skill_tags"("slug");

-- CreateIndex
CREATE INDEX "skill_tags_slug_idx" ON "skill_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "training_programs_slug_key" ON "training_programs"("slug");

-- CreateIndex
CREATE INDEX "training_programs_provider_id_idx" ON "training_programs"("provider_id");

-- CreateIndex
CREATE INDEX "training_programs_category_id_idx" ON "training_programs"("category_id");

-- CreateIndex
CREATE INDEX "training_programs_status_idx" ON "training_programs"("status");

-- CreateIndex
CREATE INDEX "training_programs_program_type_idx" ON "training_programs"("program_type");

-- CreateIndex
CREATE INDEX "training_programs_skill_type_idx" ON "training_programs"("skill_type");

-- CreateIndex
CREATE INDEX "training_programs_delivery_mode_idx" ON "training_programs"("delivery_mode");

-- CreateIndex
CREATE INDEX "training_programs_hrd_corp_claimable_idx" ON "training_programs"("hrd_corp_claimable");

-- CreateIndex
CREATE INDEX "training_programs_published_at_idx" ON "training_programs"("published_at");

-- CreateIndex
CREATE INDEX "program_schedules_program_id_idx" ON "program_schedules"("program_id");

-- CreateIndex
CREATE INDEX "program_schedules_start_date_idx" ON "program_schedules"("start_date");

-- CreateIndex
CREATE INDEX "trainers_provider_id_idx" ON "trainers"("provider_id");

-- CreateIndex
CREATE INDEX "enquiries_requester_id_idx" ON "enquiries"("requester_id");

-- CreateIndex
CREATE INDEX "enquiries_provider_id_idx" ON "enquiries"("provider_id");

-- CreateIndex
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");

-- CreateIndex
CREATE INDEX "enquiry_replies_enquiry_id_idx" ON "enquiry_replies"("enquiry_id");

-- CreateIndex
CREATE INDEX "training_request_broadcasts_employer_id_idx" ON "training_request_broadcasts"("employer_id");

-- CreateIndex
CREATE INDEX "training_request_broadcasts_status_idx" ON "training_request_broadcasts"("status");

-- CreateIndex
CREATE INDEX "training_request_broadcasts_response_deadline_idx" ON "training_request_broadcasts"("response_deadline");

-- CreateIndex
CREATE INDEX "tp_proposals_request_id_idx" ON "tp_proposals"("request_id");

-- CreateIndex
CREATE INDEX "tp_proposals_provider_id_idx" ON "tp_proposals"("provider_id");

-- CreateIndex
CREATE INDEX "tp_proposals_status_idx" ON "tp_proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tp_proposals_request_id_provider_id_key" ON "tp_proposals"("request_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "hrd_corp_guidance_rules_scheme_code_key" ON "hrd_corp_guidance_rules"("scheme_code");

-- CreateIndex
CREATE UNIQUE INDEX "hrd_corp_checklists_proposal_id_key" ON "hrd_corp_checklists"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "hrd_corp_checklists_enquiry_id_key" ON "hrd_corp_checklists"("enquiry_id");

-- CreateIndex
CREATE INDEX "hrd_corp_checklists_employer_id_idx" ON "hrd_corp_checklists"("employer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code");

-- CreateIndex
CREATE INDEX "subscriptions_provider_id_idx" ON "subscriptions"("provider_id");

-- CreateIndex
CREATE INDEX "subscriptions_payment_status_idx" ON "subscriptions"("payment_status");

-- CreateIndex
CREATE INDEX "payment_transactions_subscription_id_idx" ON "payment_transactions"("subscription_id");

-- CreateIndex
CREATE INDEX "featured_listings_listing_type_status_idx" ON "featured_listings"("listing_type", "status");

-- CreateIndex
CREATE INDEX "promotions_program_id_idx" ON "promotions"("program_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_tokens_device_token_key" ON "user_device_tokens"("device_token");

-- CreateIndex
CREATE INDEX "user_device_tokens_user_id_idx" ON "user_device_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_user_id_idx" ON "user_activities"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_activity_type_idx" ON "user_activities"("activity_type");

-- CreateIndex
CREATE INDEX "user_activities_target_id_target_type_idx" ON "user_activities"("target_id", "target_type");

-- CreateIndex
CREATE INDEX "user_activities_created_at_idx" ON "user_activities"("created_at");

-- CreateIndex
CREATE INDEX "search_history_user_id_idx" ON "search_history"("user_id");

-- CreateIndex
CREATE INDEX "search_history_created_at_idx" ON "search_history"("created_at");

-- CreateIndex
CREATE INDEX "ai_match_records_user_id_idx" ON "ai_match_records"("user_id");

-- CreateIndex
CREATE INDEX "ai_match_records_program_id_idx" ON "ai_match_records"("program_id");

-- CreateIndex
CREATE INDEX "advisor_conversations_user_id_idx" ON "advisor_conversations"("user_id");

-- CreateIndex
CREATE INDEX "group_training_pools_status_idx" ON "group_training_pools"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pool_participants_pool_id_employer_id_key" ON "pool_participants"("pool_id", "employer_id");

-- CreateIndex
CREATE INDEX "effectiveness_records_program_id_idx" ON "effectiveness_records"("program_id");

-- CreateIndex
CREATE INDEX "effectiveness_records_employer_id_idx" ON "effectiveness_records"("employer_id");

-- CreateIndex
CREATE UNIQUE INDEX "annual_training_plans_employer_id_year_key" ON "annual_training_plans"("employer_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "levy_utilization_records_employer_id_year_key" ON "levy_utilization_records"("employer_id", "year");

-- CreateIndex
CREATE INDEX "daily_program_stats_date_idx" ON "daily_program_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_program_stats_program_id_date_key" ON "daily_program_stats"("program_id", "date");

-- CreateIndex
CREATE INDEX "daily_provider_stats_date_idx" ON "daily_provider_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_provider_stats_provider_id_date_key" ON "daily_provider_stats"("provider_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_platform_stats_date_key" ON "daily_platform_stats"("date");

-- CreateIndex
CREATE INDEX "market_intelligence_reports_report_type_idx" ON "market_intelligence_reports"("report_type");

-- CreateIndex
CREATE INDEX "market_intelligence_reports_period_start_idx" ON "market_intelligence_reports"("period_start");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_profiles" ADD CONSTRAINT "individual_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_providers" ADD CONSTRAINT "training_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tags" ADD CONSTRAINT "skill_tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_skill_tags" ADD CONSTRAINT "program_skill_tags_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_skill_tags" ADD CONSTRAINT "program_skill_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "skill_tags"("tag_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_schedules" ADD CONSTRAINT "program_schedules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_trainers" ADD CONSTRAINT "program_trainers_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_trainers" ADD CONSTRAINT "program_trainers_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("trainer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_replies" ADD CONSTRAINT "enquiry_replies_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("enquiry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_replies" ADD CONSTRAINT "enquiry_replies_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_request_broadcasts" ADD CONSTRAINT "training_request_broadcasts_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_proposals" ADD CONSTRAINT "tp_proposals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "training_request_broadcasts"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_proposals" ADD CONSTRAINT "tp_proposals_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_proposals" ADD CONSTRAINT "tp_proposals_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_corp_checklists" ADD CONSTRAINT "hrd_corp_checklists_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_corp_checklists" ADD CONSTRAINT "hrd_corp_checklists_scheme_code_fkey" FOREIGN KEY ("scheme_code") REFERENCES "hrd_corp_guidance_rules"("scheme_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_corp_checklists" ADD CONSTRAINT "hrd_corp_checklists_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "tp_proposals"("proposal_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrd_corp_checklists" ADD CONSTRAINT "hrd_corp_checklists_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("enquiry_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_embeddings" ADD CONSTRAINT "program_embeddings_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_match_records" ADD CONSTRAINT "ai_match_records_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_conversations" ADD CONSTRAINT "advisor_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_participants" ADD CONSTRAINT "pool_participants_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "group_training_pools"("pool_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_participants" ADD CONSTRAINT "pool_participants_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_tp_offers" ADD CONSTRAINT "pool_tp_offers_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "group_training_pools"("pool_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_tp_offers" ADD CONSTRAINT "pool_tp_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_records" ADD CONSTRAINT "effectiveness_records_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_records" ADD CONSTRAINT "effectiveness_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_records" ADD CONSTRAINT "effectiveness_records_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_training_plans" ADD CONSTRAINT "annual_training_plans_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levy_utilization_records" ADD CONSTRAINT "levy_utilization_records_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_profiles"("employer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
