import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { Notice } from '@odi_attend/shared';

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

    const notice = await Notice.findByIdAndDelete(id);
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (error: any) {
    console.error('Delete notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
