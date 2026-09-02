import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, LeaveRequest, ShiftSwapRequest } from '@odi_attend/shared';
import { normalizeTimeToHHMM } from '@/lib/shiftUtils';
import { performAutoCheckout } from '../attendance/route';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    
    // Auto checkout check in background
    performAutoCheckout().catch(err => console.error('[Auto Checkout in GET /api/users error]:', err));

    // Exclude password hashes from returned user objects
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });

    // Aggregate real approved counts per user
    const [leaveAgg, wfhAgg, swapReqAgg, swapTargetAgg] = await Promise.all([
      LeaveRequest.aggregate([
        { $match: { requestType: 'Leave', status: 'Approved' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      LeaveRequest.aggregate([
        { $match: { requestType: 'WFH', status: 'Approved' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      ShiftSwapRequest.aggregate([
        { $match: { status: 'Approved' } },
        { $group: { _id: '$requesterId', count: { $sum: 1 } } }
      ]),
      ShiftSwapRequest.aggregate([
        { $match: { status: 'Approved' } },
        { $group: { _id: '$targetUserId', count: { $sum: 1 } } }
      ])
    ]);

    const leaveMap: Record<string, number> = {};
    leaveAgg.forEach((item: any) => {
      leaveMap[item._id.toString()] = item.count;
    });

    const wfhMap: Record<string, number> = {};
    wfhAgg.forEach((item: any) => {
      wfhMap[item._id.toString()] = item.count;
    });

    const swapMap: Record<string, number> = {};
    swapReqAgg.forEach((item: any) => {
      const id = item._id.toString();
      swapMap[id] = (swapMap[id] || 0) + item.count;
    });
    swapTargetAgg.forEach((item: any) => {
      const id = item._id.toString();
      swapMap[id] = (swapMap[id] || 0) + item.count;
    });

    const usersWithStats = users.map((user) => {
      const uObj = user.toObject();
      const uId = user._id.toString();
      return {
        ...uObj,
        stats: {
          approvedLeaves: leaveMap[uId] || 0,
          approvedWfh: wfhMap[uId] || 0,
          approvedSwaps: swapMap[uId] || 0
        }
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const { name, email, password, role, status, shift, baseSalary, workMode } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password and role are required' }, { status: 400 });
    }

    if (!['Admin', 'Employee', 'Intern'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const normalizedShift = {
      name: shift?.name || 'Standard Shift',
      startTime: normalizeTimeToHHMM(shift?.startTime, '09:00'),
      endTime: normalizeTimeToHHMM(shift?.endTime, '18:00')
    };

    const newUser = new User({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      workMode: workMode && ['On-Site', 'Remote', 'Hybrid'].includes(workMode) ? workMode : 'On-Site',
      status: status || 'Active',
      baseSalary: baseSalary !== undefined && baseSalary !== null ? Number(baseSalary) : (role === 'Intern' ? 25000 : role === 'Admin' ? 90000 : 65000),
      shift: normalizedShift
    });

    await newUser.save();

    // Convert to object and delete passwordHash
    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;

    return NextResponse.json({ success: true, user: userResponse }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
