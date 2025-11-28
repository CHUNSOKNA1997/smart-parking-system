/*
  Warnings:

  - The `status` column on the `bookings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_method` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `spot_type` on the `parking_spots` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpotType" AS ENUM ('CAR', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'KHQR', 'CARD');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "status",
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED';

-- AlterTable
ALTER TABLE "parking_spots" DROP COLUMN "spot_type",
ADD COLUMN     "spot_type" "SpotType" NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "parking_spots_spot_type_idx" ON "parking_spots"("spot_type");
