'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, MapPin, Users, DollarSign, Calendar, Building2, Clock, Briefcase, Monitor, CheckCircle } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';

export default function ProviderBroadcastsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/broadcast-requests/feed').then((res) => {
      setRequests((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <VendorHeader title="Broadcast Requests" />
      <div className="p-6">
        <p className="text-foreground-muted mb-6">Open training requests from employers — submit your proposals.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={<Radio className="h-12 w-12" />} title="No open requests" description="Check back later for new training requests from employers" />
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <Card key={r.request_id} hover>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
                    {r.employer && (
                      <p className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {r.employer.company_name || 'Employer'}
                        {r.employer.industry ? ` · ${r.employer.industry}` : ''}
                        {r.employer.company_size ? ` · ${r.employer.company_size} employees` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.my_proposal_submitted && <Badge color="green" size="sm"><CheckCircle className="h-3 w-3 mr-1 inline" />Submitted</Badge>}
                    <Badge color="blue">{r.status}</Badge>
                  </div>
                </div>

                <p className="text-sm text-foreground-muted mb-3">{r.description}</p>

                {r.target_audience && (
                  <p className="text-xs text-foreground-muted mb-3">
                    <strong>Target Audience:</strong> {r.target_audience}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs text-foreground-muted mb-4">
                  {r.training_type && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.training_type === 'in_house' ? 'In-House' : 'Public'}
                    </span>
                  )}
                  {r.participant_count && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Users className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.participant_count} pax
                    </span>
                  )}
                  {r.training_days && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.training_days} day(s)
                    </span>
                  )}
                  {r.preferred_mode && r.preferred_mode !== 'any' && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Monitor className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.preferred_mode}
                    </span>
                  )}
                  {r.preferred_location && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <MapPin className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.preferred_location}
                    </span>
                  )}
                  {r.budget_range && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.budget_range}
                    </span>
                  )}
                  {r.response_deadline && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Calendar className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.days_remaining > 0 ? `${r.days_remaining}d left` : 'Due'} · {formatDate(r.response_deadline)}
                    </span>
                  )}
                  {r.total_proposals > 0 && (
                    <span className="flex items-center gap-1.5 rounded bg-background-subtle px-2 py-1.5">
                      <Radio className="h-3.5 w-3.5 text-vendor-primary" />
                      {r.total_proposals} proposal{r.total_proposals !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {r.target_skills && r.target_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {r.target_skills.map((s: string) => <Badge key={s} color="violet" size="sm">{s}</Badge>)}
                  </div>
                )}

                <Link href={`/provider/broadcasts/${r.request_id}`}>
                  <Button size="sm" portal="vendor">
                    {r.my_proposal_submitted ? 'View Request' : 'View & Submit Proposal'}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
