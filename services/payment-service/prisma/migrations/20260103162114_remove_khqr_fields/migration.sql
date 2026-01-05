-- Remove KHQR-specific fields that are not needed for PayWay
-- This migration removes unused fields but keeps the table structure intact

-- Drop unused indexes first
DROP INDEX IF EXISTS "khqr_payments_md5_hash_key";

-- Drop unused columns
ALTER TABLE "khqr_payments" DROP COLUMN IF EXISTS "md5_hash";
ALTER TABLE "khqr_payments" DROP COLUMN IF EXISTS "from_account_id";
ALTER TABLE "khqr_payments" DROP COLUMN IF EXISTS "to_account_id";

-- Update default payment method to 'payway'
ALTER TABLE "khqr_payments" ALTER COLUMN "payment_method" SET DEFAULT 'payway';

-- Drop the unused KHQRToken table (if it exists)
DROP TABLE IF EXISTS "khqr_tokens";
