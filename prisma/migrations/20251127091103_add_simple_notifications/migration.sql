/*
  Warnings:

  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MOVIE', 'COMMENT_REPLY', 'WATCH_PARTY_INVITE', 'SYSTEM');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "action_url" TEXT,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "title" VARCHAR(200) NOT NULL,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';
