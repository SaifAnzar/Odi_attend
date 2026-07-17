import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { Notice, User } from '@odi_attend/shared';
import { sendPushNotification } from '@/lib/notifications';

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

    // Broadcast push notification to all active Employee and Intern users
    try {
      const activeEmployees = await User.find({
        role: { $in: ['Employee', 'Intern'] },
        status: 'Active',
        expoPushToken: { $ne: null }
      }).select('_id');

      const employeeIds = activeEmployees.map(emp => emp._id.toString());
      if (employeeIds.length > 0) {
        // Truncate content preview for the push message
        const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
        sendPushNotification(
          employeeIds, 
          `ODIZO Announcement: ${title}`, 
          preview
        ).catch(err => {
          console.error('Failed to broadcast notice push:', err);
        });
      }
    } catch (pushErr) {
      console.error('Error fetching push tokens for notice broadcast:', pushErr);
    }

    return NextResponse.json({ success: true, notice: newNotice }, { status: 201 });
  } catch (error: any) {
    console.error('Create notice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
