import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxy(`/admin/tombstones/${id}/publish`, { method: 'POST', body: await readBody(request) });
}
