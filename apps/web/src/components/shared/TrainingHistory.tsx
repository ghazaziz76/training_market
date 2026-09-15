'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Calendar, CheckCircle, Clock, Eye, History, Search, Trash2, Undo2, Users } from 'lucide-react';
import { Button, Card, Input, Modal, Spinner, StatsCard, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';

type Role = 'employer' | 'individual';
type Filter = 'all' | 'attended' | 'viewed';

interface HistoryEntry {
  history_id: string;
  program_id: string;
  status: 'viewed' | 'attended';
  first_viewed_at: string;
  last_viewed_at: string;
  attended_on: string | null;
  participants_count: number;
  notes: string | null;
  program_title: string;
  program_status: string;
  duration_hours: number | null;
  duration_days: number | null;
  delivery_mode: string;
  is_certification: boolean;
  certification_name: string | null;
  category_name: string | null;
  provider_id: string;
  provider_name: string;
}

interface HistorySummary {
  total_viewed: number;
  total_attended: number;
  total_participants: number;
  total_hours: number;
  total_days: number;
  certifications: number;
}

interface HistoryResponse {
  entries: HistoryEntry[];
  summary: HistorySummary;
}

const EMPTY_SUMMARY: HistorySummary = {
  total_viewed: 0,
  total_attended: 0,
  total_participants: 0,
  total_hours: 0,
  total_days: 0,
  certifications: 0,
};

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  attended: 'Attended',
  viewed: 'Not yet attended',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function durationLabel(e: HistoryEntry): string | null {
  if (e.duration_days) return `${e.duration_days} day${e.duration_days > 1 ? 's' : ''}`;
  if (e.duration_hours) return `${e.duration_hours} hour${e.duration_hours > 1 ? 's' : ''}`;
  return null;
}

export function TrainingHistory({ role }: { role: Role }) {
  const isEmployer = role === 'employer';

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [summary, setSummary] = useState<HistorySummary>(EMPTY_SUMMARY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // "Attended" dialog state
  const [target, setTarget] = useState<HistoryEntry | null>(null);
  const [attendedOn, setAttendedOn] = useState(todayIso());
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<HistoryResponse>('/me/training-history');
    if (res.success && res.data) {
      setEntries(res.data.entries);
      setSummary(res.data.summary);
      setLoadError(null);
    } else {
      setLoadError(res.message || 'Could not load training history');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAttended = (e: HistoryEntry) => {
    setTarget(e);
    setAttendedOn(e.attended_on ? String(e.attended_on).slice(0, 10) : todayIso());
    setParticipants(String(e.participants_count || 1));
    setNotes(e.notes || '');
    setFormError(null);
  };

  const submitAttended = async () => {
    if (!target) return;
    if (!attendedOn) {
      setFormError('Enter the date attended');
      return;
    }
    const count = Number(participants);
    if (isEmployer && (!Number.isInteger(count) || count < 1)) {
      setFormError('Number of staff must be at least 1');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const res = await api.put<HistoryEntry>(`/me/training-history/${target.history_id}/attended`, {
      attended_on: attendedOn,
      participants_count: isEmployer ? count : 1,
      notes: notes.trim() || null,
    });
    setSubmitting(false);

    if (res.success) {
      setTarget(null);
      await load();
    } else {
      setFormError(res.message || res.errors?.[0]?.message || 'Could not save');
    }
  };

  const unmark = async (e: HistoryEntry) => {
    if (!window.confirm('Undo "attended" for this training? It will stay in your history as viewed.')) return;
    setBusyId(e.history_id);
    const res = await api.delete(`/me/training-history/${e.history_id}/attended`);
    setBusyId(null);
    if (res.success) await load();
  };

  const remove = async (e: HistoryEntry) => {
    if (!window.confirm('Remove this training from your history?')) return;
    setBusyId(e.history_id);
    const res = await api.delete(`/me/training-history/${e.history_id}`);
    setBusyId(null);
    if (res.success) await load();
  };

  const visible = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.status === filter);
  }, [entries, filter]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      attended: entries.filter((e) => e.status === 'attended').length,
      viewed: entries.filter((e) => e.status === 'viewed').length,
    }),
    [entries],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Training History</h1>
        <p className="text-sm text-foreground-muted">
          {isEmployer
            ? 'Programs you have looked at. Mark the ones your staff attended.'
            : 'Programs you have looked at. Mark the ones you attended.'}
        </p>
      </div>

      {loadError && (
        <Card className="mb-6 border-red-300">
          <p className="text-sm text-red-600">{loadError}</p>
        </Card>
      )}

      {/* Summary (attended only) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={<CheckCircle className="h-5 w-5" />} label="Trainings attended" value={summary.total_attended} />
        {isEmployer ? (
          <StatsCard icon={<Users className="h-5 w-5" />} label="Staff trained" value={summary.total_participants} />
        ) : (
          <StatsCard icon={<Award className="h-5 w-5" />} label="Certifications" value={summary.certifications} />
        )}
        <StatsCard
          icon={<Calendar className="h-5 w-5" />}
          label={isEmployer ? 'Staff training days' : 'Training days'}
          value={summary.total_days}
        />
        <StatsCard
          icon={<Clock className="h-5 w-5" />}
          label={isEmployer ? 'Staff training hours' : 'Training hours'}
          value={summary.total_hours}
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'border-user-primary text-user-primary'
                : 'border-transparent text-foreground-muted hover:border-border hover:text-foreground'
            }`}
          >
            {FILTER_LABELS[f]}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                filter === f ? 'bg-user-primary/10 text-user-primary' : 'bg-background-subtle text-foreground-muted'
              }`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <History className="mb-3 h-10 w-10 text-foreground-subtle" />
            <p className="text-sm text-foreground-muted">
              {entries.length === 0 ? 'Nothing here yet' : `No ${FILTER_LABELS[filter].toLowerCase()} trainings`}
            </p>
            {entries.length === 0 && (
              <>
                <p className="mt-1 text-xs text-foreground-subtle">
                  Every program you open is added here automatically
                </p>
                <Link href="/search" className="mt-4">
                  <Button variant="outline" leftIcon={<Search className="h-4 w-4" />}>
                    Browse programs
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => {
            const attended = e.status === 'attended';
            const duration = durationLabel(e);
            const busy = busyId === e.history_id;
            return (
              <Card key={e.history_id} className={attended ? 'border-green-200' : ''}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/programs/${e.program_id}`}
                        className="font-semibold text-foreground hover:text-user-primary"
                      >
                        {e.program_title}
                      </Link>
                      {attended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" /> Attended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background-subtle px-2 py-0.5 text-xs font-medium text-foreground-muted">
                          <Eye className="h-3 w-3" /> Viewed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
                      <span>{e.provider_name}</span>
                      {e.category_name && <span>{e.category_name}</span>}
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      )}
                      {attended && e.attended_on ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <Calendar className="h-3 w-3" />
                          Attended {formatDate(e.attended_on)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Viewed {formatDate(e.last_viewed_at)}
                        </span>
                      )}
                      {attended && isEmployer && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {e.participants_count} staff
                        </span>
                      )}
                      {attended && e.is_certification && (
                        <span className="flex items-center gap-1 text-green-700">
                          <Award className="h-3 w-3" />
                          {e.certification_name || 'Certification'}
                        </span>
                      )}
                    </div>
                    {attended && e.notes && <p className="mt-2 text-sm text-foreground-muted">{e.notes}</p>}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {attended ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openAttended(e)} disabled={busy}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unmark(e)}
                          disabled={busy}
                          leftIcon={<Undo2 className="h-4 w-4" />}
                          title="Undo attended"
                        >
                          Undo
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openAttended(e)}
                        disabled={busy}
                        leftIcon={<CheckCircle className="h-4 w-4" />}
                      >
                        {isEmployer ? 'Staff attended' : 'Attended'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      disabled={busy}
                      title="Remove from history"
                      className="rounded p-2 text-foreground-subtle hover:bg-background-subtle hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Attended dialog */}
      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={isEmployer ? 'Staff attended this training' : 'I attended this training'}
        size="md"
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded border border-user-primary/40 bg-user-primary/5 p-3">
              <p className="truncate text-sm font-semibold text-foreground">{target.program_title}</p>
              <p className="text-xs text-foreground-muted">{target.provider_name}</p>
            </div>

            <div className={isEmployer ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
              <Input
                label="Date attended"
                type="date"
                value={attendedOn}
                max={todayIso()}
                onChange={(ev) => setAttendedOn(ev.target.value)}
              />
              {isEmployer && (
                <Input
                  label="Number of staff attended"
                  type="number"
                  min={1}
                  value={participants}
                  onChange={(ev) => setParticipants(ev.target.value)}
                />
              )}
            </div>

            <Textarea
              label="Notes (optional)"
              rows={3}
              placeholder={isEmployer ? 'e.g. Sales team, Q2 upskilling' : 'e.g. Completed with distinction'}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
            />

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTarget(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitAttended} isLoading={submitting}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
