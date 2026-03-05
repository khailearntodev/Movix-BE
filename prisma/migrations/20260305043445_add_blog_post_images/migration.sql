-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
