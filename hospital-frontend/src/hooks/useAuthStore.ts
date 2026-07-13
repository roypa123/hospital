import { create } from 'zustand';
import { api } from '@/api/endpoints';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  two_factor_enabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  tempToken: string | null;
  error: string | null;
  
  init: () => void;
  login: (email: string, password: string) => Promise<any>;
  verifyMfa: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUserProfile: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for the custom logout event from axios client (in case refresh token fails)
  if (typeof window !== 'undefined') {
    window.addEventListener('auth_logout', () => {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        mfaRequired: false,
        tempToken: null,
      });
    });
  }

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    mfaRequired: false,
    tempToken: null,
    error: null,

    init: () => {
      try {
        const userStr = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (userStr && accessToken && refreshToken) {
          set({
            user: JSON.parse(userStr),
            accessToken,
            refreshToken,
            isAuthenticated: true,
          });
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.auth.login({ email, password });
        
        if (response.data.mfaRequired) {
          set({
            mfaRequired: true,
            tempToken: response.data.tempToken,
            isLoading: false,
          });
          return { mfaRequired: true };
        }

        const { user, accessToken, refreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
        set({ error: errMsg, isLoading: false });
        throw new Error(errMsg, { cause: err });
      }
    },

    verifyMfa: async (tempToken, code) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.auth.verifyMfa({ tempToken, code });
        const { user, accessToken, refreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          mfaRequired: false,
          tempToken: null,
          isLoading: false,
        });
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Verification code invalid.';
        set({ error: errMsg, isLoading: false });
        throw new Error(errMsg, { cause: err });
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await api.auth.logout({ refreshToken });
        }
      } catch (e) {
        console.error("Logout request error", e);
      } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mfaRequired: false,
          tempToken: null,
          isLoading: false,
        });
      }
    },

    clearError: () => set({ error: null }),

    setUserProfile: (updatedFields) => {
      const currentUser = get().user;
      if (currentUser) {
        const newUser = { ...currentUser, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUser));
        set({ user: newUser });
      }
    },
  };
});
