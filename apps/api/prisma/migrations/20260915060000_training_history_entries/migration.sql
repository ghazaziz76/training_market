-- CreateTable
CREATE TABLE "training_history_entries" (
    "history_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'viewed',
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended_on" DATE,
    "participants_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_history_entries_pkey" PRIMARY KEY ("history_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_history_entries_user_id_program_id_key" ON "training_history_entries"("user_id", "program_id");

-- CreateIndex
CREATE INDEX "training_history_entries_user_id_last_viewed_at_idx" ON "training_history_entries"("user_id", "last_viewed_at");

-- CreateIndex
CREATE INDEX "training_history_entries_program_id_idx" ON "training_history_entries"("program_id");

-- AddForeignKey
ALTER TABLE "training_history_entries" ADD CONSTRAINT "training_history_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_history_entries" ADD CONSTRAINT "training_history_entries_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over existing attendance records (latest per user+program) as attended entries
INSERT INTO "training_history_entries" ("user_id", "program_id", "status", "first_viewed_at", "last_viewed_at", "attended_on", "participants_count", "notes", "created_at", "updated_at")
SELECT DISTINCT ON (a."user_id", a."program_id")
    a."user_id", a."program_id", 'attended', a."created_at", a."created_at", a."attended_on", a."participants_count", a."notes", a."created_at", CURRENT_TIMESTAMP
FROM "training_attendances" a
ORDER BY a."user_id", a."program_id", a."attended_on" DESC, a."created_at" DESC;

-- DropTable
DROP TABLE "training_attendances";
