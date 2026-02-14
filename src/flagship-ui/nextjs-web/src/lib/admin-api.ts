import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

interface ProxyOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  queryString?: string;
}

/**
 * Shared admin API proxy. Forwards requests to the Express backend
 * with optional auth and body. All admin route handlers use this.
 *
 * When auth is true, forwards the client's Authorization header
 * (Cognito JWT) to the Express API.
 */
export async function adminProxy(
  endpoint: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const { method = 'GET', body, auth = true, queryString } = options;

  const url = `${API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const reqHeaders = await nextHeaders();
    const authHeader = reqHeaders.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;
  }

  try {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: method === 'POST' ? 201 : 200 });
  } catch (error) {
    console.error(`Admin proxy ${method} ${endpoint} error:`, error);
    return NextResponse.json(
      { error: `Proxy request failed` },
      { status: 500 }
    );
  }
}

/**
 * Extract JSON body from a NextRequest.
 */
export async function readBody(request: NextRequest): Promise<unknown> {
  return request.json();
}

/**
 * Extract query string from a NextRequest.
 */
export function getQueryString(request: NextRequest): string {
  return new URL(request.url).searchParams.toString();
}
