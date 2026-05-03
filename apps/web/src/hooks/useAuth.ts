'use client';

import { useEffect } from 'react';
import { useAuthStore, type AuthTokens, type AuthUser } from '@/stores/auth';

export type { AuthTokens, AuthUser };

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = (role?: string): string => {
    const r = role || store.user?.role;
    switch (r) {
      case 'employer':
        return '/employer';
      case 'individual':
        return '/individual';
      case 'provider':
        return '/provider/dashboard';
      case 'admin':
        return '/admin';
      default:
        return '/login';
    }
  };

  return {
    ...store,
    redirectByRole,
  };
}
