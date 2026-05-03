'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui';
import { formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  provider: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  type: 'broadcast';
  href: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  // Try direct parse first
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // Try extracting a date pattern (YYYY-MM-DD) from the string
  const match = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const d2 = new Date(match[1]);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function extractDates(text: string): { start: Date | null; end: Date | null } {
  if (!text) return { start: null, end: null };
  // Find all date patterns in the string
  const matches = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (matches && matches.length >= 2) {
    return { start: parseDate(matches[0]), end: parseDate(matches[1]) };
  }
  if (matches && matches.length === 1) {
    return { start: parseDate(matches[0]), end: parseDate(matches[0]) };
  }
  // Try splitting on "to"
  const parts = text.split(/\s*(?:to|–)\s*/);
  return { start: parseDate(parts[0]), end: parts[1] ? parseDate(parts[1]) : parseDate(parts[0]) };
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (start && end) {
    const t = date.getTime();
    return t >= startOfDay(start).getTime() && t <= endOfDay(end).getTime();
  }
  if (start) return isSameDay(date, start);
  return false;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  // getDay: 0=Sun. We want Mon=0, so adjust.
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function EmployerCalendarPage() {
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [selectedTraining, setSelectedTraining] = useState<any[]>([]);

  useEffect(() => {
    api.get('/employer/selected-training').then((res) => {
      setSelectedTraining((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  const events: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];

    for (const t of selectedTraining) {
      let { start: startDate, end: endDate } = extractDates(t.proposed_schedule || '');

      if (!startDate && t.preferred_dates) {
        const fallback = extractDates(String(t.preferred_dates));
        startDate = fallback.start;
        endDate = fallback.end;
      }

      if (!startDate) continue;
      if (!endDate) endDate = startDate;

      result.push({
        id: t.proposal_id,
        title: t.title,
        provider: t.provider_name || 'Provider',
        status: 'awarded',
        startDate,
        endDate,
        type: 'broadcast',
        href: t.source === 'broadcast' && t.source_id ? `/employer/broadcasts/${t.source_id}` : '/employer/dashboard',
      });
    }

    return result;
  }, [selectedTraining]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  const eventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((ev) => isInRange(date, ev.startDate, ev.endDate));
  };

  const upcomingEvents = useMemo(() => {
    const now = startOfDay(new Date());
    return events
      .filter((ev) => {
        if (!ev.startDate) return true; // no date yet, still upcoming
        return ev.startDate.getTime() >= now.getTime() || (ev.endDate && ev.endDate.getTime() >= now.getTime());
      })
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.getTime() - b.startDate.getTime();
      });
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Training Calendar</h1>
        <p className="text-sm text-foreground-muted">View your scheduled and upcoming training activities</p>
      </div>

      {/* Calendar Header */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="rounded-lg border border-border p-2 hover:bg-background-subtle transition-colors">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="rounded-lg border border-border p-2 hover:bg-background-subtle transition-colors">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
          <button onClick={goToday} className="text-sm text-user-primary hover:text-user-primary-dark font-medium">
            Today
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            const dayEvents = date ? eventsForDay(date) : [];
            const isToday = date && isSameDay(date, today);
            return (
              <div
                key={i}
                className={`min-h-[90px] border-b border-r border-border p-1.5 ${
                  i % 7 === 0 ? 'border-l' : ''
                } ${!date ? 'bg-background-subtle/50' : 'bg-background-paper'}`}
              >
                {date && (
                  <>
                    <div className={`text-xs font-medium mb-1 ${
                      isToday
                        ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-user-primary text-white'
                        : 'text-foreground-muted'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <Link key={ev.id} href={ev.href}>
                          <div className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer hover:opacity-80 ${
                            ev.type === 'broadcast'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {ev.title}
                          </div>
                        </Link>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-foreground-muted px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming Trainings Summary */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground mb-1">Upcoming Trainings</h2>
        <p className="text-sm text-foreground-muted">All scheduled and pending training activities</p>
      </div>

      {upcomingEvents.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="h-10 w-10 text-foreground-subtle mb-3" />
            <p className="text-sm text-foreground-muted">No upcoming trainings</p>
            <p className="text-xs text-foreground-subtle mt-1">Create a broadcast or send an enquiry to get started</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map((ev) => (
            <Link key={`${ev.type}-${ev.id}`} href={ev.href}>
              <Card hover clickable className="mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{ev.title}</h3>
                      <Badge color={ev.type === 'broadcast' ? 'blue' : 'teal'} size="sm">
                        {ev.type === 'broadcast' ? 'Broadcast' : 'Enquiry'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      <span>{ev.provider}</span>
                      {ev.startDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ev.startDate)}
                          {ev.endDate && !isSameDay(ev.startDate, ev.endDate) && (
                            <> &mdash; {formatDate(ev.endDate)}</>
                          )}
                        </span>
                      )}
                      {!ev.startDate && <span className="italic">Date to be confirmed</span>}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ev.status)}`}>
                    {ev.status}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
