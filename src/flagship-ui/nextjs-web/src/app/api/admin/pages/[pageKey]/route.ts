import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;
  return adminProxy(`/pages/${pageKey}`, { auth: false });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;
  return adminProxy(`/admin/pages/${pageKey}`, { method: 'PUT', body: await readBody(request) });
}
