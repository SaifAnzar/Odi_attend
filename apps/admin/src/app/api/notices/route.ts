import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { Notice } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const notices = await Notice.find({})
      .populate('acknowledgedBy', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, notices });
  } catch (error: any) {
    console.error('Fetch notices error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload || userPayload.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const { title, content, type } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    if (type && !['Info', 'Warning', 'Holiday'].includes(type)) {
      return NextResponse.json({ error: 'Invalid notice type.' }, { status: 400 });
    }

    const newNotice = new Notice({
      title,
      content,
      type: type || 'Info',
      acknowledgedBy: []
    });

    await newNotice.save();

    return NextResponse.json({ success: true, notice: newNotice }, { status: 201 });
  } catch (error: any) {
    console.error('Create notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
