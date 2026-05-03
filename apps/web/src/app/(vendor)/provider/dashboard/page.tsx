'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, MessageSquare, FileText, Eye, ArrowRight, Trophy, Clock, CheckCircle, XCircle, Star } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { StatsCard, Card, Badge, Spinner } from '@/components/ui';
import { formatRelativeTime, formatCurrency, formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

export default function ProviderDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/provider/overview').then((res) => {
      setStats(res.data || {});
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <VendorHeader title="Dashboard" />
        <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>
      </>
    );
  }

  return (
    <>
      <VendorHeader title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<BookOpen className="h-5 w-5" />} label="Total Programs" value={stats?.total_programs ?? 0} />
          <StatsCard icon={<MessageSquare className="h-5 w-5" />} label="Total Enquiries" value={stats?.total_enquiries ?? 0} />
          <StatsCard icon={<FileText className="h-5 w-5" />} label="Proposals Sent" value={stats?.proposal_stats?.total ?? stats?.total_proposals ?? 0} />
          <StatsCard
            icon={<Trophy className="h-5 w-5" />}
            label="Win Rate"
            value={`${stats?.proposal_stats?.win_rate ?? 0}%`}
            change={stats?.proposal_stats?.selected ? `${stats.proposal_stats.selected} won` : undefined}
            changeType="positive"
          />
        </div>

        {/* Proposal Pipeline */}
        {stats?.proposal_stats?.total > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Proposal Pipeline</h2>
              <Link href="/provider/proposals" className="text-sm text-vendor-primary hover:text-vendor-primary-dark flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-blue-700">{stats.proposal_stats.submitted}</p>
                <p className="text-xs text-blue-600 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Pending</p>
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-purple-700">{stats.proposal_stats.shortlisted}</p>
                <p className="text-xs text-purple-600 flex items-center justify-center gap-1"><Star className="h-3 w-3" /> Shortlisted</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-green-700">{stats.proposal_stats.selected}</p>
                <p className="text-xs text-green-600 flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" /> Won</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-red-700">{stats.proposal_stats.rejected}</p>
                <p className="text-xs text-red-600 flex items-center justify-center gap-1"><XCircle className="h-3 w-3" /> Rejected</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-gray-700">{stats.proposal_stats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Proposals */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">My Proposals</h2>
            <Link href="/provider/proposals" className="text-sm text-vendor-primary hover:text-vendor-primary-dark flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats?.recent_proposals?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_proposals.slice(0, 5).map((p: any) => (
                <Link key={p.proposal_id} href={`/provider/broadcasts/${p.request?.request_id}`}>
                  <div className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 hover:bg-background-subtle rounded px-2 py-1.5 -mx-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{p.request?.title || 'Request'}</p>
                      <p className="text-xs text-foreground-muted">
                        {p.proposed_fee ? formatCurrency(Number(p.proposed_fee)) : ''} · {p.proposed_schedule || ''} · {formatRelativeTime(p.created_at)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">No proposals submitted yet. Browse open broadcast requests to get started.</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Enquiries */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Enquiries</h2>
              <Link href="/provider/enquiries" className="text-sm text-vendor-primary hover:text-vendor-primary-dark flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {stats?.recent_enquiries?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_enquiries.slice(0, 5).map((e: any) => (
                  <div key={e.enquiry_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{e.program?.title || 'General'}</p>
                      <p className="text-xs text-foreground-muted">{formatRelativeTime(e.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>{e.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No enquiries yet</p>
            )}
          </Card>

          {/* Recent Broadcast Requests */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Open Broadcast Requests</h2>
              <Link href="/provider/broadcasts" className="text-sm text-vendor-primary hover:text-vendor-primary-dark flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {stats?.recent_broadcasts?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_broadcasts.slice(0, 5).map((b: any) => (
                  <div key={b.request_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{b.title}</p>
                      <p className="text-xs text-foreground-muted">{b.budget_range || 'Open budget'}</p>
                    </div>
                    <Badge color="blue" size="sm">{b.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No open requests</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
