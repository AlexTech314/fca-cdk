import { NextRequest } from 'next/server';
import { adminProxy, readBody, getQueryString } from '@/lib/admin-api';

export async function GET(request: NextRequest) {
  return adminProxy('/admin/blog-posts', { queryString: getQueryString(request) });
}

export async function POST(request: NextRequest) {
  return adminProxy('/admin/blog-posts', { method: 'POST', body: await readBody(request) });
}
