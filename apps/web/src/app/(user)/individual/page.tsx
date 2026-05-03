'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { ProgramCard } from '@/components/storefront/ProgramCard';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { api } from '@/lib/api';

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm font-medium text-user-primary hover:text-user-primary-dark">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function IndividualHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newPrograms, setNewPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/storefront/featured?limit=8'),
      api.get('/storefront/trending?limit=8'),
      api.get('/storefront/categories'),
      api.get('/storefront/new?limit=8'),
    ]).then(([f, t, c, n]) => {
      setFeatured((f.data as any) || []);
      setTrending((t.data as any) || []);
      setCategories((c.data as any) || []);
      setNewPrograms((n.data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const banners = [
    {
      title: 'Invest in Your Career Growth',
      subtitle: 'Discover training programs tailored to your career goals and skill interests',
      cta_text: 'Explore Programs',
      cta_link: '/search',
      background_color: 'from-user-primary to-user-accent-dark',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Search Hero */}
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-user-primary to-user-accent p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Invest in Your Career Growth</h1>
        <p className="text-white/80 mb-6 text-lg">Discover training programs tailored to your career goals</p>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search by keyword, skill, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchQuery.trim() && router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
            className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-32 text-foreground text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            onClick={() => searchQuery.trim() && router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-user-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-user-primary-dark transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {featured.length > 0 && (
        <Section title="Recommended for Your Career Goals" href="/search">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}

      {trending.length > 0 && (
        <Section title="Popular Among Learners" href="/search?sort=trending">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trending.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}

      {categories.length > 0 && (
        <Section title="Browse by Category" href="/categories">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((c: any) => (
              <CategoryCard key={c.category_id} category={c} />
            ))}
          </div>
        </Section>
      )}

      {newPrograms.length > 0 && (
        <Section title="New Programs" href="/search?sort=newest">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {newPrograms.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
