import { z } from 'zod';

// Base user schema (matches Prisma model)
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userRoleSchema = z.enum(['readonly', 'readwrite', 'admin']);

// Schema for creating a user
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: userRoleSchema.default('readonly'),
});

// Schema for updating a user
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
});

// Schema for user ID param
export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

// Schema for list query params (Express sends string | string[])
const parseQueryVal = (v: unknown): string | undefined =>
  Array.isArray(v) ? (v[0] as string) : typeof v === 'string' ? v : undefined;

export const listUsersQuerySchema = z.object({
  page: z.preprocess(parseQueryVal, z.coerce.number().default(1)),
  limit: z.preprocess(parseQueryVal, z.coerce.number().default(10)),
  search: z.preprocess(parseQueryVal, z.string().optional()),
});

// TypeScript types derived from schemas
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
