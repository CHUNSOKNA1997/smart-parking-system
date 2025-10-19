// Prisma Client Instance
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],  // Removed 'query' to reduce noise
});

// Handle connection
prisma.$connect()
  .then(() => console.log('✅ Prisma connected to database'))
  .catch((err) => {
    console.error('❌ Prisma connection failed:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
