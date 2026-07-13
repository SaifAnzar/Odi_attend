import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { AppConfig } from '@odi_attend/shared';

export async function GET(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find the global config document, or create a default one if it doesn't exist
    let config = await AppConfig.findOne({});
    if (!config) {
      config = new AppConfig({
        isWifiLockEnabled: false,
        allowedWifiSSID: '',
      });
      await config.save();
    }

    return NextResponse.json({
      success: true,
      config: {
        isWifiLockEnabled: config.isWifiLockEnabled,
        allowedWifiSSID: config.allowedWifiSSID,
      },
    });
  } catch (error: any) {
    console.error('Fetch wifi settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userPayload = await verifyAuth(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const { isWifiLockEnabled, allowedWifiSSID } = await request.json();

    if (typeof isWifiLockEnabled !== 'boolean') {
      return NextResponse.json({ error: 'isWifiLockEnabled must be a boolean value.' }, { status: 400 });
    }

    if (allowedWifiSSID !== undefined && typeof allowedWifiSSID !== 'string') {
      return NextResponse.json({ error: 'allowedWifiSSID must be a string.' }, { status: 400 });
    }

    // Find and update or create
    let config = await AppConfig.findOne({});
    if (!config) {
      config = new AppConfig({
        isWifiLockEnabled,
        allowedWifiSSID: allowedWifiSSID || '',
      });
    } else {
      config.isWifiLockEnabled = isWifiLockEnabled;
      if (allowedWifiSSID !== undefined) {
        config.allowedWifiSSID = allowedWifiSSID;
      }
    }

    await config.save();

    return NextResponse.json({
      success: true,
      config: {
        isWifiLockEnabled: config.isWifiLockEnabled,
        allowedWifiSSID: config.allowedWifiSSID,
      },
    });
  } catch (error: any) {
    console.error('Update wifi settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
