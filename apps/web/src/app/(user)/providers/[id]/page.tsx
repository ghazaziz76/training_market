'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, MapPin, Globe, Award, Shield } from 'lucide-react';
import { Card, Badge, Spinner, Avatar } from '@/components/ui';
import { ProgramCard } from '@/components/storefront/ProgramCard';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';

export default function ProviderPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/storefront/providers/${id}`),
      api.get(`/search/programs?provider_id=${id}&limit=50`),
    ]).then(([prov, prog]) => {
      setProvider(prov.data || null);
      setPrograms((prog.data as any) || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!provider) return <div className="flex min-h-[60vh] items-center justify-center"><p>Provider not found</p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </Link>

      {/* Provider Header */}
      <Card className="mb-8">
        <div className="flex items-start gap-5">
          <Avatar name={provider.provider_name} src={provider.logo_url} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{provider.provider_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {provider.quality_tier && provider.quality_tier !== 'unverified' && (
                <Badge color={provider.quality_tier === 'premium' ? 'amber' : 'green'}>{provider.quality_tier}</Badge>
              )}
              {provider.average_rating > 0 && (
                <span className="flex items-center gap-1 text-sm text-foreground-muted">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {Number(provider.average_rating).toFixed(1)}
                </span>
              )}
              {provider.hrd_corp_registered_provider && (
                <span className="flex items-center gap-1 text-xs text-green-600"><Shield className="h-3.5 w-3.5" /> HRD Corp Registered</span>
              )}
            </div>
            {provider.business_description && (
              <p className="text-sm text-foreground-muted mt-3 whitespace-pre-line">{provider.business_description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-foreground-muted">
              {provider.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[provider.city, provider.state].filter(Boolean).join(', ')}</span>}
              {provider.website && <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-user-primary"><Globe className="h-3.5 w-3.5" /> Website</a>}
              {provider.year_established && <span>Est. {provider.year_established}</span>}
              {provider.total_completed_programs > 0 && <span>{provider.total_completed_programs} programs completed</span>}
            </div>
            {provider.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {provider.specializations.map((s: string) => (
                  <Badge key={s} color="violet" size="sm">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Programs */}
      <h2 className="text-xl font-bold text-foreground mb-4">Programs ({programs.length})</h2>
      {programs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p: any) => (
            <ProgramCard key={p.program_id} program={p} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">No published programs yet.</p>
      )}
    </div>
  );
}
