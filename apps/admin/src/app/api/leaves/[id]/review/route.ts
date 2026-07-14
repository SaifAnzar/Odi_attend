import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { LeaveRequest } from '@odi_attend/shared';

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

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error: any) {
    console.error('Review leave request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
