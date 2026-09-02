import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { performAutoCheckout } from '../route';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    await performAutoCheckout();
    return NextResponse.json({ success: true, message: 'Auto check-out process completed successfully.' });
  } catch (error: any) {
    console.error('Auto check-out trigger error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    await performAutoCheckout();
    return NextResponse.json({ success: true, message: 'Auto check-out process completed successfully.' });
  } catch (error: any) {
    console.error('Auto check-out trigger error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
