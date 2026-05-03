'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Star, Download, FileText, ExternalLink, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Badge, Card, Spinner, Avatar, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_HOST = API_BASE.replace(/\/api$/, '');

export default function BroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [broadcast, setBroadcast] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    api.get(`/broadcast-requests/${id}`).then((res) => {
      if (res.success && res.data) {
        setBroadcast(res.data);
        setProposals((res.data as any).proposals || []);
      }
      setLoading(false);
    });
  }, [id]);

  const updateProposal = async (proposalId: string, status: string) => {
    const actionMap: Record<string, string> = { shortlisted: 'shortlist', selected: 'select', rejected: 'reject', dismissed: 'dismiss', cancelled: 'cancel' };
    const res = await api.put(`/proposals/${proposalId}/${actionMap[status] || 'reject'}`, {});
    if (res.success) {
      toast.success(`Proposal ${status}`);
      setProposals((prev) => prev.map((p) => (p.proposal_id === proposalId ? { ...p, status } : p)));
    } else {
      toast.error(res.message || 'Action failed');
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!broadcast) return <div className="flex min-h-[60vh] items-center justify-center"><p>Not found</p></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/employer/broadcasts" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Broadcasts
      </Link>

      {/* Request info */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-foreground">{broadcast.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(broadcast.status)}`}>{broadcast.status}</span>
        </div>
        <p className="mt-3 text-foreground-muted whitespace-pre-line">{broadcast.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-foreground-muted">
          {broadcast.participant_count && <span>Participants: {broadcast.participant_count}</span>}
          {broadcast.training_days && <span>Duration: {broadcast.training_days} day(s)</span>}
          {broadcast.training_type && <span>Type: {broadcast.training_type === 'in_house' ? 'In-House' : 'Public'}</span>}
          {broadcast.budget_range && <span>Budget: {broadcast.budget_range}</span>}
          {broadcast.preferred_mode && <span>Mode: {broadcast.preferred_mode}</span>}
          {broadcast.preferred_location && <span>Location: {broadcast.preferred_location}</span>}
          {broadcast.response_deadline && <span>Deadline: {formatDate(broadcast.response_deadline)}</span>}
        </div>
      </div>

      {/* Proposals */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Proposals ({proposals.filter((p) => p.status !== 'dismissed').length})</h2>
        {proposals.some((p) => p.status === 'dismissed') && (
          <button onClick={() => setShowDismissed(!showDismissed)} className="text-xs text-foreground-muted hover:text-foreground">
            {showDismissed ? 'Hide dismissed' : `Show dismissed (${proposals.filter((p) => p.status === 'dismissed').length})`}
          </button>
        )}
      </div>
      {proposals.length === 0 ? (
        <EmptyState title="No proposals yet" description="Training providers will submit proposals here" />
      ) : (
        <div className="space-y-4">
          {proposals.filter((p) => showDismissed || p.status !== 'dismissed').map((p) => {
            const attachments: any[] = Array.isArray(p.attachments) ? p.attachments : [];
            return (
              <Card key={p.proposal_id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.provider?.provider_name || 'P'} />
                    <div>
                      <h3 className="font-semibold text-foreground">{p.provider?.provider_name || 'Provider'}</h3>
                      {p.provider?.quality_tier && <Badge color="green" size="sm">{p.provider.quality_tier}</Badge>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-foreground-muted">Proposed Fee:</span>
                    <strong className="block text-base">{p.proposed_fee ? formatCurrency(p.proposed_fee) : 'N/A'}</strong>
                  </div>
                  <div><span className="text-foreground-muted">Proposed Dates:</span> <strong>{p.proposed_schedule || 'N/A'}</strong></div>
                  <div><span className="text-foreground-muted">Submitted:</span> <strong>{formatDate(p.created_at)}</strong></div>
                </div>

                {/* Supporting Documents */}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((doc: any, i: number) => (
                      <a
                        key={i}
                        href={`${API_HOST}${doc.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background-subtle px-2.5 py-1.5 text-xs text-foreground-muted transition-colors hover:border-blue-300 hover:text-blue-600"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-[140px] truncate">{doc.file_name}</span>
                        <Download className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {(p.status === 'submitted' || p.status === 'shortlisted') && (
                      <>
                        {p.status === 'submitted' && <Button size="sm" onClick={() => updateProposal(p.proposal_id, 'shortlisted')} leftIcon={<Star className="h-3.5 w-3.5" />}>Shortlist</Button>}
                        <Button size="sm" variant="outline" onClick={() => updateProposal(p.proposal_id, 'selected')} leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>Select</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateProposal(p.proposal_id, 'rejected')} leftIcon={<XCircle className="h-3.5 w-3.5" />}>Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateProposal(p.proposal_id, 'dismissed')} leftIcon={<Archive className="h-3.5 w-3.5" />}>Dismiss</Button>
                      </>
                    )}
                  </div>
                  <Link href={`/employer/proposals/${p.proposal_id}`}>
                    <Button size="sm" variant="outline" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                      View Full Proposal
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
