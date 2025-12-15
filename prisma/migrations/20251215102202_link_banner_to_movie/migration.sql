-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "movie_id" UUID;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
