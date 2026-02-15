/**
 * API Export
 * 
 * Switches between mock and real API based on VITE_USE_MOCK_API env var.
 * Default: real API (set VITE_USE_MOCK_API=true for local dev without backend).
 */

import { mockApi } from './mock';
import { realApi } from './client';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export const api = USE_MOCK_API ? mockApi : realApi;

// Re-export types for convenience
export type { LeadGenApi } from './types';
