'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle, XCircle, FileText, Download, DollarSign, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Textarea, Spinner, Avatar } from '@/components/ui';
import { formatDateTime, formatCurrency, formatDate, getStatusColor } from '@/lib/format';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchEnquiry = () => {
    api.get(`/enquiries/${id}`).then((res) => {
      setEnquiry(res.data || null);
      setLoading(false);
    });
  };

  useEffect(() => { fetchEnquiry(); }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    const res = await api.post(`/enquiries/${id}/replies`, { message: reply });
    setSending(false);
    if (res.success) {
      toast.success('Reply sent');
      setReply('');
      fetchEnquiry();
    } else {
      toast.error(res.message || 'Failed to send reply');
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!enquiry) return <div className="p-8 text-center text-foreground-muted">Enquiry not found</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/employer/enquiries" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Enquiries
      </Link>

      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">{enquiry.subject}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(enquiry.status)}`}>{enquiry.status}</span>
        </div>
        <div className="text-sm text-foreground-muted space-y-1">
          {enquiry.provider?.provider_name && <p>To: <span className="text-foreground">{enquiry.provider.provider_name}</span></p>}
          {enquiry.program?.title && <p>Program: <span className="text-foreground">{enquiry.program.title}</span></p>}
          <p>Type: <span className="text-foreground capitalize">{enquiry.enquiry_type}</span></p>
          <p>Sent: {formatDateTime(enquiry.created_at)}</p>
        </div>
        {enquiry.message && (
          <div className="mt-4 p-3 rounded-lg bg-background-subtle text-sm text-foreground">{enquiry.message}</div>
        )}
      </Card>

      {/* Replies Thread */}
      {enquiry.replies?.length > 0 && (
        <div className="space-y-4 mb-6">
          {enquiry.replies.map((r: any) => {
            const isMe = r.sender_id === user?.user_id;
            return (
              <div key={r.reply_id || r.created_at} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-4 ${isMe ? 'bg-user-primary/10 border border-user-primary/20' : 'bg-background-subtle border border-border'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={r.sender?.full_name || (isMe ? 'You' : 'Provider')} size="xs" />
                    <span className="text-xs font-medium text-foreground">{isMe ? 'You' : r.sender?.full_name || 'Provider'}</span>
                    <span className="text-xs text-foreground-muted">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proposals from TP */}
      {enquiry.proposals?.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Proposal from Provider</h2>
          {enquiry.proposals.map((p: any) => (
            <Card key={p.proposal_id} className="border-l-4 border-l-user-primary">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.provider?.provider_name || 'Provider'} src={p.provider?.logo_url} />
                  <div>
                    <h3 className="font-semibold text-foreground">{p.provider?.provider_name || 'Provider'}</h3>
                    {p.provider?.quality_tier && <Badge color="green" size="sm">{p.provider.quality_tier}</Badge>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
              </div>

              {/* Fee & Schedule */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {p.proposed_fee && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-muted">Fee:</span>
                    <strong>{formatCurrency(Number(p.proposed_fee))}</strong>
                  </div>
                )}
                {p.proposed_schedule && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-muted">Dates:</span>
                    <strong>{p.proposed_schedule}</strong>
                  </div>
                )}
                {p.proposed_duration && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-muted">Duration:</span>
                    <strong>{p.proposed_duration}</strong>
                  </div>
                )}
              </div>

              {/* Proposal message */}
              {p.proposal_message && (
                <p className="text-sm text-foreground whitespace-pre-line mb-3">{p.proposal_message}</p>
              )}

              {/* Trainer details */}
              {p.trainer_details && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-foreground-muted mb-1">Trainer Details</p>
                  <p className="text-sm text-foreground">{p.trainer_details}</p>
                </div>
              )}

              {/* Attachments */}
              {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-foreground-muted mb-2">Supporting Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {p.attachments.map((doc: any, i: number) => (
                      <a key={i} href={`${API_HOST}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground-muted hover:border-blue-300 hover:text-blue-600">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-[120px] truncate">{doc.file_name}</span>
                        <Download className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                {p.status === 'submitted' && (
                  <>
                    <Button size="sm" leftIcon={<CheckCircle className="h-3.5 w-3.5" />} onClick={async () => {
                      const res = await api.put(`/proposals/${p.proposal_id}/select`, {});
                      if (res.success) { toast.success('Proposal accepted!'); fetchEnquiry(); }
                      else toast.error(res.message || 'Failed');
                    }}>Accept Proposal</Button>
                    <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={async () => {
                      const res = await api.put(`/proposals/${p.proposal_id}/reject`, {});
                      if (res.success) { toast.success('Proposal rejected'); fetchEnquiry(); }
                      else toast.error(res.message || 'Failed');
                    }}>Reject</Button>
                  </>
                )}
                <Link href={`/employer/proposals/${p.proposal_id}`}>
                  <Button size="sm" variant="outline" leftIcon={<FileText className="h-3.5 w-3.5" />}>View Full Proposal</Button>
                </Link>
              </div>

              <p className="text-xs text-foreground-muted mt-2">Submitted: {formatDate(p.created_at)}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Form */}
      {enquiry.status !== 'closed' && (
        <Card>
          <form onSubmit={handleReply}>
            <Textarea
              placeholder="Write your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <Button type="submit" isLoading={sending} leftIcon={<Send className="h-4 w-4" />}>
                Send Reply
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
