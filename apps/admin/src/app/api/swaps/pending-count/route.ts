import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ShiftSwapRequest, mongoose } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let count = 0;
    if (userPayload.role === 'Admin') {
      count = await ShiftSwapRequest.countDocuments({ status: 'Pending Admin' });
    } else {
      const userObjectId = new mongoose.Types.ObjectId(userPayload.id);
      count = await ShiftSwapRequest.countDocuments({
        targetUserId: userObjectId,
        status: 'Pending Target'
      });
    }

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Fetch pending swaps count error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
