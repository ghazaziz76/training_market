'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Users, Calendar, Clock } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Card, Badge, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  client: string;
  location: string;
  participants: number | null;
  status: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: 'schedule' | 'proposal';
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const days = getDaysInMonth(year, month);
  const firstDay = days[0].getDay(); // 0=Sun
  // Convert to Mon-based: Mon=0 ... Sun=6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(startOffset).fill(null);

  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }

  // Pad last week
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }

  return grid;
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function getStatusBadgeColor(status: string): 'green' | 'blue' | 'purple' | 'yellow' | 'gray' {
  switch (status) {
    case 'selected': return 'green';
    case 'open': return 'blue';
    case 'shortlisted': return 'purple';
    case 'submitted': return 'yellow';
    default: return 'gray';
  }
}

export default function ProviderCalendarPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [programsRes, proposalsRes] = await Promise.all([
          api.get('/programs/my-programs?limit=50'),
          api.get('/proposals/my-proposals'),
        ]);

        if (cancelled) return;

        const calEvents: CalendarEvent[] = [];

        // Extract schedule events from programs
        const programs = programsRes.data || [];
        for (const program of programs) {
          if (program.schedules && Array.isArray(program.schedules)) {
            for (const schedule of program.schedules) {
              if (schedule.start_date) {
                calEvents.push({
                  id: schedule.schedule_id || `sched-${program.program_id}-${schedule.start_date}`,
                  title: program.title,
                  client: '',
                  location: schedule.venue || schedule.online_platform || program.delivery_mode || '',
                  participants: schedule.available_seats || null,
                  status: schedule.status || 'open',
                  startDate: schedule.start_date.split('T')[0],
                  endDate: (schedule.end_date || schedule.start_date).split('T')[0],
                  type: 'schedule',
                });
              }
            }
          }
        }

        // Extract events from proposals (selected/shortlisted proposals with schedule info)
        const proposals = proposalsRes.data || [];
        for (const proposal of proposals) {
          if (proposal.status === 'selected' || proposal.status === 'shortlisted') {
            // Proposals have proposed_schedule as text, and the request has preferred_dates
            const title = proposal.request?.title || proposal.enquiry?.subject || 'Proposal';
            const client = proposal.request?.employer?.company_name || proposal.enquiry?.requester?.full_name || '';

            // Try to parse preferred_dates from the request or response_deadline as a fallback
            const request = proposal.request;
            let startDate = '';
            let endDate = '';

            if (request?.preferred_dates) {
              // preferred_dates might be a text like "2026-04-01" or a range
              const dateMatch = request.preferred_dates.match(/(\d{4}-\d{2}-\d{2})/);
              if (dateMatch) {
                startDate = dateMatch[1];
                // Try to find end date
                const allDates = request.preferred_dates.match(/(\d{4}-\d{2}-\d{2})/g);
                endDate = allDates && allDates.length > 1 ? allDates[allDates.length - 1] : startDate;
              }
            }

            if (!startDate && request?.response_deadline) {
              startDate = request.response_deadline.split('T')[0];
              endDate = startDate;
            }

            if (startDate) {
              calEvents.push({
                id: proposal.proposal_id,
                title,
                client,
                location: request?.preferred_location || '',
                participants: request?.participant_count || null,
                status: proposal.status,
                startDate,
                endDate: endDate || startDate,
                type: 'proposal',
              });
            }
          }
        }

        setEvents(calEvents);
      } catch {
        // Silently fail, show empty calendar
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const grid = useMemo(() => getCalendarGrid(year, month), [year, month]);

  const todayStr = toDateStr(new Date());

  // Map events to dates for the current month
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      // For each day in the event's range, if it falls in this month, add it
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Clamp to month boundaries
      const rangeStart = ev.startDate > monthStart ? ev.startDate : monthStart;
      const rangeEnd = ev.endDate < monthEnd ? ev.endDate : monthEnd;

      if (rangeStart > rangeEnd) continue;

      const d = new Date(rangeStart + 'T00:00:00');
      const end = new Date(rangeEnd + 'T00:00:00');
      while (d <= end) {
        const ds = toDateStr(d);
        if (!map[ds]) map[ds] = [];
        map[ds].push(ev);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [events, year, month]);

  // Upcoming sessions sorted by date
  const upcomingSessions = useMemo(() => {
    return events
      .filter((e) => e.endDate >= todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, todayStr]);

  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  return (
    <>
      <VendorHeader title="Training Calendar" />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={prevMonth}
                  className="rounded-lg border border-border p-2 text-foreground hover:bg-background-paper transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-foreground min-w-[200px] text-center">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button
                  onClick={nextMonth}
                  className="rounded-lg border border-border p-2 text-foreground hover:bg-background-paper transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={goToday}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-vendor-primary hover:bg-vendor-primary/5 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Calendar Grid */}
            <Card>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="px-2 py-3 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Week rows */}
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                  {week.map((date, di) => {
                    if (!date) {
                      return <div key={`empty-${wi}-${di}`} className="min-h-[100px] bg-background-subtle/30" />;
                    }

                    const dateStr = toDateStr(date);
                    const dayEvents = eventsByDate[dateStr] || [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                        className={cn(
                          'min-h-[100px] p-1.5 text-left transition-colors border-r border-border last:border-r-0 hover:bg-background-subtle/50',
                          isSelected && 'bg-vendor-primary/5 ring-1 ring-inset ring-vendor-primary',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                            isToday ? 'bg-vendor-primary text-white font-bold' : 'text-foreground',
                          )}
                        >
                          {date.getDate()}
                        </span>

                        {/* Event dots / mini labels */}
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev, ei) => (
                            <div
                              key={`${ev.id}-${ei}`}
                              className={cn(
                                'truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium',
                                ev.type === 'schedule'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700',
                              )}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-foreground-muted px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </Card>

            {/* Selected Date Detail */}
            {selectedDate && (
              <Card>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Events on {formatDate(selectedDate)}
                </h3>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-foreground-muted py-4">No events on this date.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((ev, i) => (
                      <div
                        key={`${ev.id}-${i}`}
                        className="flex items-start justify-between rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground truncate">{ev.title}</h4>
                            <Badge color={getStatusBadgeColor(ev.status)} size="sm">
                              {ev.status}
                            </Badge>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                ev.type === 'schedule'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700',
                              )}
                            >
                              {ev.type === 'schedule' ? 'Session' : 'Proposal'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-foreground-muted">
                            {ev.client && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {ev.client}
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.location}
                              </span>
                            )}
                            {ev.participants && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {ev.participants} pax
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(ev.startDate)}
                              {ev.endDate !== ev.startDate && ` - ${formatDate(ev.endDate)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Upcoming Sessions List */}
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-vendor-primary" />
                  Upcoming Sessions
                </span>
              </h3>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-foreground-muted py-4">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingSessions.map((ev, i) => (
                    <div
                      key={`${ev.id}-upcoming-${i}`}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">{ev.title}</h4>
                          <Badge color={getStatusBadgeColor(ev.status)} size="sm">
                            {ev.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-foreground-muted mt-1">
                          {ev.client && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {ev.client}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </span>
                          )}
                          {ev.participants && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {ev.participants} pax
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-medium text-foreground">{formatDate(ev.startDate)}</p>
                        {ev.endDate !== ev.startDate && (
                          <p className="text-xs text-foreground-muted">to {formatDate(ev.endDate)}</p>
                        )}
                        <span
                          className={cn(
                            'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            ev.type === 'schedule'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700',
                          )}
                        >
                          {ev.type === 'schedule' ? 'Session' : 'Proposal'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
