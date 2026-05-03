'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Clock, CheckCircle, Star, XCircle, Archive, DollarSign, Calendar, Users } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Card, Button, Spinner, EmptyState, Badge } from '@/components/ui';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

const statusInfo: Record<string, { icon: React.ReactNode; text: string }> = {
  submitted: { icon: <Clock className="h-4 w-4 text-blue-500" />, text: 'Waiting for employer response' },
  shortlisted: { icon: <Star className="h-4 w-4 text-purple-500" />, text: 'Employer has shortlisted your proposal' },
  selected: { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'You won! Employer selected your proposal' },
  rejected: { icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Employer did not select this proposal' },
  dismissed: { icon: <Archive className="h-4 w-4 text-gray-500" />, text: 'Employer archived this proposal' },
  withdrawn: { icon: <Archive className="h-4 w-4 text-gray-500" />, text: 'You withdrew this proposal' },
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/proposals/my-proposals').then((res: any) => {
      setProposals(res.data || []);
      setStats(res.stats || null);
      setLoading(false);
    });
  }, []);

  const filtered = filter ? proposals.filter((p) => p.status === filter) : proposals;

  return (
    <>
      <VendorHeader title="My Proposals" />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : proposals.length === 0 ? (
          <EmptyState icon={<FileText className="h-12 w-12" />} title="No proposals yet" description="Browse open broadcast requests and submit proposals to employers" />
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <button onClick={() => setFilter('')} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${!filter ? 'border-vendor-primary bg-vendor-primary/5' : 'border-border'}`}>
                  <p className="text-xl font-bold text-foreground">{stats.total_submitted}</p>
                  <p className="text-xs text-foreground-muted">Total</p>
                </button>
                <button onClick={() => setFilter('submitted')} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${filter === 'submitted' ? 'border-blue-500 bg-blue-50' : 'border-border'}`}>
                  <p className="text-xl font-bold text-blue-600">{stats.submitted || 0}</p>
                  <p className="text-xs text-blue-600">Pending</p>
                </button>
                <button onClick={() => setFilter('shortlisted')} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${filter === 'shortlisted' ? 'border-purple-500 bg-purple-50' : 'border-border'}`}>
                  <p className="text-xl font-bold text-purple-600">{stats.shortlisted || 0}</p>
                  <p className="text-xs text-purple-600">Shortlisted</p>
                </button>
                <button onClick={() => setFilter('selected')} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${filter === 'selected' ? 'border-green-500 bg-green-50' : 'border-border'}`}>
                  <p className="text-xl font-bold text-green-600">{stats.selected || 0}</p>
                  <p className="text-xs text-green-600">Won</p>
                </button>
                <button onClick={() => setFilter('rejected')} className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${filter === 'rejected' ? 'border-red-500 bg-red-50' : 'border-border'}`}>
                  <p className="text-xl font-bold text-red-600">{stats.rejected || 0}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </button>
              </div>
            )}

            {/* Win rate */}
            {stats && stats.win_rate > 0 && (
              <p className="text-sm text-foreground-muted mb-4">Win rate: <strong className="text-vendor-primary">{stats.win_rate}%</strong></p>
            )}

            {/* Proposals */}
            <div className="space-y-4">
              {filtered.map((p) => {
                const info = statusInfo[p.status] || statusInfo.submitted;
                const isBroadcast = !!p.request_id;
                const isEnquiry = !!p.enquiry_id;
                const title = isBroadcast ? (p.request?.title || 'Broadcast Request') : (p.enquiry?.subject || 'Enquiry Proposal');
                const subtitle = isBroadcast ? p.request?.employer?.company_name : p.enquiry?.requester?.full_name;
                return (
                  <Card key={p.proposal_id} hover>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isBroadcast ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                            {isBroadcast ? 'Broadcast' : 'Enquiry'}
                          </span>
                        </div>
                        {subtitle && <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-foreground-muted mb-3">
                      {p.proposed_fee && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(Number(p.proposed_fee))}
                        </span>
                      )}
                      {isBroadcast && p.request?.participant_count && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {p.request.participant_count} pax
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatRelativeTime(p.created_at)}
                      </span>
                    </div>

                    {/* Status info */}
                    <div className="flex items-center gap-2 text-sm mb-3">
                      {info.icon}
                      <span className="text-foreground-muted">{info.text}</span>
                    </div>

                    <div className="flex justify-end">
                      {isBroadcast && p.request?.request_id && (
                        <Link href={`/provider/broadcasts/${p.request.request_id}`}>
                          <Button size="sm" variant="outline" portal="vendor" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                            View Broadcast
                          </Button>
                        </Link>
                      )}
                      {isEnquiry && (
                        <Link href="/provider/enquiries">
                          <Button size="sm" variant="outline" portal="vendor" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                            View Enquiry
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-foreground-muted text-center py-8">No proposals with this status</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
