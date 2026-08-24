// Centralized HTTP API Client with RFC 7807 Error Handling, Token Rotation, and Correlation ID

/**
 * Returns the effective API Base URL for SEVYA.
 * In production builds without an explicit env variable, defaults to the production Render backend.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If running in browser on Firebase Hosting or custom domains, route to Render production backend
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname.toLowerCase();
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const isCloudRunDev = host.includes('.run.app');

    if (!isLocalhost && !isCloudRunDev) {
      return 'https://sevya-backend.onrender.com';
    }
  }

  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  problemDetail?: ProblemDetail;

  constructor(message: string, status: number, problemDetail?: ProblemDetail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problemDetail = problemDetail;
  }
}

// Token storage helpers
let accessTokenInMemory: string | null = localStorage.getItem('sevya_access_token');
let refreshTokenInMemory: string | null = localStorage.getItem('sevya_refresh_token');

export function setAuthTokens(accessToken: string | null, refreshToken: string | null) {
  accessTokenInMemory = accessToken;
  refreshTokenInMemory = refreshToken;

  if (accessToken) {
    localStorage.setItem('sevya_access_token', accessToken);
  } else {
    localStorage.removeItem('sevya_access_token');
  }

  if (refreshToken) {
    localStorage.setItem('sevya_refresh_token', refreshToken);
  } else {
    localStorage.removeItem('sevya_refresh_token');
  }
}

export function getAccessToken(): string | null {
  return accessTokenInMemory || localStorage.getItem('sevya_access_token');
}

export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getRefreshToken(): string | null {
  return refreshTokenInMemory || localStorage.getItem('sevya_refresh_token');
}

// Global auth refresh listener
let onAuthFailedCallback: (() => void) | null = null;
export function setOnAuthFailedListener(callback: () => void) {
  onAuthFailedCallback = callback;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Helper: Build absolute or normalized endpoint URL
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (baseUrl === '/api') {
    if (cleanEndpoint.startsWith('/api/')) {
      return cleanEndpoint;
    }
    return `/api${cleanEndpoint}`;
  }

  // baseUrl is an absolute origin like https://sevya-backend.onrender.com or https://sevya-backend.onrender.com/api
  if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${baseUrl}${cleanEndpoint.slice(4)}`;
  }

  return `${baseUrl}${cleanEndpoint}`;
}

// Helper: Perform token refresh
async function handleTokenRefresh(): Promise<string> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new ApiError('No refresh token available', 401);
  }

  const refreshUrl = buildApiUrl('/v1/auth/refresh');
  const res = await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  });

  if (!res.ok) {
    setAuthTokens(null, null);
    if (onAuthFailedCallback) onAuthFailedCallback();
    throw new ApiError('Session expired. Please log in again.', res.status);
  }

  const data = await res.json();
  setAuthTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = getAccessToken();
  const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildApiUrl(endpoint);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await handleTokenRefresh();
          isRefreshing = false;
          onRefreshed(newToken);
          return request<T>(endpoint, options, true);
        } catch (err) {
          isRefreshing = false;
          throw err;
        }
      } else {
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            request<T>(endpoint, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            }, true)
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    if (!res.ok) {
      let problemDetail: ProblemDetail | undefined;
      let errorMsg = `Request failed with status ${res.status}`;

      try {
        const body = await res.json();
        if (body) {
          problemDetail = body;
          errorMsg = body.detail || body.message || body.error || errorMsg;
        }
      } catch {
        // Fallback
      }

      throw new ApiError(errorMsg, res.status, problemDetail);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
    const helpfulMsg = isNetworkError
      ? 'Unable to connect to SEVYA Backend API. Please check your internet connection or verify the backend server status.'
      : (err.message || 'Network connection failure');
    throw new ApiError(helpfulMsg, 0);
  }
}
