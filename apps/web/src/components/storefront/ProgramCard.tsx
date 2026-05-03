'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, MapPin, Monitor, Users, Award,
  BookOpen, Shield, TrendingUp, Scale, Briefcase, MessageCircle,
  Settings, FileText, Leaf, ClipboardList, Stethoscope, Gavel,
  GraduationCap, Cog, Truck, Headphones, Building2, Palette,
  Sprout, UtensilsCrossed, Hotel, HardHat, Flame, Landmark,
  ShoppingCart, Radio, Sparkles, Languages, Car, MoreHorizontal,
  MessageSquare, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency, formatDeliveryMode } from '@/lib/format';

const categoryIconMap: Record<string, React.ReactNode> = {
  'Technology and IT': <Monitor className="h-4 w-4" />,
  'Safety and Compliance': <Shield className="h-4 w-4" />,
  'Sales and Marketing': <TrendingUp className="h-4 w-4" />,
  'Leadership and Management': <Users className="h-4 w-4" />,
  'Manufacturing and Operations': <Settings className="h-4 w-4" />,
  'Finance and Accounting': <Scale className="h-4 w-4" />,
  'Human Resources': <Briefcase className="h-4 w-4" />,
  'Communication and Soft Skills': <MessageCircle className="h-4 w-4" />,
  'Office Productivity': <FileText className="h-4 w-4" />,
  'ESG and Sustainability': <Leaf className="h-4 w-4" />,
  'Teambuilding': <Users className="h-4 w-4" />,
  'Project Management': <ClipboardList className="h-4 w-4" />,
  'Healthcare and Medical': <Stethoscope className="h-4 w-4" />,
  'Legal and Governance': <Gavel className="h-4 w-4" />,
  'Education and Training': <GraduationCap className="h-4 w-4" />,
  'Engineering': <Cog className="h-4 w-4" />,
  'Logistics and Supply Chain': <Truck className="h-4 w-4" />,
  'Customer Service': <Headphones className="h-4 w-4" />,
  'Real Estate and Property': <Building2 className="h-4 w-4" />,
  'Media and Creative': <Palette className="h-4 w-4" />,
  'Agriculture and Agribusiness': <Sprout className="h-4 w-4" />,
  'Hospitality and Tourism': <Hotel className="h-4 w-4" />,
  'Construction': <HardHat className="h-4 w-4" />,
  'Oil Gas and Energy': <Flame className="h-4 w-4" />,
  'Banking and Insurance': <Landmark className="h-4 w-4" />,
  'Retail and E-Commerce': <ShoppingCart className="h-4 w-4" />,
  'Telecommunications': <Radio className="h-4 w-4" />,
  'Personal Development': <Sparkles className="h-4 w-4" />,
  'Language and Communication': <Languages className="h-4 w-4" />,
  'Food and Beverage': <UtensilsCrossed className="h-4 w-4" />,
  'Automotive': <Car className="h-4 w-4" />,
  'Other': <MoreHorizontal className="h-4 w-4" />,
};

const categoryColorMap: Record<string, string> = {
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

interface ProgramCardProps {
  program: {
    program_id: string;
    title: string;
    category?: { name: string; parent?: { name: string } | null } | null;
    provider?: { provider_id?: string; provider_name: string; quality_tier?: string } | null;
    delivery_mode: string;
    program_type?: string | null;
    location?: string | null;
    duration_hours?: number | null;
    duration_days?: number | null;
    fee: number;
    fee_per_pax?: number | null;
    fee_per_group?: number | null;
    is_certification?: boolean;
    certification_body?: string | null;
    hrd_corp_claimable?: boolean;
    skill_tags?: string[];
  };
}

const deliveryIcon: Record<string, React.ReactNode> = {
  online: <Monitor className="h-3.5 w-3.5" />,
  physical: <MapPin className="h-3.5 w-3.5" />,
  hybrid: <Users className="h-3.5 w-3.5" />,
};

export function ProgramCard({ program }: ProgramCardProps) {
  const router = useRouter();
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryText, setEnquiryText] = useState('');
  const [sending, setSending] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleCardClick = useCallback(() => {
    router.push(`/programs/${program.program_id}`);
  }, [router, program.program_id]);

  const duration = program.duration_days
    ? `${program.duration_days} day${program.duration_days > 1 ? 's' : ''}`
    : program.duration_hours
      ? `${program.duration_hours}h`
      : null;

  // Close popover when clicking outside
  useEffect(() => {
    if (!showEnquiry) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowEnquiry(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEnquiry]);

  const handleSendEnquiry = async () => {
    if (!enquiryText.trim()) return;
    setSending(true);
    const res = await api.post('/enquiries', {
      provider_id: program.provider?.provider_id,
      program_id: program.program_id,
      subject: `Enquiry about ${program.title}`,
      enquiry_type: 'general',
      message: enquiryText,
    });
    setSending(false);
    if (res.success) {
      toast.success('Enquiry sent!');
      setEnquiryText('');
      setShowEnquiry(false);
    } else {
      toast.error(res.message || 'Failed to send enquiry');
    }
  };

  return (
    <div className="relative h-full">
      <div onClick={handleCardClick} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleCardClick()} className="cursor-pointer">
        <div className="group relative rounded-lg border border-border bg-background-paper p-5 hover:border-user-primary hover:shadow-md transition-all h-full flex flex-col">
          {/* Category icon — top right */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {program.category && (() => {
              const catName = program.category!.parent?.name || program.category!.name;
              return (
                <div className={`rounded-lg bg-gradient-to-br ${categoryColorMap[catName] || 'from-gray-400 to-gray-500'} p-2 text-white shadow-sm`} title={catName}>
                  {categoryIconMap[catName] || <BookOpen className="h-4 w-4" />}
                </div>
              );
            })()}
            {program.is_certification && program.certification_body && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Award className="h-3 w-3" /> Certified
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground group-hover:text-user-primary line-clamp-2 mb-2 pr-16">
            {program.title}
          </h3>

          {/* Provider */}
          {program.provider && (
            <p className="text-sm text-foreground-muted mb-3">
              by {program.provider.provider_id ? (
                <Link href={`/providers/${program.provider.provider_id}`} onClick={(e) => e.stopPropagation()} className="text-user-primary hover:underline">
                  {program.provider.provider_name}
                </Link>
              ) : program.provider.provider_name}
              {program.provider.quality_tier && program.provider.quality_tier !== 'unverified' && (
                <Badge
                  color={program.provider.quality_tier === 'premium' ? 'amber' : program.provider.quality_tier === 'trusted' ? 'blue' : 'green'}
                  size="sm"
                  className="ml-2"
                >
                  {program.provider.quality_tier}
                </Badge>
              )}
            </p>
          )}

          {/* Meta */}
          <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              {deliveryIcon[program.delivery_mode] || <Monitor className="h-3.5 w-3.5" />}
              {formatDeliveryMode(program.delivery_mode)}
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {duration}
              </span>
            )}
            {program.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {program.location}
              </span>
            )}
          </div>

          {/* Price + Enquire button */}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              {program.fee_per_pax && Number(program.fee_per_pax) > 0 ? (
                <div>
                  <span className="text-lg font-bold text-user-primary">{formatCurrency(Number(program.fee_per_pax))}</span>
                  <span className="text-xs text-foreground-muted">/pax</span>
                </div>
              ) : program.fee ? (
                <span className="text-lg font-bold text-user-primary">{formatCurrency(program.fee)}</span>
              ) : null}
              {program.fee_per_group && Number(program.fee_per_group) > 0 && (
                <div>
                  <span className="text-base font-semibold text-foreground">{formatCurrency(Number(program.fee_per_group))}</span>
                  <span className="text-xs text-foreground-muted">/day (in-house)</span>
                </div>
              )}
              {!program.fee && !program.fee_per_pax && !program.fee_per_group && (
                <span className="text-sm text-foreground-muted">Contact for pricing</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enquire button — positioned at bottom-right of the card */}
      <button
        type="button"
        title="Quick enquiry"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowEnquiry((prev) => !prev);
        }}
        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-md border border-border bg-background-paper px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:border-user-primary hover:text-user-primary transition-colors shadow-sm"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Enquire
      </button>

      {/* Enquiry popover */}
      {showEnquiry && (
        <div
          ref={popoverRef}
          className="absolute bottom-14 right-2 z-30 w-72 rounded-lg border border-border bg-background-paper p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-foreground mb-2">Quick Enquiry</p>
          <Textarea
            placeholder="Write your message..."
            value={enquiryText}
            onChange={(e) => setEnquiryText(e.target.value)}
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={handleSendEnquiry}
              isLoading={sending}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
