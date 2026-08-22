import { request } from './apiClient';

export interface SendNotificationPayload {
  recipientUserId?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  type?: string;
}

export interface SendNotificationResponse {
  status: string;
  recipientUserId: string;
  recipientPhone?: string | null;
  deliveredAt: string;
}

export const notificationApi = {
  sendNotification: (payload: SendNotificationPayload): Promise<SendNotificationResponse> =>
    request<SendNotificationResponse>('/v1/notifications/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
