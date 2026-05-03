'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Banner {
  title: string;
  subtitle: string;
  cta_text?: string;
  cta_link?: string;
  background_color?: string;
}

interface HeroBannerProps {
  banners: Banner[];
}

const defaultBanners: Banner[] = [
  {
    title: 'Find the Right Training for Your Team',
    subtitle: 'Browse thousands of programs from verified training providers across Malaysia',
    cta_text: 'Explore Programs',
    cta_link: '/search',
    background_color: 'from-user-primary to-user-primary-dark',
  },
  {
    title: 'Broadcast Your Training Needs',
    subtitle: 'Let training providers compete to offer you the best programs and pricing',
    cta_text: 'Create Broadcast',
    cta_link: '/employer/broadcasts/new',
    background_color: 'from-user-accent to-user-accent-dark',
  },
  {
    title: 'HRD Corp Levy Guidance',
    subtitle: 'Get guidance on leveraging your HRD Corp levy for employee training',
    cta_text: 'Learn More',
    cta_link: '/search',
    background_color: 'from-blue-600 to-indigo-700',
  },
];

export function HeroBanner({ banners }: HeroBannerProps) {
  const items = banners.length > 0 ? banners : defaultBanners;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((banner, i) => (
          <div
            key={i}
            className={cn(
              'flex min-w-full flex-col items-center justify-center px-8 py-16 text-center text-white bg-gradient-to-r',
              banner.background_color || 'from-user-primary to-user-primary-dark',
            )}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{banner.title}</h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mb-6">{banner.subtitle}</p>
            {banner.cta_text && (
              <a
                href={banner.cta_link || '#'}
                className="rounded-full bg-white px-8 py-3 font-semibold text-user-primary hover:bg-gray-100 transition-colors"
              >
                {banner.cta_text}
              </a>
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % items.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === current ? 'w-6 bg-white' : 'w-2 bg-white/50',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
