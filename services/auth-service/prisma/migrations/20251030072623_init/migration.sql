/*
  Warnings:

  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `reset_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `reset_token_expiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parking_spots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_spot_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "users_reset_token_idx";

-- DropIndex
DROP INDEX "users_verification_token_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone",
DROP COLUMN "reset_token",
DROP COLUMN "reset_token_expiry",
DROP COLUMN "verification_token",
ADD COLUMN     "otp_expiry" TIMESTAMP(3),
ADD COLUMN     "reset_otp" VARCHAR(6),
ADD COLUMN     "reset_otp_expiry" TIMESTAMP(3),
ADD COLUMN     "verification_otp" VARCHAR(6);

-- DropTable
DROP TABLE "bookings";

-- DropTable
DROP TABLE "parking_spots";

-- DropTable
DROP TABLE "transactions";

-- CreateIndex
CREATE INDEX "users_verification_otp_idx" ON "users"("verification_otp");

-- CreateIndex
CREATE INDEX "users_reset_otp_idx" ON "users"("reset_otp");
