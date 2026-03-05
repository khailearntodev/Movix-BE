-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" "Gender" DEFAULT 'UNKNOWN';
