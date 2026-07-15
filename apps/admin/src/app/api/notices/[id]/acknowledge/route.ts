import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { Notice } from '@odi_attend/shared';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noticeId } = await params;
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
    }

    // Check if already acknowledged
    const userIdObj = new Object(userPayload.id); // mongoose handles string to ObjectId casting in queries/updates automatically but let's append it
    
    // Check if user is already in list
    const hasAcknowledged = notice.acknowledgedBy.some(
      (id: any) => id.toString() === userPayload.id
    );

    if (!hasAcknowledged) {
      notice.acknowledgedBy.push(userPayload.id);
      await notice.save();
    }

    return NextResponse.json({ success: true, notice });
  } catch (error: any) {
    console.error('Acknowledge notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
