'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, MessageSquare, DollarSign, Bell, ArrowRight, FileText } from 'lucide-react';
import { StatsCard, Card, Badge, Spinner } from '@/components/ui';
import { formatDate, formatCurrency, getStatusColor, formatRelativeTime } from '@/lib/format';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notifications';

export default function EmployerDashboardPage() {
  const { markAsRead: storeMarkAsRead, markAllRead: storeMarkAllRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [levy, setLevy] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ enquiries: 0, broadcasts: 0, proposals: 0, unread: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/enquiries/sent?limit=5'),
      api.get('/broadcast-requests/my-requests?limit=5'),
      api.get('/employer/levy-status'),
      api.get('/employer/training-plans'),
      api.get('/notifications?limit=10'),
    ]).then(([enq, brd, lev, pln, notif]) => {
      const enqData = (enq.data as any) || [];
      const brdData = (brd.data as any) || [];
      const notifData = (notif.data as any) || [];
      setEnquiries(enqData);
      setBroadcasts(brdData);
      setLevy(lev.data || null);
      setPlans((pln.data as any) || []);
      setNotifications(notifData);
      const unreadNotifs = notifData.filter((n: any) => !n.is_read);
      setStats({
        enquiries: enqData.length,
        broadcasts: brdData.length,
        proposals: brdData.reduce((sum: number, b: any) => sum + (b.total_proposals || 0), 0),
        unread: unreadNotifs.length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-foreground-muted mt-1">Monitor your training activities and manage requests</p>
        </div>
        <Link href="/employer/grant-calculator" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hrd-grant-calculator.png" alt="HRD Grant Eligibility Calculator" className="h-16 w-auto" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon={<MessageSquare className="h-5 w-5" />} label="Enquiries Sent" value={stats.enquiries} />
        <StatsCard icon={<Radio className="h-5 w-5" />} label="Active Broadcasts" value={stats.broadcasts} />
        <StatsCard icon={<FileText className="h-5 w-5" />} label="Proposals Received" value={stats.proposals} />
        <StatsCard
          icon={<Bell className="h-5 w-5" />}
          label="Unread Notifications"
          value={stats.unread}
          change={stats.unread > 0 ? 'Action needed' : 'All caught up'}
          changeType={stats.unread > 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Recent Activity — unread notifications */}
      {notifications.filter((n: any) => !n.is_read).length > 0 && (
        <Card className="mb-8 border-l-4 border-l-user-primary">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await storeMarkAllRead();
                  setNotifications((prev) => prev.map((n: any) => ({ ...n, is_read: true })));
                  setStats((s) => ({ ...s, unread: 0 }));
                }}
                className="text-xs text-foreground-muted hover:text-user-primary"
              >
                Mark all as read
              </button>
              <Link href="/employer/notifications" className="text-sm text-user-primary hover:text-user-primary-dark flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {notifications.filter((n: any) => !n.is_read).slice(0, 5).map((n: any) => (
              <Link
                key={n.notification_id}
                href={n.action_url || '/employer/notifications'}
                onClick={() => {
                  storeMarkAsRead(n.notification_id);
                  setNotifications((prev) => prev.map((item: any) => item.notification_id === n.notification_id ? { ...item, is_read: true } : item));
                  setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
                }}
              >
                <div className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0 hover:bg-background-subtle rounded px-2 py-1.5 -mx-2">
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-user-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-foreground-muted">{n.message}</p>
                    <p className="text-xs text-foreground-subtle mt-0.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Enquiries */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Enquiries</h2>
            <Link href="/employer/enquiries" className="text-sm text-user-primary hover:text-user-primary-dark flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {enquiries.length > 0 ? (
            <div className="space-y-3">
              {enquiries.slice(0, 5).map((e: any) => (
                <Link key={e.enquiry_id} href={`/employer/enquiries/${e.enquiry_id}`}>
                  <div className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 hover:bg-background-subtle rounded px-2 py-1 -mx-2">
                    <div>
                      <p className="font-medium text-foreground">{e.subject}</p>
                      <p className="text-xs text-foreground-muted">{e.provider?.provider_name || 'Provider'} · {formatRelativeTime(e.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>{e.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">No enquiries sent yet</p>
          )}
        </Card>

        {/* Recent Broadcasts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">My Broadcasts</h2>
            <Link href="/employer/broadcasts" className="text-sm text-user-primary hover:text-user-primary-dark flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {broadcasts.length > 0 ? (
            <div className="space-y-3">
              {broadcasts.slice(0, 5).map((b: any) => (
                <Link key={b.request_id} href={`/employer/broadcasts/${b.request_id}`}>
                  <div className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 hover:bg-background-subtle rounded px-2 py-1 -mx-2">
                    <div>
                      <p className="font-medium text-foreground">{b.title}</p>
                      <p className="text-xs text-foreground-muted">{b.budget_range || 'Open budget'} · {b.total_proposals || 0} proposals</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(b.status)}`}>{b.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">No broadcasts yet</p>
          )}
        </Card>
      </div>

      {/* HRD Grant Calculator Card */}
      <div className="mb-8">
        <Link href="/employer/grant-calculator">
          <Card className="border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hrd-grant-calculator.png" alt="HRD Grant Calculator" className="h-14 w-auto flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">HRD Grant Calculator</h2>
                <p className="text-sm text-foreground-muted">
                  Calculate your maximum HRD Corp claimable amounts based on the Allowable Cost Matrix (ACM)
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600" />
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Levy Status */}
        {levy && (
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">HRD Corp Levy Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Total Levy ({levy.year})</span>
                <span className="font-medium text-foreground">{formatCurrency(levy.total_levy)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Utilized</span>
                <span className="font-medium text-foreground">{formatCurrency(levy.utilized_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Remaining</span>
                <span className="font-medium text-green-600">{formatCurrency(levy.remaining_amount)}</span>
              </div>
              <div className="w-full bg-background-subtle rounded-full h-2.5 mt-2">
                <div
                  className="bg-user-primary h-2.5 rounded-full"
                  style={{ width: `${Math.min(levy.utilization_percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-foreground-muted">{levy.months_remaining} months remaining · Target: {formatCurrency(levy.monthly_target)}/month</p>
            </div>
          </Card>
        )}

        {/* Selected Training Programs */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Training Plan {new Date().getFullYear()}</h2>
          </div>
          {plans.length > 0 && (() => {
            const currentPlan = plans.find((p: any) => p.year === new Date().getFullYear());
            if (!currentPlan) return <p className="text-sm text-foreground-muted">No programs selected yet for {new Date().getFullYear()}. Select a proposal from your broadcasts to get started.</p>;
            const items = Array.isArray((currentPlan as any).planned_items) ? (currentPlan as any).planned_items : [];
            if (items.length === 0) return <p className="text-sm text-foreground-muted">No programs selected yet. Select a proposal from your broadcasts to add it here.</p>;
            return (
              <>
                <div className="space-y-3">
                  {items.slice(0, 5).map((item: any, i: number) => (
                    <div key={item.proposal_id || i} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{item.request_title}</p>
                        <p className="text-xs text-foreground-muted">{item.provider_name} · {item.proposed_schedule || item.proposed_duration || 'TBD'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-xs font-medium text-foreground">{item.proposed_fee ? formatCurrency(item.proposed_fee) : '—'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status || 'upcoming')}`}>{item.status || 'upcoming'}</span>
                        {(item.status === 'upcoming' || !item.status) && item.proposal_id && (
                          <button
                            onClick={async () => {
                              if (!confirm('Cancel this training? The levy will be refunded and the broadcast reopened.')) return;
                              const res = await api.put(`/proposals/${item.proposal_id}/cancel`, {});
                              if (res.success) {
                                toast.success('Training cancelled');
                                window.location.reload();
                              } else {
                                toast.error((res as any).message || 'Failed to cancel');
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                    <span className="text-foreground-muted">{items.length} program{items.length !== 1 ? 's' : ''} selected</span>
                    <span className="font-medium text-foreground">Total: {formatCurrency(items.reduce((sum: number, i: any) => sum + (i.proposed_fee || 0), 0))}</span>
                  </div>
                )}
              </>
            );
          })()}
          {plans.length === 0 && (
            <p className="text-sm text-foreground-muted">No programs selected yet. Select a proposal from your broadcasts to get started.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
