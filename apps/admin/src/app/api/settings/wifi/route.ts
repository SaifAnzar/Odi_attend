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
        isGeofenceEnabled: true,
        officeLatitude: 12.9716,
        officeLongitude: 77.5946,
        geofenceRadiusMeters: 100,
      });
      await config.save();
    }

    return NextResponse.json({
      success: true,
      config: {
        isWifiLockEnabled: config.isWifiLockEnabled ?? false,
        allowedWifiSSID: config.allowedWifiSSID ?? '',
        isGeofenceEnabled: config.isGeofenceEnabled ?? true,
        officeLatitude: config.officeLatitude ?? 12.9716,
        officeLongitude: config.officeLongitude ?? 77.5946,
        geofenceRadiusMeters: config.geofenceRadiusMeters ?? 100,
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
    const { 
      isWifiLockEnabled, 
      allowedWifiSSID,
      isGeofenceEnabled,
      officeLatitude,
      officeLongitude,
      geofenceRadiusMeters
    } = await request.json();

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
        isGeofenceEnabled: isGeofenceEnabled !== undefined ? Boolean(isGeofenceEnabled) : true,
        officeLatitude: typeof officeLatitude === 'number' ? officeLatitude : 12.9716,
        officeLongitude: typeof officeLongitude === 'number' ? officeLongitude : 77.5946,
        geofenceRadiusMeters: typeof geofenceRadiusMeters === 'number' ? geofenceRadiusMeters : 100,
      });
    } else {
      config.isWifiLockEnabled = isWifiLockEnabled;
      if (allowedWifiSSID !== undefined) {
        config.allowedWifiSSID = allowedWifiSSID;
      }
      if (isGeofenceEnabled !== undefined) {
        config.isGeofenceEnabled = Boolean(isGeofenceEnabled);
      }
      if (typeof officeLatitude === 'number') {
        config.officeLatitude = officeLatitude;
      }
      if (typeof officeLongitude === 'number') {
        config.officeLongitude = officeLongitude;
      }
      if (typeof geofenceRadiusMeters === 'number') {
        config.geofenceRadiusMeters = geofenceRadiusMeters;
      }
    }

    await config.save();

    return NextResponse.json({
      success: true,
      config: {
        isWifiLockEnabled: config.isWifiLockEnabled,
        allowedWifiSSID: config.allowedWifiSSID,
        isGeofenceEnabled: config.isGeofenceEnabled,
        officeLatitude: config.officeLatitude,
        officeLongitude: config.officeLongitude,
        geofenceRadiusMeters: config.geofenceRadiusMeters,
      },
    });
  } catch (error: any) {
    console.error('Update wifi settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
