-- AlterTable
ALTER TABLE "training_providers" ADD COLUMN     "hrd_corp_certificate_url" VARCHAR(500),
ADD COLUMN     "specializations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "year_established" INTEGER;
