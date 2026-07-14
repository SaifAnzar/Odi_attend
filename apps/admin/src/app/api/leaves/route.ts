import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, LeaveRequest } from '@odi_attend/shared';

// POST /api/leaves - Submit a new leave request
export async function POST(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { userId, startDate, endDate, reason } = body;

    // Validation
    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Start Date, End Date, and Reason are required.' }, { status: 400 });
    }

    // Force user ID of logged-in employee unless they are an admin
    let targetUserId = userId;
    if (userPayload.role !== 'Admin') {
      targetUserId = userPayload.id;
    } else if (!targetUserId) {
      targetUserId = userPayload.id;
    }

    const leaveRequest = await LeaveRequest.create({
      userId: targetUserId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'Pending',
      adminRemarks: ''
    });

    return NextResponse.json({ success: true, leaveRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Create leave request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/leaves - Fetch all leave requests (for Admin)
export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const query: any = {};
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      query.status = status;
    }

    const leaves = await LeaveRequest.find(query)
      .populate('userId', 'name role email')
      .sort({ appliedOn: -1 });

    return NextResponse.json({ leaves });
  } catch (error: any) {
    console.error('Fetch leaves error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
