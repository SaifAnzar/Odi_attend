import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { AttendanceRecord } from '@odi_attend/shared';

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
    const { status } = body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid review status. Must be Approved or Rejected.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const record = await AttendanceRecord.findById(id);

    if (!record) {
      return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    }

    // Update status and clear flag on approval
    record.status = status;
    if (status === 'Approved') {
      record.isFlagged = false;
    }

    await record.save();

    return NextResponse.json({
      success: true,
      record
    });
  } catch (error: any) {
    console.error('Review attendance error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
