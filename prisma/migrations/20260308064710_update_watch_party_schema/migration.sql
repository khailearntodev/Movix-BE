-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "can_create_watch_party" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_kick_mute_members" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_watch_party_participants" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WatchParty" ADD COLUMN     "max_participants" INTEGER NOT NULL DEFAULT 100;
