import { request } from './apiClient';
import { SmartMessagePayload, SmartMessageResult } from '../types';

export interface MeetingSummaryResponse {
  summary: string;
  actionItems: Array<{
    title: string;
    description?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    suggestedDays?: number;
    ownerSuggested?: string;
  }>;
}

export interface DailyBriefingResponse {
  briefing: string;
}

export interface SendSmartMessagePayload {
  channel: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  subject?: string;
  message: string;
  userConfirmed: boolean;
}

export const aiApi = {
  generateAiMeetingSummary: (rawText: string, title: string): Promise<MeetingSummaryResponse> =>
    request<MeetingSummaryResponse>('/ai/meeting-notes', {
      method: 'POST',
      body: JSON.stringify({ rawText, title }),
    }),

  getAiDailyBriefing: (): Promise<DailyBriefingResponse> =>
    request<DailyBriefingResponse>('/ai/daily-briefing', {
      method: 'POST',
    }),

  generateSmartMessage: (payload: SmartMessagePayload): Promise<SmartMessageResult> =>
    request<SmartMessageResult>('/v1/ai/smart-message/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendSmartMessage: (payload: SendSmartMessagePayload): Promise<{ success: boolean; message: string; messageId?: string }> =>
    request<{ success: boolean; message: string; messageId?: string }>('/v1/ai/smart-message/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

