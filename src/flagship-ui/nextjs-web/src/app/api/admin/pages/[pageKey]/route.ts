import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || 'dev-token-fca-admin-2024';

/**
 * GET /api/admin/pages/:pageKey
 * Proxies to Express GET /api/pages/:pageKey (public, no auth needed)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;

  try {
    const response = await fetch(`${API_URL}/pages/${pageKey}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin proxy GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page data' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/pages/:pageKey
 * Proxies to Express PUT /api/admin/pages/:pageKey (auth required)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;

  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/admin/pages/${pageKey}`, {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin proxy PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update page data' },
      { status: 500 }
    );
  }
}
