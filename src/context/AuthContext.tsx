import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authApi, LoginPayload, RegisterPayload } from '../services/authApi';
import { integrationApi } from '../services/integrationApi';
import { getAccessToken, getRefreshToken, setAuthTokens, setOnAuthFailedListener, getAuthHeader, ApiError } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  authUser: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  googleLogin: (payload: { idToken?: string; credential?: string }) => Promise<void>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string; resendCooldownSeconds: number; devOtp?: string }>;
  loginWithOtp: (email: string, otp: string) => Promise<User>;
  switchUser: (userId: string, role?: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  updateCurrentUser: (updatedUser: Partial<User>) => void;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapping of backend roles to permission claims
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'PERM_SUPER_ADMIN',
    'SEVA_READ', 'SEVA_CREATE', 'SEVA_UPDATE', 'SEVA_DELETE',
    'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
    'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN',
    'TENANT_MANAGE', 'USER_MANAGE', 'REPORTS_VIEW', 'NOTIF_SEND'
  ],
  temple_admin: [
    'SEVA_READ', 'SEVA_CREATE', 'SEVA_UPDATE', 'SEVA_DELETE',
    'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
    'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN',
    'USER_MANAGE', 'REPORTS_VIEW', 'NOTIF_SEND'
  ],
  department_head: [
    'SEVA_READ',
    'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE',
    'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_ASSIGN',
    'REPORTS_VIEW'
  ],
  coordinator: [
    'SEVA_READ',
    'PROJECT_READ',
    'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_ASSIGN'
  ],
  member: [
    'SEVA_READ',
    'PROJECT_READ'
  ],
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('sevya_auth_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => !getAccessToken());
  const [error, setError] = useState<string | null>(null);

  const saveUserSession = (newUser: User | null) => {
    setUser(newUser);
    try {
      if (newUser) {
        localStorage.setItem('sevya_auth_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('sevya_auth_user');
      }
    } catch {}
  };

  useEffect(() => {
    // Register listener for 401 refresh failure
    setOnAuthFailedListener(() => {
      saveUserSession(null);
      setAccessToken(null);
      setError('Your session has expired. Please log in again.');
    });

    const initAuth = async () => {
      const storedToken = getAccessToken();
      const storedRefresh = getRefreshToken();

      if (storedToken || storedRefresh) {
        try {
          // Attempt profile fetch using stored access token
          if (storedToken) {
            try {
              const me = await authApi.getMe();
              saveUserSession(me);
              setAccessToken(storedToken);
              setIsLoading(false);
              return;
            } catch {
              // Access token expired, try refresh below
            }
          }

          if (storedRefresh) {
            const res = await authApi.refreshToken(storedRefresh);
            saveUserSession(res.user);
            setAccessToken(res.accessToken);
            integrationApi.syncCalendar().catch(() => {});
          }
        } catch {
          saveUserSession(null);
          setAccessToken(null);
        }
      } else {
        saveUserSession(null);
        setAccessToken(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const googleLogin = async (payload: { idToken?: string; credential?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.googleLogin(payload);
      saveUserSession(res.user);
      setAccessToken(res.accessToken);
      // Auto-sync Google Calendar in background seamlessly
      integrationApi.syncCalendar().catch(() => {});
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.problemDetail?.detail || err.message);
      } else {
        setError('Google authentication failed. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    setError(null);
    try {
      const res = await authApi.sendOtp({ email });
      return res;
    } catch (err: any) {
      if (err instanceof ApiError) {
        const errorMsg = err.problemDetail?.detail || err.message;
        setError(errorMsg);
        throw new Error(errorMsg);
      } else {
        const errorMsg = err?.message || 'Failed to send OTP. Please try again.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    }
  };

  const loginWithOtp = async (email: string, otp: string): Promise<User> => {
    setError(null);
    try {
      const res = await authApi.verifyOtp({ email, otp });
      saveUserSession(res.user);
      setAccessToken(res.accessToken);
      // Auto-sync Google Calendar in background seamlessly
      integrationApi.syncCalendar().catch(() => {});
      return res.user;
    } catch (err: any) {
      if (err instanceof ApiError) {
        const errorMsg = err.problemDetail?.detail || err.message;
        setError(errorMsg);
        throw new Error(errorMsg);
      } else {
        const errorMsg = err?.message || 'Invalid verification code. Please try again.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    }
  };

  const switchUser = async (userId: string, role?: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.switchUser(userId, role);
      saveUserSession(res.user);
      setAccessToken(res.accessToken);
      return res.user;
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.problemDetail?.detail || err.message);
      } else {
        setError('Failed to switch user role session.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const refreshToken = getRefreshToken();
    try {
      await authApi.logout(refreshToken);
    } finally {
      saveUserSession(null);
      setAccessToken(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const updateCurrentUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...updatedUser } : null;
      try {
        if (updated) {
          localStorage.setItem('sevya_auth_user', JSON.stringify(updated));
        } else {
          localStorage.removeItem('sevya_auth_user');
        }
      } catch {}
      return updated;
    });
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission) || permissions.includes('PERM_SUPER_ADMIN');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser: user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        error,
        googleLogin,
        sendOtp,
        loginWithOtp,
        switchUser,
        logout,
        clearError,
        hasPermission,
        updateCurrentUser,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
