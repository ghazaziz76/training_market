-- DropForeignKey
ALTER TABLE "tp_proposals" DROP CONSTRAINT "tp_proposals_request_id_fkey";

-- AlterTable
ALTER TABLE "tp_proposals" ADD COLUMN     "enquiry_id" UUID,
ALTER COLUMN "request_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tp_proposals_enquiry_id_idx" ON "tp_proposals"("enquiry_id");

-- AddForeignKey
ALTER TABLE "tp_proposals" ADD CONSTRAINT "tp_proposals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "training_request_broadcasts"("request_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tp_proposals" ADD CONSTRAINT "tp_proposals_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("enquiry_id") ON DELETE SET NULL ON UPDATE CASCADE;
