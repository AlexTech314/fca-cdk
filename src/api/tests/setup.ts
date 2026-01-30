import { prisma } from '../src/lib/prisma';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Clean up database before each test
beforeEach(async () => {
  // Clean all tables in correct order (respect foreign keys)
  await prisma.user.deleteMany();
});

// Disconnect from database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
