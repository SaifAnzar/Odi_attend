import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch all active employees and interns, excluding the logged-in user
    const colleagues = await User.find({
      _id: { $ne: userPayload.id },
      role: { $in: ['Employee', 'Intern'] },
      status: 'Active'
    })
    .select('_id name email role shift')
    .sort({ name: 1 });

    return NextResponse.json({ success: true, colleagues });
  } catch (error: any) {
    console.error('Fetch colleagues error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
