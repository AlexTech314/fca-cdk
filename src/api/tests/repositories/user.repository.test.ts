import { userRepository } from '../../src/repositories/user.repository';
import { prisma } from '../../src/lib/prisma';

describe('UserRepository', () => {
  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const created = await prisma.user.create({
        data: { email: 'find@example.com' },
      });

      const user = await userRepository.findById(created.id);

      expect(user).toBeDefined();
      expect(user?.id).toBe(created.id);
      expect(user?.email).toBe(created.email);
    });

    it('should return null for non-existent ID', async () => {
      const user = await userRepository.findById('00000000-0000-0000-0000-000000000000');

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const created = await prisma.user.create({
        data: { email: 'email@example.com' },
      });

      const user = await userRepository.findByEmail(created.email);

      expect(user).toBeDefined();
      expect(user?.email).toBe(created.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await prisma.user.createMany({
        data: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
          { email: 'user3@example.com' },
        ],
      });
    });

    it('should return paginated users', async () => {
      const result = await userRepository.findMany({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should filter users by search term', async () => {
      const result = await userRepository.findMany({ page: 1, limit: 10, search: 'user1' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('user1@example.com');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const created = await prisma.user.create({
        data: { email: 'update@example.com' },
      });

      const updated = await userRepository.update(created.id, { email: 'updated@example.com' });

      expect(updated.email).toBe('updated@example.com');
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const created = await prisma.user.create({
        data: { email: 'delete@example.com' },
      });

      await userRepository.delete(created.id);

      const found = await userRepository.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing user', async () => {
      const created = await prisma.user.create({
        data: { email: 'exists@example.com' },
      });

      const exists = await userRepository.exists(created.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const exists = await userRepository.exists('00000000-0000-0000-0000-000000000000');

      expect(exists).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await prisma.user.create({
        data: { email: 'check@example.com' },
      });

      const exists = await userRepository.emailExists('check@example.com');

      expect(exists).toBe(true);
    });

    it('should exclude specified ID when checking email', async () => {
      const user = await prisma.user.create({
        data: { email: 'exclude@example.com' },
      });

      const exists = await userRepository.emailExists('exclude@example.com', user.id);

      expect(exists).toBe(false);
    });
  });
});
