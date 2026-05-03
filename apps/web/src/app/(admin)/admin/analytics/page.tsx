'use client';

import { useEffect, useState } from 'react';
import { Search, MessageSquare, TrendingUp, DollarSign } from 'lucide-react';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { StatsCard, Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/admin/overview').then((res) => {
      setStats(res.data || {});
      setLoading(false);
    });
  }, []);

  if (loading) return <><AdminHeader title="Analytics" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  return (
    <>
      <AdminHeader title="Analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<Search className="h-5 w-5" />} label="Total Searches" value={stats?.total_searches ?? 0} />
          <StatsCard icon={<MessageSquare className="h-5 w-5" />} label="Total Enquiries" value={stats?.total_enquiries ?? 0} />
          <StatsCard icon={<TrendingUp className="h-5 w-5" />} label="Conversion Rate" value={stats?.conversion_rate ? `${stats.conversion_rate}%` : '0%'} />
          <StatsCard icon={<DollarSign className="h-5 w-5" />} label="Total Revenue" value={stats?.total_revenue ? `RM ${stats.total_revenue}` : 'RM 0'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">User Growth Over Time</h3>
            <div className="flex items-center justify-center h-48 bg-background-subtle rounded text-foreground-muted text-sm">
              Chart placeholder — user growth
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Program Views by Category</h3>
            <div className="flex items-center justify-center h-48 bg-background-subtle rounded text-foreground-muted text-sm">
              Chart placeholder — views by category
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Searched Terms</h3>
            {stats?.top_searches?.length > 0 ? (
              <div className="space-y-2">
                {stats.top_searches.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{s.term}</span>
                    <span className="text-foreground-muted">{s.count} searches</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No data yet</p>
            )}
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Providers</h3>
            {stats?.top_providers?.length > 0 ? (
              <div className="space-y-2">
                {stats.top_providers.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.name}</span>
                    <span className="text-foreground-muted">{p.enquiries} enquiries</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No data yet</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
