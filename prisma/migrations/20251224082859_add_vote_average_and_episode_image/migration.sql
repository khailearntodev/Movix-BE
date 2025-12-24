-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "video_image_url" TEXT;

-- AlterTable
ALTER TABLE "movies" ADD COLUMN     "vote_average" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "vote_count" INTEGER DEFAULT 0;
