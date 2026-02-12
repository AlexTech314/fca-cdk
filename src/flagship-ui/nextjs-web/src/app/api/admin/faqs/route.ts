import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function GET() {
  return adminProxy('/admin/faqs');
}

export async function POST(request: NextRequest) {
  return adminProxy('/admin/faqs', { method: 'POST', body: await readBody(request) });
}
