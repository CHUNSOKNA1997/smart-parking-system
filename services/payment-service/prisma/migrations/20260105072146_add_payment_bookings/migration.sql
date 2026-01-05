-- CreateTable
CREATE TABLE "payment_bookings" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_bookings_payment_id_idx" ON "payment_bookings"("payment_id");

-- CreateIndex
CREATE INDEX "payment_bookings_booking_id_idx" ON "payment_bookings"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_bookings_payment_id_booking_id_key" ON "payment_bookings"("payment_id", "booking_id");

-- AddForeignKey
ALTER TABLE "payment_bookings" ADD CONSTRAINT "payment_bookings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "khqr_payments"("payment_id") ON DELETE CASCADE ON UPDATE CASCADE;
