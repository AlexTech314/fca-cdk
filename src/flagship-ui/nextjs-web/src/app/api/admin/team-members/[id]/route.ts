import { NextRequest } from 'next/server';
import { adminProxy, readBody } from '@/lib/admin-api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxy(`/admin/team-members/${id}`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxy(`/admin/team-members/${id}`, { method: 'PUT', body: await readBody(request) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return adminProxy(`/admin/team-members/${id}`, { method: 'DELETE' });
}
