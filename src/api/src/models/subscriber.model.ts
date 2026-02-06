import { z } from 'zod';

// Newsletter subscription input (public)
export const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  source: z.string().optional(),
});

// Admin subscriber query
export const subscriberQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  subscribed: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// Subscriber response
export const subscriberResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string().nullable(),
  source: z.string().nullable(),
  isSubscribed: z.boolean(),
  subscribedAt: z.date(),
  unsubscribedAt: z.date().nullable(),
});

// Types
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SubscriberQuery = z.infer<typeof subscriberQuerySchema>;
export type SubscriberResponse = z.infer<typeof subscriberResponseSchema>;
