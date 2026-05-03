'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, BookOpen, Clock, DollarSign } from 'lucide-react';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { StatsCard, Card, Badge, Button, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => {
      setStats(res.data || {});
      setLoading(false);
    });
  }, []);

  const quickAction = async (programId: string, action: 'approve' | 'reject') => {
    const res = await api.put(`/admin/programs/${programId}/${action}`, action === 'reject' ? { reason: 'Does not meet requirements' } : undefined);
    if (res.success) {
      toast.success(`Program ${action}d`);
      setStats((s: any) => ({
        ...s,
        pending_programs: s.pending_programs?.filter((p: any) => p.program_id !== programId),
      }));
    }
  };

  if (loading) return <><AdminHeader title="Dashboard" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  return (
    <>
      <AdminHeader title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats?.total_users ?? 0} />
          <StatsCard icon={<Building2 className="h-5 w-5" />} label="Active Providers" value={stats?.active_providers ?? 0} />
          <StatsCard icon={<BookOpen className="h-5 w-5" />} label="Published Programs" value={stats?.published_programs ?? 0} />
          <StatsCard icon={<Clock className="h-5 w-5" />} label="Pending Reviews" value={stats?.pending_reviews ?? 0} changeType={stats?.pending_reviews > 0 ? 'negative' : 'neutral'} />
          <StatsCard icon={<DollarSign className="h-5 w-5" />} label="Revenue (Month)" value={stats?.revenue_this_month ? `RM ${stats.revenue_this_month}` : 'RM 0'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations */}
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Registrations</h2>
            {stats?.recent_users?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_users.slice(0, 10).map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{u.full_name}</p>
                      <p className="text-xs text-foreground-muted">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge color={u.role === 'provider' ? 'violet' : u.role === 'employer' ? 'blue' : 'gray'} size="sm">{u.role}</Badge>
                      <p className="text-xs text-foreground-muted mt-1">{formatDate(u.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No recent registrations</p>
            )}
          </Card>

          {/* Pending Programs */}
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">Programs Pending Review</h2>
            {stats?.pending_programs?.length > 0 ? (
              <div className="space-y-3">
                {stats.pending_programs.slice(0, 5).map((p: any) => (
                  <div key={p.program_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-foreground-muted">{p.provider?.provider_name}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" portal="admin" onClick={() => quickAction(p.program_id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => quickAction(p.program_id, 'reject')}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No pending programs</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
