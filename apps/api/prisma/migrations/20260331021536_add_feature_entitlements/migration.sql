-- CreateTable
CREATE TABLE "activation_codes" (
    "code_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(20) NOT NULL,
    "feature_key" VARCHAR(50) NOT NULL,
    "google_play_order_id" VARCHAR(255),
    "redeemed_by" UUID,
    "redeemed_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("code_id")
);

-- CreateTable
CREATE TABLE "feature_entitlements" (
    "entitlement_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "feature_key" VARCHAR(50) NOT NULL,
    "activation_code" VARCHAR(20),
    "activation_method" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_entitlements_pkey" PRIMARY KEY ("entitlement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activation_codes_code_key" ON "activation_codes"("code");

-- CreateIndex
CREATE INDEX "activation_codes_feature_key_idx" ON "activation_codes"("feature_key");

-- CreateIndex
CREATE INDEX "feature_entitlements_user_id_idx" ON "feature_entitlements"("user_id");

-- CreateIndex
CREATE INDEX "feature_entitlements_feature_key_idx" ON "feature_entitlements"("feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_entitlements_user_id_feature_key_key" ON "feature_entitlements"("user_id", "feature_key");

-- AddForeignKey
ALTER TABLE "feature_entitlements" ADD CONSTRAINT "feature_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
