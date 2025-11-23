/*
  Warnings:

  - The `gender` column on the `Person` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "place_of_birth" TEXT,
DROP COLUMN "gender",
ADD COLUMN     "gender" INTEGER;
