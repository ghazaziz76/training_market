'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, MessageSquare, Radio, FileText, BarChart3,
  User, CreditCard, Menu, X, LogOut, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

const navItems = [
  { href: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/provider/programs', label: 'Programs', icon: BookOpen },
  { href: '/provider/enquiries', label: 'Enquiries', icon: MessageSquare },
  { href: '/provider/broadcasts', label: 'Broadcast Requests', icon: Radio },
  { href: '/provider/proposals', label: 'My Proposals', icon: FileText },
  { href: '/provider/calendar', label: 'Calendar', icon: Calendar },
  { href: '/provider/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/provider/profile', label: 'Profile', icon: User },
  { href: '/provider/subscription', label: 'Subscription', icon: CreditCard },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-vendor-primary-light">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-vendor-primary-200">
        <span className="text-xl font-bold text-vendor-primary">Training Market</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-vendor-primary text-white'
                  : 'text-foreground-muted hover:bg-vendor-primary/10 hover:text-vendor-primary',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-vendor-primary-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={user?.full_name || 'P'} src={user?.profile_image_url} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-foreground-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 rounded-lg bg-vendor-primary p-2 text-white shadow-lg lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">{sidebar}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <div className="fixed top-0 left-0 h-screen w-64 border-r border-border">{sidebar}</div>
      </div>
    </>
  );
}
