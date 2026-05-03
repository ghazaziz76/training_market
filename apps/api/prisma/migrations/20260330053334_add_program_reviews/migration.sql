-- CreateTable
CREATE TABLE "program_reviews" (
    "review_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "program_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "comment" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE INDEX "program_reviews_program_id_idx" ON "program_reviews"("program_id");

-- CreateIndex
CREATE INDEX "program_reviews_provider_id_idx" ON "program_reviews"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_reviews_program_id_user_id_key" ON "program_reviews"("program_id", "user_id");

-- AddForeignKey
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "training_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
