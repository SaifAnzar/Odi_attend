import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { LeaveRequest } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const reqType = searchParams.get('type') || 'Leave';

    let count = 0;
    if (userPayload.role === 'Admin') {
      count = await LeaveRequest.countDocuments({ status: 'Pending', requestType: reqType });
    } else {
      count = await LeaveRequest.countDocuments({ userId: userPayload.id, status: 'Pending', requestType: reqType });
    }

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Fetch pending leave count error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
