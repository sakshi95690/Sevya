import { auth, getFirebaseAuth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

function getGmailAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  return provider;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  unread: boolean;
  labelIds: string[];
  body?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

/**
 * Initialize Auth State Listener for Gmail Access Token
 */
export const initGmailAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, async (user: FirebaseUser | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-In with Gmail Scopes
 */
export const signInWithGmail = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Google Sign-In is not configured yet in this environment.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, getGmailAuthProvider());
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token for Gmail.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.warn('Gmail OAuth sign-in popup was closed before completing.');
    } else {
      console.error('Gmail OAuth sign-in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGmailAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Helper to encode raw RFC 2822 email string into Base64Url
 */
function buildRawEmail({ to, subject, body, isHtml }: SendEmailPayload): string {
  const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: ${contentType}`,
    'MIME-Version: 1.0',
    '',
    body,
  ];
  const rawString = messageParts.join('\r\n');

  // Convert to Base64Url string
  const base64 = btoa(unescape(encodeURIComponent(rawString)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Fetch List of Gmail Messages
 */
export const fetchGmailMessages = async (
  maxResults = 20,
  query = ''
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string }> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error('Gmail authorization required. Please sign in with Google.');
  }

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.append('maxResults', String(maxResults));
  if (query) {
    url.searchParams.append('q', query);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('Gmail session expired. Please reconnect your Google account.');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gmail API Error (${res.status})`);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  // Fetch message headers details in parallel
  const details = await Promise.all(
    rawList.slice(0, maxResults).map((m) => fetchGmailMessageDetails(m.id).catch(() => null))
  );

  const validMessages = details.filter((m): m is GmailMessageSummary => m !== null);
  return { messages: validMessages, nextPageToken: data.nextPageToken };
};

/**
 * Fetch Full Details for a Single Message
 */
export const fetchGmailMessageDetails = async (messageId: string): Promise<GmailMessageSummary> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error('Gmail authorization required.');
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch message details for ${messageId}`);
  }

  const data = await res.json();
  const headers: GmailHeader[] = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const labelIds: string[] = data.labelIds || [];
  const unread = labelIds.includes('UNREAD');

  // Parse Body
  let body = '';
  if (data.payload?.body?.data) {
    body = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    const textPart = data.payload.parts.find(
      (p: any) => p.mimeType === 'text/html' || p.mimeType === 'text/plain'
    );
    if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data);
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject: getHeader('subject') || '(No Subject)',
    from: getHeader('from') || 'Unknown Sender',
    to: getHeader('to') || 'me',
    date: getHeader('date') || new Date(Number(data.internalDate)).toLocaleString(),
    unread,
    labelIds,
    body: body || data.snippet,
  };
};

/**
 * Helper to decode Base64Url
 */
function decodeBase64Url(base64Url: string): string {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  } catch (err) {
    return base64Url;
  }
}

/**
 * Send Email via Gmail API
 */
export const sendGmailMessage = async (payload: SendEmailPayload): Promise<any> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error('Gmail authorization required to send emails.');
  }

  const raw = buildRawEmail(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to send email via Gmail (${res.status})`);
  }

  return await res.json();
};

/**
 * Trash a Gmail Message
 */
export const trashGmailMessage = async (messageId: string): Promise<boolean> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error('Gmail authorization required.');
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return res.ok;
};

/**
 * Mark Message as Read
 */
export const markGmailAsRead = async (messageId: string): Promise<boolean> => {
  const token = getGmailAccessToken();
  if (!token) return false;

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    }
  );

  return res.ok;
};
