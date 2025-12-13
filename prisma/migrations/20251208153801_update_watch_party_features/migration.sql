-- AlterTable
ALTER TABLE "WatchPartyMember" ADD COLUMN     "is_banned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WatchPartyMessage" ADD COLUMN     "flag_reason" TEXT,
ADD COLUMN     "is_flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toxicity_score" DOUBLE PRECISION DEFAULT 0;
