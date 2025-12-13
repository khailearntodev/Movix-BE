-- AlterTable
ALTER TABLE "WatchParty" ADD COLUMN     "is_30m_notified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_start_notified" BOOLEAN NOT NULL DEFAULT false;
