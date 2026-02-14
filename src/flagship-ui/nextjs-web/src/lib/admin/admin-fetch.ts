import { getAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Authenticated fetch for admin API calls.
 * Automatically attaches the Cognito access token as a Bearer header.
 * Calls the Express API directly (no Next.js proxy).
 */
export async function adminFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(`${API_URL}/admin${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
}

/**
 * Authenticated fetch for Next.js API route calls (e.g. /api/admin/...).
 * Works like fetch() but automatically attaches the Cognito access token.
 * Use this instead of bare fetch() for any /api/admin/* route.
 */
export async function authedApiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getAccessToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
}
