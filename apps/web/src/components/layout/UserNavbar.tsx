'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Menu, X, ChevronDown, LogOut, User, Radio, LayoutDashboard, MessageSquare, Sun, Moon, Heart, Calendar, History, HelpCircle, Star, MoreHorizontal } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';

export function UserNavbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await api.get<any>(`/search/suggest?q=${encodeURIComponent(query)}`);
      if (res.success && res.data) {
        const d = res.data;
        const items: string[] = [];
        if (d.programs) d.programs.forEach((p: any) => items.push(p.title));
        if (d.providers) d.providers.forEach((p: any) => items.push(p.provider_name));
        if (d.categories) d.categories.forEach((c: any) => items.push(c.name));
        if (d.skills) d.skills.forEach((s: any) => items.push(s.name));
        // Dedupe and limit
        setSuggestions([...new Set(items)].slice(0, 8));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const isEmployer = user?.role === 'employer';

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background-paper">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <Link href={isEmployer ? '/employer' : '/individual'} className="flex-shrink-0">
            <span className="text-xl font-bold text-user-primary">Training Market</span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="relative hidden md:flex flex-1 max-w-xl mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search training programs..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => query && setShowSuggestions(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-full border border-border bg-background-subtle py-2 pl-10 pr-4 text-sm focus:border-user-primary focus:outline-none focus:ring-1 focus:ring-user-primary"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background-paper shadow-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(s);
                      handleSearch(s);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background-subtle"
                  >
                    <Search className="h-3 w-3 text-foreground-subtle" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Employer nav links */}
            {isEmployer && (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/employer/dashboard" className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-subtle">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/employer/enquiries" className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-subtle">
                  <MessageSquare className="h-4 w-4" />
                  <span>Enquiries</span>
                </Link>
                <Link href="/employer/broadcasts" className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-subtle">
                  <Radio className="h-4 w-4" />
                  <span>Broadcasts</span>
                </Link>
                {/* More dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-background-subtle">
                    <MoreHorizontal className="h-4 w-4" />
                    <span>More</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-background-paper shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link href="/employer/calendar" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-background-subtle first:rounded-t-lg">
                      <Calendar className="h-4 w-4 text-foreground-muted" /> Calendar
                    </Link>
                    <Link href="/employer/history" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-background-subtle">
                      <History className="h-4 w-4 text-foreground-muted" /> Training History
                    </Link>
                    <Link href="/categories" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-background-subtle">
                      <Search className="h-4 w-4 text-foreground-muted" /> Browse Categories
                    </Link>
                    <Link href="/testimonials" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-background-subtle">
                      <Star className="h-4 w-4 text-foreground-muted" /> Success Stories
                    </Link>
                    <Link href="/faq" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-background-subtle last:rounded-b-lg">
                      <HelpCircle className="h-4 w-4 text-foreground-muted" /> FAQ / Help
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <Link href="/saved" className="rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
              <Heart className="h-5 w-5" />
            </Link>
            <button onClick={toggleTheme} className="rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link href="/employer/notifications" className="relative rounded-full p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div ref={menuRef} className="relative hidden md:block">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-background-subtle"
              >
                <Avatar name={user?.full_name || 'U'} src={user?.profile_image_url} size="sm" />
                <ChevronDown className="h-4 w-4 text-foreground-muted" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background-paper shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                    <p className="text-xs text-foreground-muted">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href={isEmployer ? '/employer/profile' : '/individual/profile'}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background-subtle"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-background-subtle"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden rounded p-2 text-foreground-muted hover:bg-background-subtle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background-paper md:hidden">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                    setMobileMenuOpen(false);
                  }
                }}
                className="w-full rounded-full border border-border bg-background-subtle py-2 pl-10 pr-4 text-sm"
              />
            </div>
          </div>
          <div className="border-t border-border px-4 py-2 space-y-1">
            <Link
              href={isEmployer ? '/employer/profile' : '/individual/profile'}
              className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </Link>
            {isEmployer && (
              <>
                <Link
                  href="/employer/dashboard"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/employer/enquiries"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Enquiries
                </Link>
                <Link
                  href="/employer/broadcasts"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Broadcasts
                </Link>
                <Link
                  href="/employer/calendar"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Calendar
                </Link>
                <Link
                  href="/employer/history"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Training History
                </Link>
                <Link
                  href="/employer/notifications"
                  className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background-subtle"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Notifications
                </Link>
              </>
            )}
            <button
              onClick={() => logout()}
              className="block w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-background-subtle"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
