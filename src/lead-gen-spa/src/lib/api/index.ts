/**
 * API Export
 * 
 * This file exports the active API implementation.
 * 
 * To switch from mock to real API:
 * 1. Uncomment the realApi import
 * 2. Change the export to use realApi
 * 
 * Example:
 *   import { realApi } from './client';
 *   export const api = realApi;
 */

import { mockApi } from './mock';
// import { realApi } from './client';  // Future: uncomment when backend is ready

// Export the mock API for now
export const api = mockApi;

// Future: Export the real API
// export const api = realApi;

// Re-export types for convenience
export type { LeadGenApi } from './types';
