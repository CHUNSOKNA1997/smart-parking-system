/*
  Warnings:

  - The `currency` column on the `khqr_payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `khqr_payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[md5_hash]` on the table `khqr_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'KHR');

-- AlterTable
ALTER TABLE "khqr_payments" ADD COLUMN     "expires_at" TIMESTAMP(3),
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "khqr_payments_md5_hash_key" ON "khqr_payments"("md5_hash");

-- CreateIndex
CREATE INDEX "khqr_payments_status_idx" ON "khqr_payments"("status");
