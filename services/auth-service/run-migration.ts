import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🔄 Running migration...');

    // Drop old column
    await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS verification_token`);
    console.log('✅ Dropped verification_token column');

    // Add new columns
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(6)`);
    console.log('✅ Added verification_otp column');

    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP`);
    console.log('✅ Added otp_expiry column');

    // Create index
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_users_verification_otp ON users(verification_otp)`);
    console.log('✅ Created index on verification_otp');

    // Drop old reset token column
    await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS reset_token`);
    console.log('✅ Dropped reset_token column');

    await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expiry`);
    console.log('✅ Dropped reset_token_expiry column');

    // Add reset OTP columns
    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6)`);
    console.log('✅ Added reset_otp column');

    await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP`);
    console.log('✅ Added reset_otp_expiry column');

    // Create index for reset OTP
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_users_reset_otp ON users(reset_otp)`);
    console.log('✅ Created index on reset_otp');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
