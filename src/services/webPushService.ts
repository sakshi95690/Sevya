import webpush from 'web-push';

// Retrieve or initialize runtime VAPID keys
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  // Generate consistent runtime fallback key pair if environment variables are missing
  const generated = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = process.env.VAPID_PUBLIC_KEY || generated.publicKey;
  vapidKeys.privateKey = process.env.VAPID_PRIVATE_KEY || generated.privateKey;
}

try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@sevya.org',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.warn('WebPush VAPID setup warning:', err);
}

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
}

export async function sendWebPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/badge.png',
      data: {
        url: payload.url || '/dashboard',
        ...payload.data,
      },
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payloadString
    );

    return { success: true };
  } catch (err: any) {
    console.error('[WebPush Error]:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to send Web Push notification' };
  }
}
