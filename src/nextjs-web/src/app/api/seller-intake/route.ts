import { NextRequest, NextResponse } from 'next/server';
import { submitSellerIntake, type SellerIntakeData } from '@/lib/api';

/**
 * Next.js API route that proxies seller intake submissions to the backend.
 * Client-side forms (ContactForm, IntakeForm) POST here because they can't
 * reach the Express backend directly. This route uses the shared API client
 * from lib/api.ts — the single source of truth for backend communication.
 */
export async function POST(request: NextRequest) {
  try {
    const data: SellerIntakeData = await request.json();

    // Validate required fields before forwarding
    if (!data.firstName || !data.lastName || !data.email || !data.companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const result = await submitSellerIntake(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error processing seller intake:', error);
    const message = error instanceof Error ? error.message : 'Failed to process submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
