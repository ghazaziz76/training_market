'use client';

import Link from 'next/link';
import {
  Monitor, Shield, TrendingUp, Users, Wrench, BookOpen,
  Brain, Briefcase, Heart, Scale, Leaf, MessageCircle,
  Settings, FileText, ClipboardList, Stethoscope, Gavel,
  GraduationCap, Cog, Truck, Headphones, Building2, Palette,
  Sprout, UtensilsCrossed, Hotel, HardHat, Flame, Landmark,
  ShoppingCart, Radio, Sparkles, Languages, Car, MoreHorizontal,
} from 'lucide-react';

interface Subcategory {
  category_id: string;
  name: string;
  program_count?: number;
}

interface CategoryCardProps {
  category: {
    category_id: string;
    name: string;
    program_count?: number;
    subcategories?: Subcategory[];
    _count?: { programs: number };
  };
  expanded?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'Technology and IT': <Monitor className="h-6 w-6" />,
  'Safety and Compliance': <Shield className="h-6 w-6" />,
  'Sales and Marketing': <TrendingUp className="h-6 w-6" />,
  'Leadership and Management': <Users className="h-6 w-6" />,
  'Manufacturing and Operations': <Settings className="h-6 w-6" />,
  'Finance and Accounting': <Scale className="h-6 w-6" />,
  'Human Resources': <Briefcase className="h-6 w-6" />,
  'Communication and Soft Skills': <MessageCircle className="h-6 w-6" />,
  'Office Productivity': <FileText className="h-6 w-6" />,
  'ESG and Sustainability': <Leaf className="h-6 w-6" />,
  'Teambuilding': <Users className="h-6 w-6" />,
  'Project Management': <ClipboardList className="h-6 w-6" />,
  'Healthcare and Medical': <Stethoscope className="h-6 w-6" />,
  'Legal and Governance': <Gavel className="h-6 w-6" />,
  'Education and Training': <GraduationCap className="h-6 w-6" />,
  'Engineering': <Cog className="h-6 w-6" />,
  'Logistics and Supply Chain': <Truck className="h-6 w-6" />,
  'Customer Service': <Headphones className="h-6 w-6" />,
  'Real Estate and Property': <Building2 className="h-6 w-6" />,
  'Media and Creative': <Palette className="h-6 w-6" />,
  'Agriculture and Agribusiness': <Sprout className="h-6 w-6" />,
  'Hospitality and Tourism': <Hotel className="h-6 w-6" />,
  'Construction': <HardHat className="h-6 w-6" />,
  'Oil Gas and Energy': <Flame className="h-6 w-6" />,
  'Banking and Insurance': <Landmark className="h-6 w-6" />,
  'Retail and E-Commerce': <ShoppingCart className="h-6 w-6" />,
  'Telecommunications': <Radio className="h-6 w-6" />,
  'Personal Development': <Sparkles className="h-6 w-6" />,
  'Language and Communication': <Languages className="h-6 w-6" />,
  'Food and Beverage': <UtensilsCrossed className="h-6 w-6" />,
  'Automotive': <Car className="h-6 w-6" />,
  'Other': <MoreHorizontal className="h-6 w-6" />,
};

const colorMap: Record<string, string> = {
  'Technology and IT': 'from-blue-500 to-cyan-500',
  'Safety and Compliance': 'from-red-500 to-orange-500',
  'Sales and Marketing': 'from-purple-500 to-pink-500',
  'Leadership and Management': 'from-amber-500 to-yellow-500',
  'Manufacturing and Operations': 'from-slate-500 to-zinc-500',
  'Finance and Accounting': 'from-emerald-500 to-green-500',
  'Human Resources': 'from-indigo-500 to-blue-500',
  'Communication and Soft Skills': 'from-teal-500 to-cyan-500',
  'Office Productivity': 'from-violet-500 to-purple-500',
  'ESG and Sustainability': 'from-green-500 to-lime-500',
  'Teambuilding': 'from-orange-500 to-amber-500',
  'Project Management': 'from-sky-500 to-blue-500',
  'Healthcare and Medical': 'from-rose-500 to-pink-500',
  'Legal and Governance': 'from-stone-500 to-neutral-600',
  'Education and Training': 'from-cyan-500 to-teal-500',
  'Engineering': 'from-zinc-500 to-slate-600',
  'Logistics and Supply Chain': 'from-yellow-500 to-orange-500',
  'Customer Service': 'from-fuchsia-500 to-purple-500',
  'Real Estate and Property': 'from-teal-600 to-emerald-500',
  'Media and Creative': 'from-pink-500 to-rose-500',
  'Agriculture and Agribusiness': 'from-lime-500 to-green-600',
  'Hospitality and Tourism': 'from-sky-400 to-indigo-500',
  'Construction': 'from-amber-600 to-yellow-600',
  'Oil Gas and Energy': 'from-red-600 to-orange-600',
  'Banking and Insurance': 'from-blue-600 to-indigo-600',
  'Retail and E-Commerce': 'from-violet-500 to-fuchsia-500',
  'Telecommunications': 'from-cyan-600 to-blue-600',
  'Personal Development': 'from-rose-400 to-pink-500',
  'Language and Communication': 'from-indigo-400 to-violet-500',
  'Food and Beverage': 'from-orange-400 to-red-500',
  'Automotive': 'from-neutral-500 to-zinc-600',
  'Other': 'from-gray-400 to-gray-500',
};

export function CategoryCard({ category, expanded = false }: CategoryCardProps) {
  const icon = iconMap[category.name] || <BookOpen className="h-6 w-6" />;
  const gradient = colorMap[category.name] || 'from-gray-500 to-gray-600';
  const count = category.program_count ?? category._count?.programs ?? 0;
  const subs = category.subcategories || [];

  if (expanded) {
    return (
      <div className="rounded-xl border border-border bg-background-paper overflow-hidden hover:shadow-lg transition-shadow">
        <Link href={`/search?category=${category.category_id}`}>
          <div className={`bg-gradient-to-r ${gradient} p-5 text-white`}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">{icon}</div>
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-white/80 text-sm">{count} program{count !== 1 ? 's' : ''} available</p>
              </div>
            </div>
          </div>
        </Link>
        {subs.length > 0 && (
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {subs.map((sub) => (
                <Link key={sub.category_id} href={`/search?category=${sub.category_id}`}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background-subtle hover:border-user-primary hover:text-user-primary transition-colors">
                    {sub.name}
                    {sub.program_count != null && sub.program_count > 0 && (
                      <span className="text-foreground-muted">({sub.program_count})</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact card (homepage)
  return (
    <Link href={`/search?category=${category.category_id}`}>
      <div className="group flex flex-col items-center rounded-xl border border-border bg-background-paper p-5 text-center hover:border-user-primary hover:shadow-md transition-all">
        <div className={`mb-3 rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-sm`}>
          {icon}
        </div>
        <h3 className="font-medium text-sm text-foreground">{category.name}</h3>
        <p className="mt-1 text-xs text-foreground-muted">
          {count} program{count !== 1 ? 's' : ''}
        </p>
        {subs.length > 0 && (
          <p className="mt-1 text-[11px] text-foreground-subtle">
            {subs.slice(0, 2).map((s) => s.name).join(', ')}{subs.length > 2 ? ` +${subs.length - 2}` : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
