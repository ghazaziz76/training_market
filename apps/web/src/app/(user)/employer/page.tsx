'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { HeroBanner } from '@/components/storefront/HeroBanner';
import { ProgramCard } from '@/components/storefront/ProgramCard';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { ProviderSpotlight } from '@/components/storefront/ProviderSpotlight';
import { api } from '@/lib/api';

const QUICK_SEARCHES = [
  'Leadership',
  'Safety & Health',
  'Digital Marketing',
  'Project Management',
  'Communication Skills',
  'Data Analytics',
];

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

export default function EmployerHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newPrograms, setNewPrograms] = useState([]);
  const [spotlights, setSpotlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/storefront/hero-banners'),
      api.get('/storefront/featured?limit=8'),
      api.get('/storefront/trending?limit=8'),
      api.get('/storefront/categories'),
      api.get('/storefront/new?limit=8'),
      api.get('/storefront/provider-spotlights?limit=6'),
    ]).then(([b, f, t, c, n, s]) => {
      setBanners((b.data as any) || []);
      setFeatured((f.data as any) || []);
      setTrending((t.data as any) || []);
      setCategories((c.data as any) || []);
      setNewPrograms((n.data as any) || []);
      setSpotlights((s.data as any) || []);
      setLoading(false);
    });
  }, []);

  const handleSearch = (q?: string) => {
    const query = q || searchQuery;
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Search Hero */}
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-user-primary to-user-primary-dark p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Find the Right Training Program</h1>
        <p className="text-white/80 mb-6 text-lg">Search from hundreds of HRD Corp claimable programs across Malaysia</p>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search by keyword, skill, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-32 text-foreground text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-user-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-user-primary-dark transition-colors"
          >
            Search
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK_SEARCHES.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSearch(tag)}
              className="rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Banner */}
      {banners.length > 0 && (
        <div className="mb-12">
          <HeroBanner banners={banners} />
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Section title="Browse by Category" href="/categories">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((c: any) => (
              <CategoryCard key={c.category_id} category={c} />
            ))}
          </div>
        </Section>
      )}

      {/* Recommended */}
      {featured.length > 0 && (
        <Section title="Recommended for You" href="/search">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <Section title="Trending Programs" href="/search?sort=trending">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trending.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}

      {/* New Programs */}
      {newPrograms.length > 0 && (
        <Section title="New Programs" href="/search?sort=newest">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {newPrograms.map((p: any) => (
              <ProgramCard key={p.program_id} program={p} />
            ))}
          </div>
        </Section>
      )}

      {/* Provider Spotlights */}
      {spotlights.length > 0 && (
        <Section title="Provider Spotlights">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spotlights.map((s: any) => (
              <ProviderSpotlight key={s.provider_id} provider={s} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
