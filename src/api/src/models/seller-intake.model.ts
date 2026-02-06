import { z } from 'zod';

// Public seller intake form input
export const sellerIntakeSchema = z.object({
  // Required
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1, 'Company name is required'),

  // Optional contact
  phone: z.string().optional(),

  // Optional company info
  title: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),

  // Optional business details
  revenueRange: z.enum(['<$5M', '$5M-$10M', '$10M-$25M', '$25M-$50M', '$50M+']).optional(),
  employeeCount: z.enum(['1-10', '11-25', '26-50', '51-100', '100+']).optional(),

  // Optional transaction interest
  timeline: z.enum(['ASAP', '6-12 months', '1-2 years', '2+ years', 'Just exploring']).optional(),
  serviceInterest: z.enum(['sell-side', 'buy-side', 'strategic-consulting', 'valuation', 'not-sure']).optional(),

  // Additional
  message: z.string().optional(),
  source: z.string().optional(),
  referralSource: z.enum(['google', 'linkedin', 'referral', 'pe-firm', 'attorney', 'conference', 'other']).optional(),
});

// Admin update seller intake
export const updateSellerIntakeSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'engaged', 'closed']).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

// Admin query
export const sellerIntakeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

// Response
export const sellerIntakeResponseSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  companyName: z.string(),
  title: z.string().nullable(),
  industry: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  revenueRange: z.string().nullable(),
  employeeCount: z.string().nullable(),
  timeline: z.string().nullable(),
  serviceInterest: z.string().nullable(),
  message: z.string().nullable(),
  source: z.string().nullable(),
  referralSource: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  assignedTo: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Types
export type SellerIntakeInput = z.infer<typeof sellerIntakeSchema>;
export type UpdateSellerIntakeInput = z.infer<typeof updateSellerIntakeSchema>;
export type SellerIntakeQuery = z.infer<typeof sellerIntakeQuerySchema>;
export type SellerIntakeResponse = z.infer<typeof sellerIntakeResponseSchema>;
