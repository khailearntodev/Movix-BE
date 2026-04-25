-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RefundRequest" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "transaction_id" UUID NOT NULL,
  "reason" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefundRequest_user_id_fkey'
  ) THEN
    ALTER TABLE "RefundRequest"
      ADD CONSTRAINT "RefundRequest_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefundRequest_transaction_id_fkey'
  ) THEN
    ALTER TABLE "RefundRequest"
      ADD CONSTRAINT "RefundRequest_transaction_id_fkey"
      FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
