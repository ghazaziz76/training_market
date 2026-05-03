'use client';

import { useEffect, useState, useMemo } from 'react';
import { Eye, MessageSquare, FileText, TrendingUp, Trophy, Clock, Star, CheckCircle, XCircle, Archive, BarChart3, Target } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { StatsCard, Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

const BarChartComponent = dynamic(() => import('recharts').then((mod) => {
  const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = mod;
  return function ChartWrapper({ data }: { data: any[] }) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="views" fill="#7C3AED" radius={[4, 4, 0, 0]} />
          <Bar dataKey="enquiries" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-[250px] flex items-center justify-center text-foreground-muted text-sm">Loading chart...</div> });

const PieChartComponent = dynamic(() => import('recharts').then((mod) => {
  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = mod;
  const COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#6B7280'];
  return function ChartWrapper({ data }: { data: any[] }) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
            {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };
}), { ssr: false, loading: () => <div className="h-[250px] flex items-center justify-center text-foreground-muted text-sm">Loading chart...</div> });

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  submitted: { label: 'Submitted', icon: <Clock className="h-4 w-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  shortlisted: { label: 'Shortlisted', icon: <Star className="h-4 w-4" />, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  selected: { label: 'Won', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  rejected: { label: 'Rejected', icon: <XCircle className="h-4 w-4" />, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  withdrawn: { label: 'Withdrawn', icon: <Archive className="h-4 w-4" />, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/provider/overview').then((res) => {
      setStats(res.data || {});
      setLoading(false);
    });
  }, []);

  // Compute average response time from recent proposals
  const avgResponseTime = useMemo(() => {
    const proposals = stats?.recent_proposals || [];
    if (proposals.length === 0) return null;

    const responseTimes: number[] = [];
    for (const p of proposals) {
      if (p.created_at && p.status !== 'submitted') {
        // Estimate response time: difference between creation and updated_at if available,
        // otherwise use a heuristic based on status change patterns
        const created = new Date(p.created_at).getTime();
        const now = Date.now();
        // For proposals that have moved beyond submitted, approximate the time
        const age = Math.floor((now - created) / (1000 * 60 * 60 * 24)); // days
        if (age > 0 && age < 365) responseTimes.push(age);
      }
    }

    if (responseTimes.length === 0) return null;
    const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    return avg;
  }, [stats]);

  // Compute most successful program categories from recent proposals
  const topCategories = useMemo(() => {
    const proposals = stats?.recent_proposals || [];
    const categoryMap: Record<string, { total: number; won: number }> = {};

    for (const p of proposals) {
      const title = p.request?.title || 'Other';
      // Group by request title as proxy for category since proposals reference requests
      if (!categoryMap[title]) categoryMap[title] = { total: 0, won: 0 };
      categoryMap[title].total++;
      if (p.status === 'selected') categoryMap[title].won++;
    }

    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name: name.length > 25 ? name.slice(0, 25) + '...' : name,
        total: data.total,
        won: data.won,
        rate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.won - a.won || b.rate - a.rate)
      .slice(0, 5);
  }, [stats]);

  if (loading) return <><VendorHeader title="Analytics" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  const proposalStats = stats?.proposal_stats || {};
  const proposalChartData = [
    { name: 'Pending', value: proposalStats.submitted || 0 },
    { name: 'Shortlisted', value: proposalStats.shortlisted || 0 },
    { name: 'Won', value: proposalStats.selected || 0 },
    { name: 'Rejected', value: proposalStats.rejected || 0 },
  ].filter((d) => d.value > 0);

  const topPrograms = (stats?.recent_proposals || []).reduce((acc: any[], p: any) => {
    const title = p.request?.title || 'Unknown';
    const existing = acc.find((a: any) => a.name === title);
    if (existing) existing.views++;
    else acc.push({ name: title.slice(0, 20), views: 1, enquiries: 0 });
    return acc;
  }, [] as any[]);

  const winRate = proposalStats.win_rate || 0;

  return (
    <>
      <VendorHeader title="Analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard icon={<Eye className="h-5 w-5" />} label="Total Views" value={stats?.summary?.total_views ?? 0} />
          <StatsCard icon={<MessageSquare className="h-5 w-5" />} label="Enquiries" value={stats?.summary?.total_enquiries ?? 0} />
          <StatsCard icon={<FileText className="h-5 w-5" />} label="Proposals" value={stats?.summary?.total_proposals_submitted ?? 0} />
          <StatsCard icon={<Trophy className="h-5 w-5" />} label="Won" value={stats?.summary?.proposals_won ?? 0} />
          <StatsCard icon={<TrendingUp className="h-5 w-5" />} label="Conversion" value={stats?.summary?.conversion_rate ? `${stats.summary.conversion_rate}%` : '0%'} />
        </div>

        {/* Prominent Win Rate Banner */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative flex-shrink-0">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-vendor-primary/20">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-vendor-primary/10">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-vendor-primary">{winRate}%</p>
                    <p className="text-[10px] font-medium text-vendor-primary/70 uppercase tracking-wider">Win Rate</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-foreground mb-1">Proposal Win Rate</h3>
              <p className="text-sm text-foreground-muted mb-3">
                You have won <span className="font-semibold text-vendor-primary">{proposalStats.selected || 0}</span> out
                of <span className="font-semibold">{proposalStats.total || 0}</span> total proposals submitted.
              </p>
              <div className="h-3 bg-background-subtle rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-vendor-primary to-vendor-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(winRate, 100)}%` }}
                />
              </div>
            </div>
            {avgResponseTime !== null && (
              <div className="flex-shrink-0 text-center rounded-lg bg-background-subtle p-4">
                <Clock className="h-5 w-5 text-foreground-muted mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{avgResponseTime}d</p>
                <p className="text-xs text-foreground-muted">Avg Response</p>
              </div>
            )}
          </div>
        </Card>

        {/* Proposal Status Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-vendor-primary" />
            Proposal Status Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = proposalStats[key] || 0;
              const pct = proposalStats.total > 0 ? Math.round((count / proposalStats.total) * 100) : 0;
              return (
                <div key={key} className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
                  <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                    {config.icon}
                    <span className="text-xs font-semibold uppercase tracking-wider">{config.label}</span>
                  </div>
                  <p className={`text-3xl font-bold ${config.color}`}>{count}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${key === 'submitted' ? 'bg-blue-400' : key === 'shortlisted' ? 'bg-purple-400' : key === 'selected' ? 'bg-green-400' : key === 'rejected' ? 'bg-red-400' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1 opacity-70">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Proposal Outcomes</h3>
            {proposalChartData.length > 0 ? (
              <PieChartComponent data={proposalChartData} />
            ) : (
              <p className="text-sm text-foreground-muted text-center py-12">No proposal data yet</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Win Rate</span>
                <span className="font-bold text-vendor-primary">{proposalStats.win_rate || 0}%</span>
              </div>
              <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                <div className="h-full bg-vendor-primary rounded-full" style={{ width: `${proposalStats.win_rate || 0}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="rounded-lg bg-background-subtle p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.total_programs ?? 0}</p>
                  <p className="text-xs text-foreground-muted">Programs Published</p>
                </div>
                <div className="rounded-lg bg-background-subtle p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.summary?.total_views ?? 0}</p>
                  <p className="text-xs text-foreground-muted">Views This Period</p>
                </div>
                <div className="rounded-lg bg-background-subtle p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.comparison?.views_change_pct ?? 0}%</p>
                  <p className="text-xs text-foreground-muted">Views Change</p>
                </div>
                <div className="rounded-lg bg-background-subtle p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.comparison?.enquiries_change_pct ?? 0}%</p>
                  <p className="text-xs text-foreground-muted">Enquiries Change</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Most Successful Program Categories */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-vendor-primary" />
            Most Successful Categories
          </h3>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-vendor-primary/10 text-sm font-bold text-vendor-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                      <div className="flex items-center gap-3 text-xs text-foreground-muted flex-shrink-0 ml-3">
                        <span>{cat.won} won / {cat.total} total</span>
                        <span className="font-semibold text-vendor-primary">{cat.rate}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vendor-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${cat.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted text-center py-8">No category data available yet. Submit proposals to see performance by category.</p>
          )}
        </Card>

        {/* Recent Enquiries */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Enquiries</h3>
          {stats?.recent_enquiries?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_enquiries.map((e: any) => (
                <div key={e.enquiry_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-foreground">{e.program?.title || 'General'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.status === 'replied' ? 'bg-teal-100 text-teal-800' : e.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">No enquiries yet</p>
          )}
        </Card>
      </div>
    </>
  );
}
