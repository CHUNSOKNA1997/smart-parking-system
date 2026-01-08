/*
  Warnings:

  - The primary key for the `parking_spots` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `level` on the `parking_spots` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `parking_spots` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[spot_name]` on the table `parking_spots` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `spot_id` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `spot_name` to the `parking_spots` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `spot_id` on the `parking_spots` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_spot_id_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "spot_id",
ADD COLUMN     "spot_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "parking_spots" DROP CONSTRAINT "parking_spots_pkey",
DROP COLUMN "level",
DROP COLUMN "section",
ADD COLUMN     "spot_name" VARCHAR(20) NOT NULL,
DROP COLUMN "spot_id",
ADD COLUMN     "spot_id" UUID NOT NULL,
ADD CONSTRAINT "parking_spots_pkey" PRIMARY KEY ("spot_id");

-- CreateIndex
CREATE INDEX "bookings_spot_id_idx" ON "bookings"("spot_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_spots_spot_name_key" ON "parking_spots"("spot_name");

-- CreateIndex
CREATE INDEX "parking_spots_spot_name_idx" ON "parking_spots"("spot_name");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "parking_spots"("spot_id") ON DELETE CASCADE ON UPDATE CASCADE;
