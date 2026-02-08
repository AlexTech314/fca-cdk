import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || 'dev-token-fca-admin-2024';

/**
 * GET /api/admin/assets
 * Proxies to Express GET /api/admin/assets with query params (auth required)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryStr = searchParams.toString();

  try {
    const response = await fetch(
      `${API_URL}/admin/assets${queryStr ? `?${queryStr}` : ''}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_API_TOKEN}`,
        },
      }
    );

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
    console.error('Admin assets proxy GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/assets
 * Proxies to Express POST /api/admin/assets (auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/admin/assets`, {
      method: 'POST',
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
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Admin assets proxy POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}
