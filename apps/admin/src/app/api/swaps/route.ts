import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ShiftSwapRequest, User, mongoose } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let query: any = {};
    if (userPayload.role !== 'Admin') {
      const userObjectId = new mongoose.Types.ObjectId(userPayload.id);
      // Employees and Interns can only see swaps they are involved in
      query = {
        $or: [
          { requesterId: userObjectId },
          { targetUserId: userObjectId }
        ]
      };
    }

    const swaps = await ShiftSwapRequest.find(query)
      .populate('requesterId', 'name email role status shift')
      .populate('targetUserId', 'name email role status shift')
      .sort({ swapDate: -1, createdAt: -1 });

    return NextResponse.json({ success: true, swaps });
  } catch (error: any) {
    console.error('Fetch swaps error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { targetUserId, swapDate } = await request.json();

    if (!targetUserId || !swapDate) {
      return NextResponse.json({ error: 'targetUserId and swapDate are required.' }, { status: 400 });
    }

    const swapDateObj = new Date(swapDate);
    if (isNaN(swapDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid swap date format.' }, { status: 400 });
    }

    // Verify target user exists and is active
    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.status !== 'Active') {
      return NextResponse.json({ error: 'Target colleague is not active or does not exist.' }, { status: 404 });
    }

    // Check if target user is target colleague
    if (targetUserId === userPayload.id) {
      return NextResponse.json({ error: 'You cannot request a shift swap with yourself.' }, { status: 400 });
    }

    // Check for duplicate request
    const existing = await ShiftSwapRequest.findOne({
      requesterId: userPayload.id,
      targetUserId,
      swapDate: swapDateObj
    });

    if (existing) {
      return NextResponse.json({ error: 'A shift swap request for this date and colleague already exists.' }, { status: 409 });
    }

    const newRequest = new ShiftSwapRequest({
      requesterId: userPayload.id,
      targetUserId,
      swapDate: swapDateObj,
      status: 'Pending Target',
      adminRemarks: ''
    });

    await newRequest.save();

    return NextResponse.json({ success: true, swap: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Create shift swap request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
