'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card, Spinner, EmptyState } from '@/components/ui';
import { formatRelativeTime, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

export default function EmployerEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/enquiries/sent').then((res) => {
      setEnquiries((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Enquiries</h1>
        <p className="text-sm text-foreground-muted">Enquiries you've sent to training providers</p>
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No enquiries yet"
          description="Browse training programs and send enquiries to providers"
        />
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <Link key={e.enquiry_id} href={`/employer/enquiries/${e.enquiry_id}`}>
              <Card hover clickable className="mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{e.subject}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-foreground-muted">
                      <span>{e.provider?.provider_name || 'Provider'}</span>
                      {e.program?.title && <span>· {e.program.title}</span>}
                      <span>· {formatRelativeTime(e.created_at)}</span>
                    </div>
                    {e.reply_count > 0 && (
                      <p className="text-xs text-user-primary mt-1">{e.reply_count} {e.reply_count === 1 ? 'reply' : 'replies'}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>
                    {e.status}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
