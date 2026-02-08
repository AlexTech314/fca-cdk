import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function POST(request: NextRequest) {
  return adminProxy('/admin/assets/presigned-url', { method: 'POST', body: await readBody(request) });
}
