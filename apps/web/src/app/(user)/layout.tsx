'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { UserNavbar } from '@/components/layout/UserNavbar';
import { UserFooter } from '@/components/layout/UserFooter';
import { Spinner } from '@/components/ui';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const state = useAuthStore.getState();
    if (!state.isAuthenticated && !state.user) {
      const stored = localStorage.getItem('auth-user');
      if (!stored) {
        router.push('/login');
        return;
      }
    }
    if (state.user?.role === 'provider') {
      router.push('/provider/dashboard');
    } else if (state.user?.role === 'admin') {
      router.push('/admin');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <UserNavbar />
      <main className="flex-1">{children}</main>
      <UserFooter />
    </div>
  );
}
