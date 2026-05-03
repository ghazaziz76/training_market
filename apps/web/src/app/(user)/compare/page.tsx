'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, CheckCircle, XCircle } from 'lucide-react';
import { Card, Spinner, Badge, Avatar } from '@/components/ui';
import { formatCurrency, formatDeliveryMode } from '@/lib/format';
import { api } from '@/lib/api';

export default function ComparePage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    Promise.all(ids.map((id) => api.get(`/programs/${id}`))).then((results) => {
      setPrograms(results.filter((r) => r.success).map((r) => r.data));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (programs.length === 0) return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <p className="text-foreground-muted">No programs to compare. Go back to search and add programs to compare.</p>
      <Link href="/search" className="text-user-primary mt-4 inline-block">Back to Search</Link>
    </div>
  );

  const rows: { label: string; getValue: (p: any) => React.ReactNode }[] = [
    { label: 'Provider', getValue: (p) => (
      <div className="flex items-center gap-2">
        <Avatar name={p.provider?.provider_name || 'P'} src={p.provider?.logo_url} size="sm" />
        <div>
          <span className="text-sm font-medium text-foreground">{p.provider?.provider_name}</span>
          {p.provider?.quality_tier && p.provider.quality_tier !== 'unverified' && (
            <Badge color="green" size="sm" className="ml-1">{p.provider.quality_tier}</Badge>
          )}
        </div>
      </div>
    )},
    { label: 'Category', getValue: (p) => p.category?.name || '-' },
    { label: 'Fee (Public)', getValue: (p) => p.fee_per_pax ? formatCurrency(Number(p.fee_per_pax)) + '/pax' : '-' },
    { label: 'Fee (In-House)', getValue: (p) => p.fee_per_group ? formatCurrency(Number(p.fee_per_group)) + '/day' : '-' },
    { label: 'Duration', getValue: (p) => p.duration_days ? `${p.duration_days} day(s)` : p.duration_hours ? `${p.duration_hours}h` : '-' },
    { label: 'Delivery', getValue: (p) => formatDeliveryMode(p.delivery_mode) },
    { label: 'Max Participants', getValue: (p) => p.max_participants || 'Open' },
    { label: 'Location', getValue: (p) => [p.city, p.state].filter(Boolean).join(', ') || '-' },
    { label: 'Language', getValue: (p) => p.language || 'English' },
    { label: 'HRD Corp', getValue: (p) => p.hrd_corp_claimable ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" /> },
    { label: 'Certification', getValue: (p) => p.is_certification && p.certification_body ? <span className="text-amber-600">{p.certification_body}</span> : <XCircle className="h-4 w-4 text-gray-300" /> },
    { label: 'Rating', getValue: (p) => p.provider?.average_rating ? (
      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(p.provider.average_rating).toFixed(1)}</span>
    ) : '-' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-6">Compare Programs ({programs.length})</h1>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-foreground-muted p-3 w-40">Feature</th>
              {programs.map((p) => (
                <th key={p.program_id} className="text-left p-3">
                  <Link href={`/programs/${p.program_id}`} className="text-sm font-semibold text-foreground hover:text-user-primary">
                    {p.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-background-subtle' : ''}>
                <td className="text-xs font-medium text-foreground-muted p-3">{row.label}</td>
                {programs.map((p) => (
                  <td key={p.program_id} className="text-sm text-foreground p-3">{row.getValue(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
