import 'dotenv/config';
import { Server } from 'http';
import app from './app.js';
import prisma from './config/prisma.js';
import logger from './utils/logger.js';

const PORT: number = parseInt(process.env.PORT || '3002', 10);

// Test database connection
prisma.$queryRaw`SELECT NOW()`
  .then((result) => {
    logger.info('Database connected successfully');
    logger.info(`Database time: ${result[0].now}`);
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

// Start server
const server: Server = app.listen(PORT, () => {
  logger.info(`🚀 Parking Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API: http://localhost:${PORT}/api/v1/`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
