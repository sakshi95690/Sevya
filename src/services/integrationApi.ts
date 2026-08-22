import { request } from './apiClient';
import { TenantIntegration, IntegrationProvider } from '../types';

export interface EmailConnectPayload {
  type?: 'oauth' | 'smtp' | 'guided';
  accountEmail?: string;
  oauthProvider?: 'google' | 'microsoft';
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  authorizationCode?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  fromName?: string;
  fromEmail?: string;
}

export interface CalendarConnectPayload {
  type?: 'oauth' | 'token' | 'guided';
  accountEmail?: string;
  calendarName?: string;
  accessToken?: string;
  refreshToken?: string;
  authorizationCode?: string;
}

export interface ZoomConnectPayload {
  type?: 'oauth' | 'credentials' | 'guided';
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  hostEmail?: string;
  roomName?: string;
  authorizationCode?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface WhatsAppConnectPayload {
  type?: 'credentials' | 'oauth' | 'guided';
  phoneNumber?: string;
  businessName?: string;
  verificationCode?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  authorizationCode?: string;
}

export interface GoogleMeetConnectPayload {
  type?: 'oauth' | 'token' | 'guided';
  accountEmail?: string;
  spaceName?: string;
  accessToken?: string;
  idToken?: string;
}

export interface OAuthUrlResponse {
  success: boolean;
  provider: string;
  authUrl?: string;
  redirectUri?: string;
  missingVars?: string[];
  message?: string;
}

export interface OperationTestResult {
  success: boolean;
  operation: string;
  provider: string;
  message: string;
  details?: any;
  result?: any;
}

export const integrationApi = {
  getIntegrations: (): Promise<TenantIntegration[]> =>
    request<TenantIntegration[]>('/v1/integrations'),

  getOAuthUrl: (provider: IntegrationProvider): Promise<OAuthUrlResponse> =>
    request<OAuthUrlResponse>(`/v1/integrations/oauth-url/${provider}`),

  connectGoogleToken: (payload: { accessToken: string; idToken?: string; service?: 'email' | 'calendar' | 'both'; email?: string }): Promise<{ success: boolean; email?: TenantIntegration; calendar?: TenantIntegration }> =>
    request<{ success: boolean; email?: TenantIntegration; calendar?: TenantIntegration }>('/v1/integrations/google/connect-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectEmail: (payload: EmailConnectPayload): Promise<TenantIntegration> =>
    request<TenantIntegration>('/v1/integrations/email/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectCalendar: (payload: CalendarConnectPayload): Promise<TenantIntegration> =>
    request<TenantIntegration>('/v1/integrations/calendar/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectZoom: (payload: ZoomConnectPayload): Promise<TenantIntegration> =>
    request<TenantIntegration>('/v1/integrations/zoom/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectGoogleMeet: (payload: GoogleMeetConnectPayload): Promise<TenantIntegration> =>
    request<TenantIntegration>('/v1/integrations/google_meet/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  connectWhatsApp: (payload: WhatsAppConnectPayload): Promise<TenantIntegration> =>
    request<TenantIntegration>('/v1/integrations/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  testIntegration: (provider: IntegrationProvider): Promise<{ success: boolean; message: string; metadata?: any }> =>
    request<{ success: boolean; message: string; metadata?: any }>(`/v1/integrations/${provider}/test`, {
      method: 'POST',
    }),

  testOperation: (provider: IntegrationProvider, payload?: any): Promise<OperationTestResult> =>
    request<OperationTestResult>(`/v1/integrations/${provider}/test-operation`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  disconnectIntegration: (provider: IntegrationProvider): Promise<{ success: boolean; message: string }> =>
    request<{ success: boolean; message: string }>(`/v1/integrations/${provider}/disconnect`, {
      method: 'POST',
    }),

  reconnectIntegration: (provider: IntegrationProvider): Promise<TenantIntegration> =>
    request<TenantIntegration>(`/v1/integrations/${provider}/reconnect`, {
      method: 'POST',
    }),

  syncCalendar: (payload?: { calendarId?: string; fullSync?: boolean }): Promise<{ success: boolean; message: string; syncedCount: number; lastSyncedAt: string }> =>
    request<{ success: boolean; message: string; syncedCount: number; lastSyncedAt: string }>('/v1/integrations/calendar/sync', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  // User-level personal integrations
  getUserIntegrations: (): Promise<any[]> =>
    request<any[]>('/v1/user-integrations'),

  connectUserIntegration: (provider: string, payload: any): Promise<any> =>
    request<any>(`/v1/user-integrations/${provider}/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  disconnectUserIntegration: (provider: string): Promise<{ success: boolean; message: string }> =>
    request<{ success: boolean; message: string }>(`/v1/user-integrations/${provider}/disconnect`, {
      method: 'POST',
    }),

  testUserIntegration: (provider: string): Promise<{ success: boolean; message: string }> =>
    request<{ success: boolean; message: string }>(`/v1/user-integrations/${provider}/test`, {
      method: 'POST',
    }),

  sendWhatsAppMessage: (payload: { to: string; text: string; recipientUserId?: string }): Promise<{ success: boolean; message: string; messageId?: string }> =>
    request<{ success: boolean; message: string; messageId?: string }>('/v1/integrations/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendEmailMessage: (payload: { to: string; subject: string; body: string; isHtml?: boolean; recipientUserId?: string }): Promise<{ success: boolean; message: string; messageId?: string }> =>
    request<{ success: boolean; message: string; messageId?: string }>('/v1/integrations/email/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendMeetingInvites: (meetingId: string, payload?: { channels?: ('email' | 'whatsapp')[]; participantIds?: string[] }): Promise<{ success: boolean; message: string; emailCount?: number; whatsappCount?: number }> =>
    request<{ success: boolean; message: string; emailCount?: number; whatsappCount?: number }>(`/v1/meetings/${meetingId}/send-invites`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
};
