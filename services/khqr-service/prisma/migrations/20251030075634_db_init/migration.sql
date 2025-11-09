-- CreateTable
CREATE TABLE "khqr_payments" (
    "payment_id" UUID NOT NULL,
    "booking_id" UUID,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "qr_string" TEXT,
    "deeplink_url" TEXT,
    "transaction_hash" VARCHAR(255),
    "md5_hash" VARCHAR(32),
    "from_account_id" VARCHAR(100),
    "to_account_id" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(20) NOT NULL DEFAULT 'khqr',
    "description" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khqr_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "khqr_tokens" (
    "token_id" UUID NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "organization" VARCHAR(100) NOT NULL,
    "project" VARCHAR(100) NOT NULL,
    "token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_renewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khqr_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "khqr_payments_transaction_hash_key" ON "khqr_payments"("transaction_hash");

-- CreateIndex
CREATE INDEX "khqr_payments_user_id_idx" ON "khqr_payments"("user_id");

-- CreateIndex
CREATE INDEX "khqr_payments_booking_id_idx" ON "khqr_payments"("booking_id");

-- CreateIndex
CREATE INDEX "khqr_payments_status_idx" ON "khqr_payments"("status");

-- CreateIndex
CREATE INDEX "khqr_payments_transaction_hash_idx" ON "khqr_payments"("transaction_hash");

-- CreateIndex
CREATE INDEX "khqr_payments_created_at_idx" ON "khqr_payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "khqr_tokens_email_key" ON "khqr_tokens"("email");

-- CreateIndex
CREATE INDEX "khqr_tokens_email_idx" ON "khqr_tokens"("email");

-- CreateIndex
CREATE INDEX "khqr_tokens_is_active_idx" ON "khqr_tokens"("is_active");
