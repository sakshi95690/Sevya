import { request, setAuthTokens } from './apiClient';
import { User } from '../types';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  idToken?: string;
  credential?: string;
}

export interface SendOtpPayload {
  email: string;
  templeId?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  devOtp?: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AdminUserProvisionPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  departmentId?: string;
  templeId?: string;
  templeName?: string;
  status?: string;
  createdBy?: User;
}

export const authApi = {
  getMe: async (): Promise<User> => {
    return request<User>('/v1/auth/me');
  },

  googleLogin: async (payload: GoogleLoginPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },

  sendOtp: async (payload: SendOtpPayload): Promise<SendOtpResponse> => {
    return request<SendOtpResponse>('/v1/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },

  logout: async (refreshToken?: string | null): Promise<void> => {
    try {
      if (refreshToken) {
        await request('/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore logout API failures
    } finally {
      setAuthTokens(null, null);
    }
  },

  // Admin User Provisioning & Management APIs
  getAdminUsers: async (filters?: { role?: string; status?: string; search?: string }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<User[]>(`/v1/admin/users${query}`);
  },

  createAdminUser: async (payload: AdminUserProvisionPayload): Promise<User> => {
    return request<User>('/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    return request<User>(`/v1/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  updateUserRole: async (userId: string, role: string, updatedBy?: User, designationId?: string | null): Promise<User> => {
    return request<User>(`/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, designationId, updatedBy }),
    });
  },

  updateUserStatus: async (userId: string, accountStatus: string, updatedBy?: User): Promise<User> => {
    return request<User>(`/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus, updatedBy }),
    });
  },

  deleteAdminUser: async (userId: string): Promise<void> => {
    return request<void>(`/v1/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  switchUser: async (userId: string, role?: string): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/v1/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
    setAuthTokens(res.accessToken, res.refreshToken);
    return res;
  },
};
