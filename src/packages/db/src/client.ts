import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

prisma.$on('query' as never, (e: { query: string; duration: number }) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Prisma Query] ${e.query} (${e.duration}ms)`);
  }
});

prisma.$on('error' as never, (e: { message: string }) => {
  console.error(`[Prisma Error] ${e.message}`);
});

export default prisma;
