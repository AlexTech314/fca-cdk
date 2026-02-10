import { NextRequest } from 'next/server';
import { adminProxy, getQueryString } from '@/lib/admin-api';

export async function GET(request: NextRequest) {
  return adminProxy('/admin/industry-sectors', { queryString: getQueryString(request) });
}
