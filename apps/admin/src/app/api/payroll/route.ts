import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User, AttendanceRecord } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || (admin.role !== 'Admin' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    // Fetch all active staff (Employees, Interns, Admins)
    const users = await User.find({ status: 'Active' }).select('-passwordHash').sort({ name: 1 });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;

    // Get attendance stats per user for the current month
    const payrollRecords = await Promise.all(
      users.map(async (user) => {
        const attendanceLogs = await AttendanceRecord.find({
          userId: user._id,
          date: { $regex: `^${monthPrefix}` }
        });

        const presentDays = attendanceLogs.filter((log) => 
          ['Present', 'Late', 'Half-Day'].includes(log.attendanceStatus)
        ).length;

        const unpaidLeaves = attendanceLogs.filter((log) => 
          log.attendanceStatus === 'Absent'
        ).length;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          baseSalary: user.baseSalary ?? null,
          presentDays: presentDays > 0 ? presentDays : Math.max(1, now.getDate() - unpaidLeaves),
          unpaidLeaves: unpaidLeaves,
          allowances: 0,
          customDeductions: 0,
          status: 'Pending'
        };
      })
    );

    return NextResponse.json({ success: true, records: payrollRecords });
  } catch (error: any) {
    console.error('Fetch payroll data error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
