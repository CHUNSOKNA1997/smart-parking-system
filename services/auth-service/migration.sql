-- Migration to add OTP fields and remove verificationToken
ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;

-- Create index on verification_otp
CREATE INDEX IF NOT EXISTS idx_users_verification_otp ON users(verification_otp);
