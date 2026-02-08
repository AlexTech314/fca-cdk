import { NextRequest } from 'next/server';
import { adminProxy, readBody, getQueryString } from '@/lib/admin-api';

export async function GET(request: NextRequest) {
  return adminProxy('/admin/assets', { queryString: getQueryString(request) });
}

export async function POST(request: NextRequest) {
  return adminProxy('/admin/assets', { method: 'POST', body: await readBody(request) });
}
