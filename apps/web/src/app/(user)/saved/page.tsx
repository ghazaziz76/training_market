'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Spinner, EmptyState } from '@/components/ui';
import { ProgramCard } from '@/components/storefront/ProgramCard';
import { api } from '@/lib/api';

export default function SavedProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/saved-programs').then((res) => {
      setPrograms((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Saved Programs</h1>
      <p className="text-sm text-foreground-muted mb-6">Programs you've saved for later</p>

      {programs.length === 0 ? (
        <EmptyState icon={<Heart className="h-12 w-12" />} title="No saved programs" description="Browse programs and click the heart icon to save them here" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {programs.map((p: any) => (
            <ProgramCard key={p.program_id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
}
