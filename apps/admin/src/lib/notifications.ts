import { User } from '@odi_attend/shared';
import { connectToDatabase } from './db';

interface PushPayload {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: any;
}

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: any
) {
  try {
    await connectToDatabase();

    // Find all users from the list that have a valid Expo push token
    const users = await User.find({
      _id: { $in: userIds },
      expoPushToken: { $ne: null }
    }).select('expoPushToken name');

    if (users.length === 0) {
      console.log(`[PUSH] No active push tokens found for users: ${userIds.join(', ')}`);
      return;
    }

    const messages: PushPayload[] = [];
    for (const user of users) {
      if (user.expoPushToken && user.expoPushToken.startsWith('ExponentPushToken')) {
        messages.push({
          to: user.expoPushToken,
          sound: 'default',
          title,
          body,
          data
        });
        console.log(`[PUSH] Queueing notification to ${user.name} (${user.expoPushToken})`);
      }
    }

    if (messages.length === 0) {
      return;
    }

    // Send to Expo's push notification service API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    console.log('[PUSH] Expo API response:', JSON.stringify(result));
  } catch (error) {
    console.error('[PUSH] Failed to send push notifications:', error);
  }
}
