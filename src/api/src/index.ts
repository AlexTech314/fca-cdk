import { createApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  await prisma.$disconnect();
  logger.info('Database connection closed');

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

// Start server
const start = async (): Promise<void> => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(config.PORT, () => {
      logger.info(
        { port: config.PORT, env: config.NODE_ENV },
        `Server started on port ${config.PORT}`
      );
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
