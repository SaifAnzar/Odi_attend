import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, AttendanceRecord, AppConfig, LeaveRequest, ShiftSwapRequest } from '@odi_attend/shared';
import { calculateShiftEndTimeUTC, getLocalDateStringIST, normalizeTimeToHHMM, parseTimeTo24Hours } from '@/lib/shiftUtils';

// Helper to calculate exact distance in meters between two GPS coordinates using Haversine formula
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Automatically check out employees/interns whose shift has ended
export async function performAutoCheckout() {
  try {
    // Find all attendance records with AT LEAST ONE open session (no checkOut)
    const records = await AttendanceRecord.find({
      sessions: {
        $elemMatch: {
          $or: [
            { checkOut: { $exists: false } },
            { checkOut: null }
          ]
        }
      }
    }).populate('userId', 'name email role status shift workMode');

    const now = new Date();

    for (const record of records) {
      const user = record.userId as any;
      const startTimeStr = record.shiftSnapshot?.startTime || user?.shift?.startTime || '09:00';
      const endTimeStr = record.shiftSnapshot?.endTime || user?.shift?.endTime || '18:00';

      const shiftEndTimeUTC = calculateShiftEndTimeUTC(record.date, startTimeStr, endTimeStr);

      // If the current time is past the shift end time, auto check out the user!
      if (now > shiftEndTimeUTC) {
        let modified = false;

        for (const session of record.sessions) {
          if (!session.checkOut) {
            session.checkOut = shiftEndTimeUTC; // Set checkout to shift end time
            session.checkOutLocation = {
              latitude: session.checkInLocation?.latitude || 0,
              longitude: session.checkInLocation?.longitude || 0,
              address: session.checkInLocation?.address 
                ? `${session.checkInLocation.address} (Auto Check-Out)` 
                : 'Auto Check-Out Location'
            };
            session.checkOutDevice = 'System (Auto Check-Out)';

            // Calculate session duration and add it to total minutes worked
            const sessionDurationMinutes = Math.round((shiftEndTimeUTC.getTime() - new Date(session.checkIn).getTime()) / 60000);
            record.totalMinutesWorked = (record.totalMinutesWorked || 0) + Math.max(0, sessionDurationMinutes);
            modified = true;
          }
        }

        if (modified) {
          record.markModified('sessions');
          const noteText = '[System: Auto Checked-Out at Shift End]';
          if (!record.notes || !record.notes.includes(noteText)) {
            record.notes = record.notes ? `${record.notes} ${noteText}` : noteText;
          }
          await record.save();
          console.log(`[Auto Check-Out] User ${user?.name || record.userId} auto checked-out for date ${record.date} at shift end: ${shiftEndTimeUTC.toISOString()}`);
        }
      }
    }
  } catch (err) {
    console.error('Error during auto check-out processing:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Scan and auto checkout any open sessions that have passed their shift end time
    await performAutoCheckout();

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');
    const targetDate = searchParams.get('date'); // YYYY-MM-DD
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    // Populate user details for Admins
    const records = await AttendanceRecord.find(query)
      .populate('userId', 'name email role status shift workMode')
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

    // Scan and auto checkout any open sessions that have passed their shift end time before processing the new punch
    await performAutoCheckout();

    const body = await request.json();
    const { type, location, deviceInfo, notes, ssid, completedTasks } = body; // type is 'Check-In' or 'Check-Out'

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
    const todayStr = getLocalDateStringIST(now);
    const todayDate = new Date(todayStr); // UTC midnight representation of today

    // Check if user is a permanent Remote worker OR has an active and approved WFH request for today
    const isPermanentRemote = user.workMode === 'Remote';

    const approvedWfhRequests = await LeaveRequest.find({
      userId: user._id,
      requestType: 'WFH',
      status: 'Approved'
    });

    const isTemporaryWfhActive = approvedWfhRequests.some(req => {
      const startStr = getLocalDateStringIST(new Date(req.startDate));
      const endStr = getLocalDateStringIST(new Date(req.endDate));
      return todayStr >= startStr && todayStr <= endStr;
    });

    // Remote mode or approved daily WFH request bypasses geofence and office Wi-Fi
    const isWfhActive = isPermanentRemote || isTemporaryWfhActive;

    // Check for approved shift swap for this user on todayDate
    let activeShift = {
      name: user.shift?.name || 'Standard Shift',
      startTime: normalizeTimeToHHMM(user.shift?.startTime, '09:00'),
      endTime: normalizeTimeToHHMM(user.shift?.endTime, '18:00')
    };

    const swapRequest = await ShiftSwapRequest.findOne({
      status: 'Approved',
      swapDate: todayDate,
      $or: [{ requesterId: user._id }, { targetUserId: user._id }]
    }).populate('requesterId targetUserId');

    if (swapRequest) {
      const requester = swapRequest.requesterId as any;
      const target = swapRequest.targetUserId as any;
      if (requester && target) {
        if (requester._id.toString() === user._id.toString()) {
          activeShift = {
            name: `${target.shift?.name || 'Shift'} (Swapped)`,
            startTime: normalizeTimeToHHMM(target.shift?.startTime, '09:00'),
            endTime: normalizeTimeToHHMM(target.shift?.endTime, '18:00')
          };
        } else {
          activeShift = {
            name: `${requester.shift?.name || 'Shift'} (Swapped)`,
            startTime: normalizeTimeToHHMM(requester.shift?.startTime, '09:00'),
            endTime: normalizeTimeToHHMM(requester.shift?.endTime, '18:00')
          };
        }
      }
    }

    // Fetch Global App Security & Geofence Configuration
    let config = await AppConfig.findOne({});
    if (!config) {
      config = new AppConfig({
        isWifiLockEnabled: false,
        allowedWifiSSID: '',
        isGeofenceEnabled: true,
        officeLatitude: 12.9716,
        officeLongitude: 77.5946,
        geofenceRadiusMeters: 100
      });
      await config.save();
    }

    // STRICT SECURITY ENFORCEMENT:
    // If the employee does NOT have an approved WFH request for today:
    if (!isWfhActive) {
      // 1. Strict GPS Geofence Check
      if (config.isGeofenceEnabled !== false) {
        const officeLat = config.officeLatitude ?? 12.9716;
        const officeLon = config.officeLongitude ?? 77.5946;
        const maxRadius = config.geofenceRadiusMeters ?? 100;

        const distanceMeters = calculateDistanceInMeters(
          location.latitude,
          location.longitude,
          officeLat,
          officeLon
        );

        if (distanceMeters > maxRadius) {
          console.warn(`[GEOFENCE BLOCKED] User ${user.email} (${user._id}) attempted punch from ${Math.round(distanceMeters)}m away without approved WFH.`);
          return NextResponse.json({
            error: 'Punch-in blocked: Out of office range and no approved WFH found.',
            blocked: true,
            reason: 'GEOFENCE_VIOLATION',
            distance: Math.round(distanceMeters),
            maxAllowedRadius: maxRadius
          }, { status: 403 });
        }
      }

      // 2. Strict Wi-Fi Check (if enabled)
      if (config.isWifiLockEnabled && config.allowedWifiSSID) {
        if (!ssid || ssid !== config.allowedWifiSSID) {
          console.warn(`[WIFI BLOCKED] User ${user.email} (${user._id}) attempted punch on unauthorized Wi-Fi: ${ssid || 'None'}`);
          return NextResponse.json({
            error: 'Punch-in blocked: Not connected to the authorized ODIZO office Wi-Fi network.',
            blocked: true,
            reason: 'WIFI_LOCK_VIOLATION'
          }, { status: 403 });
        }
      }
    }

    // Determine flag state (for backward compatibility if needed)
    let isFlagged = false;
    let flagReason = '';
    let approvalStatus: 'Approved' | 'Pending Approval' | 'Rejected' = 'Approved';

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
          shiftSnapshot: activeShift,
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

        const { hour: shiftHour, minute: shiftMin } = parseTimeTo24Hours(activeShift.startTime);
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
      const sessionDurationMinutes = Math.round((now.getTime() - new Date(activeSession.checkIn).getTime()) / 60000);
      record.totalMinutesWorked = (record.totalMinutesWorked || 0) + Math.max(0, sessionDurationMinutes);

      // If this check-out is flagged, propagate it to the daily record
      if (isFlagged) {
        record.isFlagged = true;
        record.flagReason = flagReason;
        record.status = 'Pending Approval';
      }

      // Save completed tasks if checking out
      if (completedTasks && Array.isArray(completedTasks)) {
        record.completedTasks = completedTasks;
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
