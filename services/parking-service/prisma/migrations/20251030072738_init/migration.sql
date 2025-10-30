-- CreateTable
CREATE TABLE "parking_spots" (
    "spot_id" VARCHAR(10) NOT NULL,
    "level" INTEGER NOT NULL,
    "section" VARCHAR(10) NOT NULL,
    "spot_type" VARCHAR(20) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price_per_hour" DECIMAL(10,2) NOT NULL DEFAULT 2.00,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parking_spots_pkey" PRIMARY KEY ("spot_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "spot_id" VARCHAR(10) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "duration_hours" DECIMAL(4,2),
    "total_price" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'reserved',
    "qr_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" UUID NOT NULL,
    "booking_id" UUID,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'cash',
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE INDEX "parking_spots_is_available_idx" ON "parking_spots"("is_available");

-- CreateIndex
CREATE INDEX "parking_spots_spot_type_idx" ON "parking_spots"("spot_type");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_spot_id_idx" ON "bookings"("spot_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_start_time_end_time_idx" ON "bookings"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_booking_id_idx" ON "transactions"("booking_id");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "parking_spots"("spot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;
