-- AlterTable
ALTER TABLE "WatchParty" ADD COLUMN     "scheduled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WatchPartyReminder" (
    "id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchPartyReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchPartyReminder_party_id_user_id_key" ON "WatchPartyReminder"("party_id", "user_id");

-- AddForeignKey
ALTER TABLE "WatchPartyReminder" ADD CONSTRAINT "WatchPartyReminder_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "WatchParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyReminder" ADD CONSTRAINT "WatchPartyReminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
