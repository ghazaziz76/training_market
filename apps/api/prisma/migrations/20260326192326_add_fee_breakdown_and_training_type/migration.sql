-- AlterTable
ALTER TABLE "tp_proposals" ADD COLUMN     "fee_per_group" DECIMAL(12,2),
ADD COLUMN     "fee_per_pax" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "training_request_broadcasts" ADD COLUMN     "training_type" VARCHAR(20) NOT NULL DEFAULT 'public';
