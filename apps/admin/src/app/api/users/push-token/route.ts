import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { User } from '@odi_attend/shared';

export async function POST(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (token === undefined) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userPayload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    user.expoPushToken = token || null;
    await user.save();

    console.log(`[PUSH TOKEN] Registered push token for ${user.name}: ${token}`);

    return NextResponse.json({ success: true, message: 'Push token registered successfully.' });
  } catch (error: any) {
    console.error('Register push token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
