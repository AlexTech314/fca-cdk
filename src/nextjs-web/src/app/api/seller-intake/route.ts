import { NextRequest, NextResponse } from 'next/server';

// Mock API endpoint for seller intake form
// This will be replaced with actual API calls when the backend is ready

interface SellerIntakePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  title?: string;
  industry?: string;
  city?: string;
  state?: string;
  revenueRange?: string;
  employeeCount?: string;
  timeline?: string;
  serviceInterest?: string;
  message?: string;
  source?: string;
  referralSource?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: SellerIntakePayload = await request.json();

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: When the real API is ready, replace this with:
    // const response = await fetch(`${process.env.API_URL}/api/seller-intake`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data),
    // });
    // return NextResponse.json(await response.json());

    // Mock successful response
    console.log('Seller Intake Submission:', {
      ...data,
      submittedAt: new Date().toISOString(),
    });

    // Simulate a small delay like a real API would have
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      message: 'Thank you for your submission. We will be in touch shortly.',
      id: `mock-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error processing seller intake:', error);
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
