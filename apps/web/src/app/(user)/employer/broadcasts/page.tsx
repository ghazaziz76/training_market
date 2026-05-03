'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Radio, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Spinner, EmptyState } from '@/components/ui';
import { formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const archiveBroadcast = async (e: React.MouseEvent, requestId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await api.put(`/broadcast-requests/${requestId}/close`, { reason: 'archived' });
    if (res.success) {
      setBroadcasts((prev) => prev.map((b) => b.request_id === requestId ? { ...b, status: 'closed' } : b));
      toast.success('Broadcast archived');
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  useEffect(() => {
    api.get('/broadcast-requests/my-requests').then((res) => {
      setBroadcasts((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Broadcast Requests</h1>
          <p className="text-sm text-foreground-muted">Post training needs and receive proposals from providers</p>
        </div>
        <Link href="/employer/broadcasts/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Request</Button>
        </Link>
      </div>

      {broadcasts.filter((b) => showArchived || b.status !== 'closed').length === 0 && !loading ? (
        <EmptyState
          icon={<Radio className="h-12 w-12" />}
          title="No broadcast requests yet"
          description="Create a broadcast to let training providers know what you need"
          action={
            <Link href="/employer/broadcasts/new">
              <Button>Create First Broadcast</Button>
            </Link>
          }
        />
      ) : (
        <>
          {broadcasts.some((b) => b.status === 'closed') && (
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-foreground-muted hover:text-foreground">
                {showArchived ? 'Hide archived' : `Show archived (${broadcasts.filter((b) => b.status === 'closed').length})`}
              </button>
            </div>
          )}
          <div className="space-y-4">
            {broadcasts.filter((b) => showArchived || b.status !== 'closed').map((b) => (
              <Link key={b.request_id} href={`/employer/broadcasts/${b.request_id}`}>
                <Card hover clickable className="mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{b.title}</h3>
                      <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{b.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-foreground-muted">
                        <span>Budget: {b.budget_range || 'Open'}</span>
                        <span>Participants: {b.participant_count || 'N/A'}</span>
                        <span>Posted: {formatDate(b.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                      {b.total_proposals > 0 && (
                        <span className="text-sm font-medium text-user-primary">{b.total_proposals} proposal{b.total_proposals !== 1 ? 's' : ''}</span>
                      )}
                      {b.status !== 'closed' && b.status !== 'awarded' && (
                        <button
                          onClick={(e) => archiveBroadcast(e, b.request_id)}
                          className="flex items-center gap-1 text-xs text-foreground-muted hover:text-red-500 mt-1"
                        >
                          <Archive className="h-3 w-3" /> Archive
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
