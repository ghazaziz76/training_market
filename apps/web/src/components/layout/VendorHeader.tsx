'use client';

import { Bell, Sun, Moon } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';
import { useThemeStore } from '@/stores/theme';

interface VendorHeaderProps {
  title: string;
}

export function VendorHeader({ title }: VendorHeaderProps) {
  const { unreadCount } = useNotificationStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background-paper px-6">
      <h1 className="text-xl font-bold text-foreground lg:ml-0 ml-12">{title}</h1>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button className="relative rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-vendor-accent text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
