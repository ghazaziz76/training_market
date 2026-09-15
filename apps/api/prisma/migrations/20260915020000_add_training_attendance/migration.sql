-- CreateTable
CREATE TABLE "training_attendances" (
    "attendance_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "attended_on" DATE NOT NULL,
    "participants_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_attendances_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateIndex
CREATE INDEX "training_attendances_user_id_idx" ON "training_attendances"("user_id");

-- CreateIndex
CREATE INDEX "training_attendances_program_id_idx" ON "training_attendances"("program_id");

-- AddForeignKey
ALTER TABLE "training_attendances" ADD CONSTRAINT "training_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_attendances" ADD CONSTRAINT "training_attendances_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;
