import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
};

// Use global variable to preserve Prisma client across hot reloads in development
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Log queries in development
prisma.$on('query' as never, (e: { query: string; duration: number }) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
});

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ error: e.message }, 'Prisma Error');
});

export default prisma;
