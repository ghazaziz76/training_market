import { create } from 'zustand';
import { api } from '@/lib/api';

export interface AuthUser {
  user_id: string;
  role: 'employer' | 'individual' | 'provider' | 'admin';
  full_name: string;
  email: string;
  profile_image_url: string | null;
  profile_completion_pct: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem('auth-user');
      const storedTokens = localStorage.getItem('auth-tokens');
      if (storedUser && storedTokens) {
        set({
          user: JSON.parse(storedUser),
          tokens: JSON.parse(storedTokens),
          isAuthenticated: true,
        });
      }
    } catch {
      localStorage.removeItem('auth-user');
      localStorage.removeItem('auth-tokens');
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ tokens: AuthTokens; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      if (res.success && res.data) {
        const { tokens, user } = res.data;
        localStorage.setItem('auth-tokens', JSON.stringify(tokens));
        localStorage.setItem('auth-user', JSON.stringify(user));
        set({ user, tokens, isAuthenticated: true, isLoading: false });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, message: res.message || 'Login failed' };
    } catch {
      set({ isLoading: false });
      return { success: false, message: 'Network error' };
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', data);
      set({ isLoading: false });
      if (res.success) {
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch {
      set({ isLoading: false });
      return { success: false, message: 'Network error' };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('auth-tokens');
    localStorage.removeItem('auth-user');
    set({ user: null, tokens: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  setUser: (user) => {
    localStorage.setItem('auth-user', JSON.stringify(user));
    set({ user });
  },
}));
