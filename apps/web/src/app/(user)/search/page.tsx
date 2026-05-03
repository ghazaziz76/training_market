'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SlidersHorizontal, X, Search, MapPin, Star, ShieldCheck, BookOpen } from 'lucide-react';
import { Button, Select, Spinner, Pagination, EmptyState, Badge, Avatar } from '@/components/ui';
import { ProgramCard } from '@/components/storefront/ProgramCard';
import { api } from '@/lib/api';

const DELIVERY_OPTIONS = [
  { value: '', label: 'All Modes' },
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'fee_asc', label: 'Price: Low to High' },
  { value: 'fee_desc', label: 'Price: High to Low' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Filters
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const delivery_mode = searchParams.get('delivery_mode') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const page = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    api.get('/storefront/categories').then((res) => {
      if (res.success && res.data) setCategories(res.data as any);
    });
  }, []);

  // Build flat option list with parent > subcategory grouping
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.flatMap((c: any) => [
      { value: c.category_id, label: `${c.name} (${c.program_count})` },
      ...(c.subcategories || [])
        .filter((s: any) => s.program_count > 0)
        .map((s: any) => ({ value: s.category_id, label: `  — ${s.name} (${s.program_count})` })),
    ]),
  ];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category_id', category);
    if (delivery_mode) params.set('delivery_mode', delivery_mode);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '20');

    api.get(`/search/programs?${params}`).then((res: any) => {
      setPrograms(res.data || []);
      setProviders(res.providers || []);
      if (res.pagination) setPagination(res.pagination);
      setLoading(false);
    });
  }, [q, category, delivery_mode, sort, page]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/search?${params}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {q ? `Results for "${q}"` : 'Browse Training Programs'}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          {pagination.total} program{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar — desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <Select
                options={categoryOptions}
                value={category}
                onChange={(e) => updateFilter('category', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Delivery Mode</label>
              <Select
                options={DELIVERY_OPTIONS}
                value={delivery_mode}
                onChange={(e) => updateFilter('delivery_mode', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
              <Select
                options={SORT_OPTIONS}
                value={sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Mobile filter button */}
        <div className="lg:hidden mb-4">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
            Filters
          </Button>
        </div>

        {/* Mobile filter panel */}
        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-background-paper p-6 shadow-xl overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-6">
                <Select label="Category" options={categoryOptions} value={category} onChange={(e) => updateFilter('category', e.target.value)} />
                <Select label="Delivery Mode" options={DELIVERY_OPTIONS} value={delivery_mode} onChange={(e) => updateFilter('delivery_mode', e.target.value)} />
                <Select label="Sort By" options={SORT_OPTIONS} value={sort} onChange={(e) => updateFilter('sort', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : programs.length === 0 && providers.length === 0 ? (
            <EmptyState title="No results found" description="Try adjusting your filters or search terms" />
          ) : (
            <>
              {/* Matched Training Providers */}
              {providers.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Training Providers</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {providers.map((prov: any) => (
                      <Link key={prov.provider_id} href={`/providers/${prov.provider_id}`}>
                        <div className="flex items-start gap-4 rounded-xl border border-border bg-background-paper p-4 hover:border-user-primary hover:shadow-md transition-all">
                          <Avatar name={prov.provider_name || 'TP'} src={prov.logo_url} size="lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground">{prov.provider_name}</h3>
                            {prov.business_description && (
                              <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{prov.business_description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-foreground-muted">
                              {(prov.city || prov.state) && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[prov.city, prov.state].filter(Boolean).join(', ')}</span>
                              )}
                              {Number(prov.average_rating) > 0 && (
                                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{Number(prov.average_rating).toFixed(1)}</span>
                              )}
                              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{prov.program_count} program{prov.program_count !== 1 ? 's' : ''}</span>
                              {prov.hrd_corp_registered_provider && (
                                <Badge color="green" size="sm">HRD Corp</Badge>
                              )}
                            </div>
                          </div>
                          <Badge color={prov.quality_tier === 'premium' ? 'amber' : prov.quality_tier === 'trusted' ? 'blue' : 'gray'} size="sm">
                            {prov.quality_tier}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Programs */}
              {programs.length > 0 && providers.length > 0 && (
                <h2 className="text-lg font-semibold text-foreground mb-3">Training Programs</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {programs.map((p: any) => (
                  <div key={p.program_id} className="relative">
                    <ProgramCard program={p} />
                    <label className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-background-paper/90 px-2 py-1 text-xs cursor-pointer border border-border shadow-sm">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(p.program_id)}
                        onChange={(e) => {
                          if (e.target.checked && compareIds.length < 3) setCompareIds([...compareIds, p.program_id]);
                          else setCompareIds(compareIds.filter((id: string) => id !== p.program_id));
                        }}
                        className="rounded"
                      />
                      Compare
                    </label>
                  </div>
                ))}
              </div>

              {/* Compare floating bar */}
              {compareIds.length >= 2 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-user-primary text-white px-6 py-3 shadow-xl flex items-center gap-4">
                  <span className="text-sm font-medium">{compareIds.length} programs selected</span>
                  <Link href={`/compare?ids=${compareIds.join(',')}`}>
                    <button className="rounded-lg bg-white text-user-primary px-4 py-1.5 text-sm font-semibold hover:bg-white/90">Compare Now</button>
                  </Link>
                  <button onClick={() => setCompareIds([])} className="text-white/70 hover:text-white text-xs">Clear</button>
                </div>
              )}
              {pagination.total_pages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.total_pages}
                    onPageChange={(p) => updateFilter('page', String(p))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
