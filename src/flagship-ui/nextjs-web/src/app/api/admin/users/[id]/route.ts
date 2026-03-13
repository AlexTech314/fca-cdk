import { NextRequest } from 'next/server';
import { adminProxy } from '@/lib/admin-api';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxy(`/admin/users/${id}`, { method: 'DELETE' });
}
