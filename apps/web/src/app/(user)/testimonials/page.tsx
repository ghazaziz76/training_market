'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Card, Avatar, Badge } from '@/components/ui';

interface Testimonial {
  id: number;
  name: string;
  title: string;
  company: string;
  type: 'employer' | 'provider';
  quote: string;
  category: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Ahmad Razali',
    title: 'Head of Learning & Development',
    company: 'Petronas Digital',
    type: 'employer',
    quote:
      'Training Market transformed how we source training providers. We used to spend weeks getting quotations from different vendors. Now we post a broadcast and receive competitive proposals within days. The quality tier system gives us confidence in the providers we shortlist.',
    category: 'Digital Transformation',
    rating: 5,
  },
  {
    id: 2,
    name: 'Dr. Lim Wei Ling',
    title: 'Managing Director',
    company: 'Ascend Training Solutions',
    type: 'provider',
    quote:
      'Since listing on Training Market, our enquiry volume has increased by 40%. The platform connects us directly with HR decision-makers at companies we never had access to before. The broadcast feature is especially valuable for discovering new in-house training opportunities.',
    category: 'Leadership & Management',
    rating: 5,
  },
  {
    id: 3,
    name: 'Nurul Aisyah',
    title: 'HR Manager',
    company: 'Maybank Group',
    type: 'employer',
    quote:
      'The HRD Corp filter saved us so much time. We could instantly see which programs are claimable and compare fees across providers. Our team completed the Lean Six Sigma certification through a provider we found on Training Market, and the whole process was seamless.',
    category: 'Quality & Process Improvement',
    rating: 5,
  },
  {
    id: 4,
    name: 'Rajesh Kumaran',
    title: 'Founder & Principal Trainer',
    company: 'TechBridge Academy',
    type: 'provider',
    quote:
      'As a smaller training company, it was hard to compete with established names. Training Market levels the playing field. Our verified profile and strong reviews helped us land contracts with GLCs and MNCs. Revenue from the platform now accounts for 30% of our business.',
    category: 'IT & Cybersecurity',
    rating: 4,
  },
  {
    id: 5,
    name: 'Tan Siew Mei',
    title: 'VP of Human Capital',
    company: 'Gamuda Berhad',
    type: 'employer',
    quote:
      'We needed safety training for 500 site workers across multiple locations in Peninsular Malaysia. The broadcast feature matched us with 8 providers who could handle the scale. We compared proposals side by side and selected the best value. The whole procurement took 2 weeks instead of 2 months.',
    category: 'Safety & Compliance',
    rating: 5,
  },
  {
    id: 6,
    name: 'Faizal Hamid',
    title: 'CEO',
    company: 'Inspira Consulting Group',
    type: 'provider',
    quote:
      'Training Market helped us reach clients across all of Malaysia, not just the Klang Valley. We have delivered in-house programs in Penang, Johor, and even Sabah through leads generated on the platform. The analytics dashboard helps us understand which programs attract the most interest.',
    category: 'Business Strategy',
    rating: 4,
  },
  {
    id: 7,
    name: 'Chong Kar Yan',
    title: 'Learning & Development Executive',
    company: 'AirAsia X',
    type: 'employer',
    quote:
      'Our team uses Training Market every quarter when planning our training calendar. The compare feature is brilliant - we can evaluate 4 providers at once on pricing, content, and reviews. It has become our go-to platform for sourcing external training across all departments.',
    category: 'Customer Service & Hospitality',
    rating: 5,
  },
  {
    id: 8,
    name: 'Siti Hajar',
    title: 'Director of Training',
    company: 'MIDA Academy',
    type: 'provider',
    quote:
      'The quality tier system motivates us to maintain high standards. After achieving Premium tier, our enquiry conversion rate doubled. Employers trust the verification badges, and the review system encourages us to deliver exceptional experiences every time.',
    category: 'Investment & Economics',
    rating: 5,
  },
];

const STATS = [
  { label: 'Employers', value: '500+' },
  { label: 'Training Providers', value: '200+' },
  { label: 'Professionals Trained', value: '10,000+' },
  { label: 'Programs Listed', value: '1,500+' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <Avatar name={testimonial.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{testimonial.name}</p>
          <p className="truncate text-xs text-foreground-muted">{testimonial.title}</p>
          <p className="truncate text-xs font-medium text-foreground-muted">{testimonial.company}</p>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={testimonial.rating} />
      </div>

      {/* Quote */}
      <blockquote className="mb-4 flex-1 text-sm leading-relaxed text-foreground-muted">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      {/* Footer */}
      <div className="flex items-center gap-2">
        <Badge color={testimonial.type === 'employer' ? 'blue' : 'green'} size="sm">
          {testimonial.type === 'employer' ? 'Employer' : 'Training Provider'}
        </Badge>
        <span className="text-xs text-foreground-muted">{testimonial.category}</span>
      </div>
    </Card>
  );
}

export default function TestimonialsPage() {
  const [filter, setFilter] = useState<'all' | 'employer' | 'provider'>('all');

  const filtered =
    filter === 'all'
      ? TESTIMONIALS
      : TESTIMONIALS.filter((t) => t.type === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Success Stories from Training Market
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
          Discover how employers and training providers across Malaysia are achieving
          their learning and development goals through our marketplace.
        </p>
      </div>

      {/* Stats Banner */}
      <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-muted/30 p-4 text-center"
          >
            <p className="text-2xl font-bold text-user-primary">{stat.value}</p>
            <p className="mt-1 text-sm text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {(['all', 'employer', 'provider'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-user-primary text-white'
                : 'bg-muted text-foreground-muted hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All Stories' : f === 'employer' ? 'Employers' : 'Training Providers'}
          </button>
        ))}
      </div>

      {/* Testimonials Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>

      {/* CTA Section */}
      <div className="mt-16 rounded-xl border border-border bg-muted/30 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold text-foreground">Ready to Write Your Success Story?</h2>
        <p className="mx-auto mt-2 max-w-xl text-foreground-muted">
          Join hundreds of organisations across Malaysia who are finding better training
          solutions through Training Market.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/auth/register?role=employer"
            className="inline-block rounded-lg bg-user-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Sign Up as Employer
          </a>
          <a
            href="/auth/register?role=provider"
            className="inline-block rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            List Your Programs
          </a>
        </div>
      </div>
    </div>
  );
}
