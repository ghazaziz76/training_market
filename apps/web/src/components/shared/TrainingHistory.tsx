'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Calendar, Clock, History, Plus, Search, Trash2, Users } from 'lucide-react';
import { Button, Card, Input, Modal, Spinner, StatsCard, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';

type Role = 'employer' | 'individual';

interface HistoryEntry {
  attendance_id: string;
  program_id: string;
  attended_on: string;
  participants_count: number;
  notes: string | null;
  program_title: string;
  program_slug: string;
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
  total_trainings: number;
  total_participants: number;
  total_hours: number;
  total_days: number;
  certifications: number;
}

interface HistoryResponse {
  entries: HistoryEntry[];
  summary: HistorySummary;
}

interface ProgramOption {
  program_id: string;
  title: string;
  provider?: { provider_name?: string };
  category?: { name?: string };
  duration_days?: number | null;
  duration_hours?: number | null;
}

const EMPTY_SUMMARY: HistorySummary = {
  total_trainings: 0,
  total_participants: 0,
  total_hours: 0,
  total_days: 0,
  certifications: 0,
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

  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProgramOption[]>([]);
  const [selected, setSelected] = useState<ProgramOption | null>(null);
  const [attendedOn, setAttendedOn] = useState(todayIso());
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);

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

  // Debounced program search inside the modal
  useEffect(() => {
    if (!modalOpen) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await api.get<ProgramOption[]>(`/search/programs?q=${encodeURIComponent(q)}&limit=8`);
      setResults(res.success && res.data ? res.data : []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, modalOpen]);

  const openModal = () => {
    setQuery('');
    setResults([]);
    setSelected(null);
    setAttendedOn(todayIso());
    setParticipants('1');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!selected) {
      setFormError('Pick the training program first');
      return;
    }
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
    const res = await api.post<HistoryEntry>('/me/training-history', {
      program_id: selected.program_id,
      attended_on: attendedOn,
      participants_count: isEmployer ? count : 1,
      notes: notes.trim() || null,
    });
    setSubmitting(false);

    if (res.success) {
      setModalOpen(false);
      await load();
    } else {
      setFormError(res.message || res.errors?.[0]?.message || 'Could not save this training');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this training from your history?')) return;
    setRemovingId(id);
    const res = await api.delete(`/me/training-history/${id}`);
    setRemovingId(null);
    if (res.success) await load();
  };

  const groupedByYear = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const year = new Date(e.attended_on).getFullYear().toString();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(e);
    }
    return [...map.entries()];
  }, [entries]);

  const addLabel = isEmployer ? 'Add staff training' : 'Add attended training';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training History</h1>
          <p className="text-sm text-foreground-muted">
            {isEmployer
              ? 'Trainings your staff have attended'
              : 'Trainings you have attended'}
          </p>
        </div>
        <Button onClick={openModal} leftIcon={<Plus className="h-4 w-4" />}>
          {addLabel}
        </Button>
      </div>

      {loadError && (
        <Card className="mb-6 border-red-300">
          <p className="text-sm text-red-600">{loadError}</p>
        </Card>
      )}

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={<History className="h-5 w-5" />} label="Trainings attended" value={summary.total_trainings} />
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

      {/* List */}
      {entries.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <History className="mb-3 h-10 w-10 text-foreground-subtle" />
            <p className="text-sm text-foreground-muted">No trainings recorded yet</p>
            <p className="mt-1 text-xs text-foreground-subtle">
              {isEmployer
                ? 'Record trainings your staff have attended to build your company history'
                : 'Record trainings you have attended to build your history'}
            </p>
            <Button className="mt-4" variant="outline" onClick={openModal} leftIcon={<Plus className="h-4 w-4" />}>
              {addLabel}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedByYear.map(([year, items]) => (
            <section key={year}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">{year}</h2>
              <div className="space-y-3">
                {items.map((e) => {
                  const duration = durationLabel(e);
                  return (
                    <Card key={e.attendance_id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/programs/${e.program_id}`}
                            className="font-semibold text-foreground hover:text-user-primary"
                          >
                            {e.program_title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
                            <span>{e.provider_name}</span>
                            {e.category_name && <span>{e.category_name}</span>}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Attended {formatDate(e.attended_on)}
                            </span>
                            {duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {duration}
                              </span>
                            )}
                            {isEmployer && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {e.participants_count} staff
                              </span>
                            )}
                            {e.is_certification && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Award className="h-3 w-3" />
                                {e.certification_name || 'Certification'}
                              </span>
                            )}
                          </div>
                          {e.notes && <p className="mt-2 text-sm text-foreground-muted">{e.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(e.attendance_id)}
                          disabled={removingId === e.attendance_id}
                          title="Remove from history"
                          className="flex-shrink-0 rounded p-2 text-foreground-subtle hover:bg-background-subtle hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={addLabel} size="md">
        <div className="space-y-4">
          {selected ? (
            <div className="rounded border border-user-primary/40 bg-user-primary/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{selected.title}</p>
                  <p className="text-xs text-foreground-muted">{selected.provider?.provider_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs font-medium text-user-primary hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <Input
                label="Training program"
                placeholder="Search by program or provider name"
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                autoFocus
              />
              {query.trim() && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border">
                  {searching ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-foreground-muted">No programs match that search</p>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.program_id}
                        type="button"
                        onClick={() => {
                          setSelected(p);
                          setFormError(null);
                        }}
                        className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-background-subtle"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-foreground-muted">
                          {p.provider?.provider_name}
                          {p.category?.name ? ` · ${p.category.name}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={submitting}>
              Save to history
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
