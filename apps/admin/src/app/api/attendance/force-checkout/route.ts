import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { AttendanceRecord, User } from '@odi_attend/shared';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { userId, recordId, notes, customCheckoutTime } = body;

    if (!userId && !recordId) {
      return NextResponse.json({ error: 'Either userId or recordId is required.' }, { status: 400 });
    }

    let record: any = null;

    if (recordId) {
      record = await AttendanceRecord.findById(recordId).populate('userId', 'name email role status shift');
    } else if (userId) {
      // Find latest attendance record with an active open session
      record = await AttendanceRecord.findOne({
        userId,
        sessions: {
          $elemMatch: {
            $or: [
              { checkOut: { $exists: false } },
              { checkOut: null }
            ]
          }
        }
      }).sort({ date: -1, createdAt: -1 }).populate('userId', 'name email role status shift');

      if (!record) {
        // Fallback: look for today's record
        const todayStr = new Date().toISOString().split('T')[0];
        record = await AttendanceRecord.findOne({ userId, date: todayStr })
          .populate('userId', 'name email role status shift');
      }
    }

    if (!record) {
      return NextResponse.json({ error: 'No attendance record found for this employee.' }, { status: 404 });
    }

    // Check if there is an active session
    const openSessions = record.sessions.filter((s: any) => !s.checkOut);
    if (openSessions.length === 0) {
      return NextResponse.json({ error: 'Employee is already checked out (No active session).' }, { status: 400 });
    }

    const checkoutTime = customCheckoutTime ? new Date(customCheckoutTime) : new Date();

    // Close all open sessions
    let modified = false;
    for (const session of record.sessions) {
      if (!session.checkOut) {
        session.checkOut = checkoutTime;
        session.checkOutLocation = {
          latitude: session.checkInLocation?.latitude || 0,
          longitude: session.checkInLocation?.longitude || 0,
          address: session.checkInLocation?.address 
            ? `${session.checkInLocation.address} (Admin Manual Punch-Out)` 
            : 'Admin Manual Punch-Out'
        };
        session.checkOutDevice = 'Admin Console (Manual Punch-Out)';

        const sessionDurationMinutes = Math.round((checkoutTime.getTime() - new Date(session.checkIn).getTime()) / 60000);
        record.totalMinutesWorked = (record.totalMinutesWorked || 0) + Math.max(0, sessionDurationMinutes);
        modified = true;
      }
    }

    if (modified) {
      record.markModified('sessions');
      const adminNote = notes 
        ? `[Admin Manual Punch-Out: ${notes}]` 
        : `[Admin: Manually Checked-Out by Admin]`;
      
      record.notes = record.notes ? `${record.notes} ${adminNote}` : adminNote;
      await record.save();
    }

    // Send push notification to employee device
    const targetUserId = record.userId?._id?.toString() || record.userId?.toString() || userId;
    if (targetUserId) {
      sendPushNotification(
        [targetUserId],
        'ODIZO Attendance Update',
        'You have been checked out by the Admin.',
        { type: 'FORCE_CHECKOUT', recordId: record._id.toString() }
      ).catch(err => console.error('[Push Notification Error on Force Checkout]:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${record.userId?.name || ''} has been successfully punched out.`,
      record
    });
  } catch (error: any) {
    console.error('Force checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
