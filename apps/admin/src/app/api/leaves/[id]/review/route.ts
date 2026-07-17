import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { LeaveRequest } from '@odi_attend/shared';
import { sendPushNotification } from '@/lib/notifications';

// PATCH /api/leaves/[id]/review - Review (Approve/Reject) a leave request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminRemarks } = body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be Approved or Rejected.' }, { status: 400 });
    }

    await connectToDatabase();
    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    }

    leaveRequest.status = status;
    if (adminRemarks !== undefined) {
      leaveRequest.adminRemarks = adminRemarks;
    }

    await leaveRequest.save();

    // Trigger push notification to the requester (fire-and-forget)
    const requesterId = leaveRequest.userId.toString();
    const notificationTitle = `${leaveRequest.requestType} Request ${status}`;
    const notificationBody = `Your ${leaveRequest.requestType.toLowerCase()} request for ${leaveRequest.startDate} to ${leaveRequest.endDate} was ${status.toLowerCase()} by the Admin.`;
    
    sendPushNotification([requesterId], notificationTitle, notificationBody).catch(err => {
      console.error('Failed to trigger push notification:', err);
    });

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error: any) {
    console.error('Review leave request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
