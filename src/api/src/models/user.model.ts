import { z } from 'zod';

// Base user schema (matches Prisma model)
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a user
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

// Schema for updating a user
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

// Schema for user ID param
export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

// Schema for list query params
export const listUsersQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
});

// TypeScript types derived from schemas
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
