'use client';

import { Bell } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background-paper px-6">
      <h1 className="text-xl font-bold text-foreground lg:ml-0 ml-12">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
