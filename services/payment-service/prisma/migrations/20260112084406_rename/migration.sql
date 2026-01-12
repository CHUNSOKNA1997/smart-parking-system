-- AlterTable
ALTER TABLE "transactions" RENAME CONSTRAINT "khqr_payments_pkey" TO "transactions_pkey";

-- RenameIndex
ALTER INDEX "khqr_payments_booking_id_idx" RENAME TO "transactions_booking_id_idx";

-- RenameIndex
ALTER INDEX "khqr_payments_created_at_idx" RENAME TO "transactions_created_at_idx";

-- RenameIndex
ALTER INDEX "khqr_payments_status_idx" RENAME TO "transactions_status_idx";

-- RenameIndex
ALTER INDEX "khqr_payments_transaction_hash_idx" RENAME TO "transactions_transaction_hash_idx";

-- RenameIndex
ALTER INDEX "khqr_payments_transaction_hash_key" RENAME TO "transactions_transaction_hash_key";

-- RenameIndex
ALTER INDEX "khqr_payments_user_id_idx" RENAME TO "transactions_user_id_idx";
