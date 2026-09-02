import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User } from '@odi_attend/shared';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || (admin.role !== 'Admin' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { baseSalary } = body;

    if (baseSalary === undefined || baseSalary === null || isNaN(Number(baseSalary))) {
      return NextResponse.json({ error: 'Valid baseSalary is required' }, { status: 400 });
    }

    const numericSalary = Math.max(0, Number(baseSalary));

    await connectToDatabase();
    const user = await User.findByIdAndUpdate(
      id,
      { baseSalary: numericSalary },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Base salary updated successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        baseSalary: user.baseSalary
      }
    });
  } catch (error: any) {
    console.error('Update base salary error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
