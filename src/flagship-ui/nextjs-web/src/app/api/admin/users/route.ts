import { adminProxy } from '@/lib/admin-api';

export async function GET() {
  return adminProxy('/admin/users');
}
