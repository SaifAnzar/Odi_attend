import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { LeaveRequest } from '@odi_attend/shared';

// GET /api/leaves/my - Fetch leave requests of a specific user
export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const queryUserId = searchParams.get('userId');

    // Default to the logged-in user's ID
    let targetUserId = queryUserId || userPayload.id;

    // Check permissions: Employees/Interns can only request their own logs
    if (userPayload.role !== 'Admin' && targetUserId !== userPayload.id) {
      return NextResponse.json({ error: 'Forbidden. Cannot access other users\' leave requests.' }, { status: 403 });
    }

    const leaves = await LeaveRequest.find({ userId: targetUserId })
      .sort({ appliedOn: -1 });

    return NextResponse.json({ leaves });
  } catch (error: any) {
    console.error('Fetch personal leaves error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
