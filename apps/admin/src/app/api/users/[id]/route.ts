import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, AttendanceRecord } from '@odi_attend/shared';
import { normalizeTimeToHHMM, getLocalDateStringIST } from '@/lib/shiftUtils';
import { performAutoCheckout } from '../../attendance/route';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    
    const body = await request.json();
    const { name, email, password, role, status, shift, baseSalary, workMode } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (baseSalary !== undefined && baseSalary !== null) {
      user.baseSalary = Number(baseSalary);
    }

    if (name) user.name = name;
    if (role) {
      if (!['Admin', 'Employee', 'Intern'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      user.role = role;
    }
    if (workMode) {
      if (!['On-Site', 'Remote', 'Hybrid'].includes(workMode)) {
        return NextResponse.json({ error: 'Invalid workMode' }, { status: 400 });
      }
      user.workMode = workMode;
    }
    if (status) {
      if (!['Active', 'Inactive'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      user.status = status;
    }
    if (shift) {
      const normalizedShift = {
        name: shift.name || user.shift?.name || 'Standard Shift',
        startTime: normalizeTimeToHHMM(shift.startTime || user.shift?.startTime, '09:00'),
        endTime: normalizeTimeToHHMM(shift.endTime || user.shift?.endTime, '18:00')
      };
      user.shift = normalizedShift;

      // Update today's attendance record shiftSnapshot if exists
      const todayStr = getLocalDateStringIST();
      const todayRecord = await AttendanceRecord.findOne({ userId: user._id, date: todayStr });
      if (todayRecord) {
        todayRecord.shiftSnapshot = normalizedShift;
        await todayRecord.save();
      }
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
          return NextResponse.json({ error: 'Email already in use by another account' }, { status: 409 });
        }
        user.email = normalizedEmail;
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Trigger auto checkout to verify if updated shift has already ended
    performAutoCheckout().catch(err => console.error('[Auto Checkout after user update error]:', err));

    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    return NextResponse.json({ success: true, user: userResponse });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user's attendance records
    await AttendanceRecord.deleteMany({ userId: id });

    return NextResponse.json({ success: true, message: 'User and associated records deleted successfully.' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
