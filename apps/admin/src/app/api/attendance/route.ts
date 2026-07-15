import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, AttendanceRecord, AppConfig, LeaveRequest } from '@odi_attend/shared';

// Helper to get local date string YYYY-MM-DD (defaults to IST timezone UTC+5:30)
function getLocalDateString(date: Date = new Date()): string {
  const utcOffset = 5.5; // IST offset
  const localTime = new Date(date.getTime() + utcOffset * 3600000);
  return localTime.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');
    const targetDate = searchParams.get('date'); // YYYY-MM-DD

    // Admin can view any logs. Employees/Interns can only view their own logs.
    let userId = userPayload.id;
    if (userPayload.role === 'Admin') {
      userId = targetUserId || '';
    } else if (targetUserId && targetUserId !== userPayload.id) {
      return NextResponse.json({ error: 'Forbidden. You can only access your own logs.' }, { status: 403 });
    }

    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    if (targetDate) {
      query.date = targetDate;
    }

    // Populate user details for Admins
    const records = await AttendanceRecord.find(query)
      .populate('userId', 'name email role status shift')
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('Fetch attendance error:', error);
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
    const body = await request.json();
    const { type, location, deviceInfo, notes, ssid } = body; // type is 'Check-In' or 'Check-Out'

    if (!type || !['Check-In', 'Check-Out'].includes(type)) {
      return NextResponse.json({ error: 'Invalid punch type. Must be Check-In or Check-Out.' }, { status: 400 });
    }

    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return NextResponse.json({ error: 'Valid location coordinates are required.' }, { status: 400 });
    }

    // Fetch the user to get their shift details
    const user = await User.findById(userPayload.id);
    if (!user || user.status !== 'Active') {
      return NextResponse.json({ error: 'Active user profile not found.' }, { status: 404 });
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const todayDate = new Date(todayStr); // UTC midnight representation of today

    // Check if user has an active and approved WFH request for today
    const wfhRequest = await LeaveRequest.findOne({
      userId: user._id,
      requestType: 'WFH',
      status: 'Approved',
      startDate: { $lte: todayDate },
      endDate: { $gte: todayDate }
    });

    const isWfhActive = !!wfhRequest;

    // Determine flag state from client and server-side Wi-Fi check
    let isFlagged = isWfhActive ? false : (body.isFlagged || false);
    let flagReason = isWfhActive ? '' : (body.flagReason || '');
    let approvalStatus: 'Approved' | 'Pending Approval' | 'Rejected' = isFlagged ? 'Pending Approval' : 'Approved';

    if (!isWfhActive) {
      // Server-side validation as double-check
      const config = await AppConfig.findOne({});
      if (config?.isWifiLockEnabled) {
        if (!ssid || ssid !== config.allowedWifiSSID) {
          isFlagged = true;
          flagReason = flagReason ? `${flagReason} (Server verified)` : 'Wi-Fi Mismatch';
          approvalStatus = 'Pending Approval';
        }
      }
    }

    console.log(`[API POST /api/attendance] userPayload.id="${userPayload.id}" | user._id="${user?._id}" | todayStr="${todayStr}" | type="${type}" | isWfhActive=${isWfhActive}`);

    // Find or create daily attendance record
    let record = await AttendanceRecord.findOne({ userId: user._id, date: todayStr });
    console.log(`[API POST /api/attendance] Record found:`, record ? `YES (ID: ${record._id})` : 'NO (null)');

    if (type === 'Check-In') {
      if (!record) {
        // First punch of the day: create new record with shift snapshot
        record = new AttendanceRecord({
          userId: user._id,
          date: todayStr,
          shiftSnapshot: {
            name: user.shift.name,
            startTime: user.shift.startTime,
            endTime: user.shift.endTime
          },
          sessions: [],
          attendanceStatus: 'Present',
          totalMinutesWorked: 0,
          isFlagged,
          flagReason,
          isWFH: isWfhActive,
          status: approvalStatus,
          notes
        });

        // Determine if they are late in local IST time (offset +5.5 hours)
        const utcOffset = 5.5;
        const localTime = new Date(now.getTime() + utcOffset * 3600000);
        const checkInHour = localTime.getUTCHours();
        const checkInMin = localTime.getUTCMinutes();
        const checkInTotalMinutes = checkInHour * 60 + checkInMin;

        const [shiftHour, shiftMin] = user.shift.startTime.split(':').map(Number);
        const shiftStartTotalMinutes = shiftHour * 60 + shiftMin + 15; // 15 min grace period

        if (checkInTotalMinutes > shiftStartTotalMinutes) {
          record.attendanceStatus = 'Late';
        }
      } else {
        // Record exists, verify there isn't an active check-in session already open
        const activeSession = record.sessions.find((s: any) => !s.checkOut);
        if (activeSession) {
          return NextResponse.json({ error: 'You are already checked in. Check out first.' }, { status: 400 });
        }

        // If this check-in is flagged, propagate it to the daily record
        if (isFlagged) {
          record.isFlagged = true;
          record.flagReason = flagReason;
          record.status = 'Pending Approval';
        }

        if (isWfhActive) {
          record.isWFH = true;
        }
      }

      // Add check-in session
      record.sessions.push({
        checkIn: now,
        checkInLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || ''
        },
        checkInDevice: deviceInfo || 'Mobile Application'
      });

      if (notes) record.notes = notes;
      await record.save();

      return NextResponse.json({ success: true, record });
    } else {
      // Check-Out flow
      if (!record) {
        return NextResponse.json({ error: 'No punch-in record found for today.' }, { status: 400 });
      }

      // Find the active session (one without a checkOut timestamp)
      const activeSessionIndex = record.sessions.findIndex((s: any) => !s.checkOut);
      if (activeSessionIndex === -1) {
        return NextResponse.json({ error: 'No active check-in session found.' }, { status: 400 });
      }

      const activeSession = record.sessions[activeSessionIndex];
      activeSession.checkOut = now;
      activeSession.checkOutLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      };
      activeSession.checkOutDevice = deviceInfo || 'Mobile Application';

      // Update total working minutes
      const sessionDurationMinutes = Math.round((now.getTime() - activeSession.checkIn.getTime()) / 60000);
      record.totalMinutesWorked += sessionDurationMinutes;

      // If this check-out is flagged, propagate it to the daily record
      if (isFlagged) {
        record.isFlagged = true;
        record.flagReason = flagReason;
        record.status = 'Pending Approval';
      }

      // Mark check-out session updated in mongoose
      record.markModified('sessions');
      await record.save();

      return NextResponse.json({ success: true, record });
    }
  } catch (error: any) {
    console.error('Punch action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
