'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { History, TrendingUp, DollarSign, Award, Users } from 'lucide-react';
import { Card, Badge, Spinner, StatsCard } from '@/components/ui';
import { formatDate as _formatDate, formatCurrency, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

function formatDate(d: any): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return _formatDate(date);
  } catch {
    return String(d);
  }
}

type TabFilter = 'all' | 'completed' | 'in_progress';

interface TrainingEntry {
  id: string;
  title: string;
  provider: string;
  date: string | null;
  endDate: string | null;
  participants: number | null;
  cost: number | null;
  effectivenessScore: number | null;
  status: string;
  href: string;
}

const TAB_LABELS: Record<TabFilter, string> = {
  all: 'All',
  completed: 'Completed',
  in_progress: 'In Progress',
};

function matchesTab(entry: TrainingEntry, tab: TabFilter): boolean {
  if (tab === 'all') return true;
  const s = entry.status?.toLowerCase();
  if (tab === 'completed') return ['awarded', 'completed', 'closed', 'selected'].includes(s);
  if (tab === 'in_progress') return ['open', 'active', 'reviewing', 'shortlisted', 'submitted', 'pending', 'pending_review'].includes(s);
  return true;
}

function renderStars(score: number): string {
  const rounded = Math.round(score * 10) / 10;
  return `${rounded}/5`;
}

export default function EmployerHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [effectiveness, setEffectiveness] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    Promise.all([
      api.get('/employer/effectiveness'),
      api.get('/broadcast-requests/my-requests?limit=50'),
    ]).then(([eff, brd]) => {
      setEffectiveness(eff.data || null);
      setBroadcasts((brd.data as any) || []);
      setLoading(false);
    });
  }, []);

  const entries: TrainingEntry[] = useMemo(() => {
    const result: TrainingEntry[] = [];

    // Build a lookup of effectiveness data if available
    const effMap = new Map<string, any>();
    if (effectiveness?.trainings && Array.isArray(effectiveness.trainings)) {
      for (const t of effectiveness.trainings) {
        if (t.request_id) effMap.set(t.request_id, t);
        if (t.broadcast_id) effMap.set(t.broadcast_id, t);
      }
    }

    for (const b of broadcasts) {
      const effData = effMap.get(b.request_id);
      const proposal = b.selected_proposal;

      let date = proposal?.proposed_start_date || proposal?.proposed_schedule || b.preferred_dates || b.created_at;
      let endDate = proposal?.proposed_end_date || null;

      // If preferred_dates is a range, try to parse
      if (typeof date === 'string' && date.includes(' to ')) {
        const parts = date.split(/\s*to\s*/);
        date = parts[0];
        endDate = endDate || parts[1];
      }

      result.push({
        id: b.request_id,
        title: b.title || 'Untitled',
        provider: proposal?.provider_name || effData?.provider_name || (b.total_proposals ? `${b.total_proposals} proposals` : 'N/A'),
        date,
        endDate,
        participants: proposal?.proposed_participants || effData?.participants || b.number_of_participants || null,
        cost: proposal?.proposed_fee || effData?.cost || null,
        effectivenessScore: effData?.effectiveness_score || effData?.score || null,
        status: b.status,
        href: `/employer/broadcasts/${b.request_id}`,
      });
    }

    // Add any effectiveness trainings not already in broadcasts
    if (effectiveness?.trainings && Array.isArray(effectiveness.trainings)) {
      const broadcastIds = new Set(broadcasts.map((b: any) => b.request_id));
      for (const t of effectiveness.trainings) {
        const tId = t.request_id || t.broadcast_id || t.training_id;
        if (tId && broadcastIds.has(tId)) continue;
        result.push({
          id: tId || `eff-${Math.random()}`,
          title: t.title || t.program_title || 'Training',
          provider: t.provider_name || 'Provider',
          date: t.start_date || t.date || t.created_at || null,
          endDate: t.end_date || null,
          participants: t.participants || null,
          cost: t.cost || t.total_cost || null,
          effectivenessScore: t.effectiveness_score || t.score || null,
          status: t.status || 'completed',
          href: '#',
        });
      }
    }

    // Sort by date descending
    result.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [broadcasts, effectiveness]);

  const filteredEntries = useMemo(() => entries.filter((e) => matchesTab(e, activeTab)), [entries, activeTab]);

  const stats = useMemo(() => {
    const completed = entries.filter((e) => matchesTab(e, 'completed'));
    const totalSpend = completed.reduce((sum, e) => sum + (e.cost || 0), 0);
    const withScore = completed.filter((e) => e.effectivenessScore !== null);
    const avgScore = withScore.length > 0
      ? withScore.reduce((sum, e) => sum + (e.effectivenessScore || 0), 0) / withScore.length
      : null;

    return {
      totalCompleted: completed.length,
      totalSpend,
      avgEffectiveness: avgScore,
      totalParticipants: completed.reduce((sum, e) => sum + (e.participants || 0), 0),
    };
  }, [entries]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Training History</h1>
        <p className="text-sm text-foreground-muted">Review past trainings, spending, and effectiveness</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={<Award className="h-5 w-5" />}
          label="Trainings Completed"
          value={stats.totalCompleted}
        />
        <StatsCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Spend"
          value={stats.totalSpend > 0 ? formatCurrency(stats.totalSpend) : '--'}
        />
        <StatsCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg. Effectiveness"
          value={stats.avgEffectiveness !== null ? renderStars(stats.avgEffectiveness) : '--'}
          change={stats.avgEffectiveness !== null && stats.avgEffectiveness >= 4 ? 'Above target' : stats.avgEffectiveness !== null ? 'Below target' : 'No data yet'}
          changeType={stats.avgEffectiveness !== null && stats.avgEffectiveness >= 4 ? 'positive' : 'neutral'}
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          label="Total Participants"
          value={stats.totalParticipants > 0 ? stats.totalParticipants : '--'}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {(Object.keys(TAB_LABELS) as TabFilter[]).map((tab) => {
          const count = entries.filter((e) => matchesTab(e, tab)).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-user-primary text-user-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
              }`}
            >
              {TAB_LABELS[tab]}
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                activeTab === tab ? 'bg-user-primary/10 text-user-primary' : 'bg-background-subtle text-foreground-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Training List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <History className="h-10 w-10 text-foreground-subtle mb-3" />
            <p className="text-sm text-foreground-muted">No trainings found</p>
            <p className="text-xs text-foreground-subtle mt-1">
              {activeTab === 'all'
                ? 'Create broadcasts to start building your training history'
                : `No ${TAB_LABELS[activeTab].toLowerCase()} trainings`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <Link key={entry.id} href={entry.href}>
              <Card hover clickable className="mb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{entry.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
                      <span>{entry.provider}</span>
                      {entry.date && (
                        <span>
                          {formatDate(entry.date)}
                          {entry.endDate && <> &mdash; {formatDate(entry.endDate)}</>}
                        </span>
                      )}
                      {entry.participants && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {entry.participants} participants
                        </span>
                      )}
                      {entry.cost !== null && entry.cost > 0 && (
                        <span className="font-medium text-foreground">{formatCurrency(entry.cost)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.effectivenessScore !== null && (
                      <div className="text-right">
                        <div className="text-xs text-foreground-muted">Effectiveness</div>
                        <div className={`text-sm font-bold ${
                          entry.effectivenessScore >= 4 ? 'text-green-600' :
                          entry.effectivenessScore >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {renderStars(entry.effectivenessScore)}
                        </div>
                      </div>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Overall Effectiveness Summary (if data available) */}
      {effectiveness && (effectiveness.summary || effectiveness.overall_score) && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Effectiveness Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {effectiveness.overall_score != null && (
              <div>
                <p className="text-sm text-foreground-muted mb-1">Overall Score</p>
                <p className={`text-2xl font-bold ${
                  effectiveness.overall_score >= 4 ? 'text-green-600' :
                  effectiveness.overall_score >= 3 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {renderStars(effectiveness.overall_score)}
                </p>
              </div>
            )}
            {effectiveness.roi != null && (
              <div>
                <p className="text-sm text-foreground-muted mb-1">Return on Investment</p>
                <p className="text-2xl font-bold text-foreground">
                  {typeof effectiveness.roi === 'number' ? `${effectiveness.roi}%` : effectiveness.roi}
                </p>
              </div>
            )}
            {effectiveness.summary && (
              <div className="sm:col-span-3">
                <p className="text-sm text-foreground-muted mb-1">Summary</p>
                <p className="text-sm text-foreground">{effectiveness.summary}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
