import { bootstrapDatabaseUrl } from './lib/bootstrap-db';

const gracefulShutdown = async (signal: string, prisma: { $disconnect: () => Promise<void> }, logger: { info: (msg: string) => void }): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  await prisma.$disconnect();
  logger.info('Database connection closed');
  process.exit(0);
};

const start = async (): Promise<void> => {
  await bootstrapDatabaseUrl();

  const { createApp } = await import('./app');
  const { config } = await import('./config');
  const { logger } = await import('./lib/logger');
  const { prisma } = await import('./lib/prisma');

  const app = createApp();

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', prisma, logger));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', prisma, logger));
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled Rejection');
  });
  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
  });

  try {
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
