import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ShiftSwapRequest } from '@odi_attend/shared';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: swapId } = await params;
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { status, adminRemarks } = await request.json();

    if (!status || !['Pending Admin', 'Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status transition.' }, { status: 400 });
    }

    const swapRequest = await ShiftSwapRequest.findById(swapId)
      .populate('requesterId', 'name email')
      .populate('targetUserId', 'name email');

    if (!swapRequest) {
      return NextResponse.json({ error: 'Shift swap request not found.' }, { status: 404 });
    }

    const isTargetUser = swapRequest.targetUserId._id.toString() === userPayload.id;
    const isAdmin = userPayload.role === 'Admin';

    if (!isTargetUser && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. You are not authorized to review this request.' }, { status: 403 });
    }

    // Target Colleague accepting/declining the swap
    if (isTargetUser && !isAdmin) {
      if (swapRequest.status !== 'Pending Target') {
        return NextResponse.json({ error: 'This request is no longer pending colleague response.' }, { status: 400 });
      }

      if (status === 'Approved') {
        return NextResponse.json({ error: 'Only administrators can finalize and approve swap requests.' }, { status: 403 });
      }

      swapRequest.status = status; // either 'Pending Admin' (Accepted) or 'Rejected' (Declined)
      await swapRequest.save();

      return NextResponse.json({ success: true, swap: swapRequest });
    }

    // Admin finalizing the swap request
    if (isAdmin) {
      if (status === 'Pending Admin') {
        return NextResponse.json({ error: 'Cannot transition back to Pending Admin status.' }, { status: 400 });
      }

      swapRequest.status = status; // either 'Approved' or 'Rejected'
      if (adminRemarks !== undefined) {
        swapRequest.adminRemarks = adminRemarks;
      }
      await swapRequest.save();

      // Trigger a simulated push notification to both users
      if (status === 'Approved') {
        const requester = swapRequest.requesterId as any;
        const target = swapRequest.targetUserId as any;
        const dateStr = new Date(swapRequest.swapDate).toISOString().split('T')[0];

        console.log(`[PUSH NOTIFICATION] Sending to requester ${requester.name} (${requester._id}): Your shift swap request with ${target.name} for ${dateStr} was APPROVED by the Admin.`);
        console.log(`[PUSH NOTIFICATION] Sending to target ${target.name} (${target._id}): Your shift swap request with ${requester.name} for ${dateStr} was APPROVED by the Admin.`);
      }

      return NextResponse.json({ success: true, swap: swapRequest });
    }

    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  } catch (error: any) {
    console.error('Review swap error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
