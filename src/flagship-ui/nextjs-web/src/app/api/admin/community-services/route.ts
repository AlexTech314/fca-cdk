import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function GET() {
  return adminProxy('/admin/community-services');
}

export async function POST(request: NextRequest) {
  return adminProxy('/admin/community-services', { method: 'POST', body: await readBody(request) });
}
