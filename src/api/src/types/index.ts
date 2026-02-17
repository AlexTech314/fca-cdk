import { Request } from 'express';

// Extend Express Request type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Generic API response types
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Error response type
export interface ErrorResponse {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}
