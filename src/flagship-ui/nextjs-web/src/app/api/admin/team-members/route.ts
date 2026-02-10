import { NextRequest } from 'next/server';
import { adminProxy, readBody, getQueryString } from '@/lib/admin-api';

export async function GET(request: NextRequest) {
  return adminProxy('/admin/team-members', { queryString: getQueryString(request) });
}

export async function POST(request: NextRequest) {
  return adminProxy('/admin/team-members', { method: 'POST', body: await readBody(request) });
}
