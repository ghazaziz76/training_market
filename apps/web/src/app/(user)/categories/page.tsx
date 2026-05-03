'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { api } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/storefront/categories').then((res) => {
      setCategories((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  const filtered = filter
    ? categories.filter((c: any) =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.subcategories?.some((s: any) => s.name.toLowerCase().includes(filter.toLowerCase()))
      )
    : categories;

  const totalPrograms = categories.reduce((sum: number, c: any) => sum + (c.program_count || 0), 0);
  const totalSubcategories = categories.reduce((sum: number, c: any) => sum + (c.subcategories?.length || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Browse Training Categories</h1>
        <p className="text-foreground-muted mt-2">
          {categories.length} categories · {totalSubcategories} specializations · {totalPrograms} programs
        </p>
      </div>

      {/* Filter */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          placeholder="Filter categories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-border bg-background-paper py-2.5 pl-10 pr-4 text-sm focus:border-user-primary focus:outline-none focus:ring-1 focus:ring-user-primary"
        />
      </div>

      {/* Category Grid — expanded cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((c: any) => (
          <CategoryCard key={c.category_id} category={c} expanded />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-foreground-muted py-12">No categories match your filter</p>
      )}
    </div>
  );
}
