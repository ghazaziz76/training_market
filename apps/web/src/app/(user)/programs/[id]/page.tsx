'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Monitor, Users, Award, DollarSign, Send, MapPin, BookOpen, CheckCircle, Calendar, Star, Heart, Share2, MessageCircle, Mail, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Badge, Card, Spinner, Textarea, Avatar } from '@/components/ui';
import { formatCurrency, formatDeliveryMode, formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'outcomes' | 'schedule' | 'trainer' | 'reviews';

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquirySubject, setEnquirySubject] = useState('');
  const [sending, setSending] = useState(false);
  const [reviews, setReviews] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/programs/${id}`).then((res) => {
      if (res.success) setProgram(res.data);
      setLoading(false);
    });
    api.get(`/programs/${id}/reviews`).then((res) => {
      if (res.success) setReviews(res.data);
    });
  }, [id]);

  const submitReview = async () => {
    setSubmittingReview(true);
    const res = await api.post(`/programs/${id}/reviews`, reviewForm);
    setSubmittingReview(false);
    if (res.success) {
      toast.success('Review submitted!');
      setReviewForm({ rating: 5, title: '', comment: '' });
      api.get(`/programs/${id}/reviews`).then((r) => { if (r.success) setReviews(r.data); });
    } else {
      toast.error((res as any).message || 'Failed');
    }
  };

  const handleEnquiry = async () => {
    if (!enquiryMessage.trim()) return;
    setSending(true);
    const res = await api.post('/enquiries', {
      provider_id: program.provider_id,
      program_id: program.program_id,
      subject: enquirySubject || `Enquiry about ${program.title}`,
      enquiry_type: 'general',
      message: enquiryMessage,
    });
    setSending(false);
    if (res.success) {
      toast.success('Enquiry sent!');
      setEnquiryMessage('');
      setEnquirySubject('');
    } else {
      toast.error(res.message || 'Failed to send enquiry');
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!program) return <div className="flex min-h-[60vh] items-center justify-center"><p>Program not found</p></div>;

  const hasPaxFee = program.fee_per_pax && Number(program.fee_per_pax) > 0;
  const hasGroupFee = program.fee_per_group && Number(program.fee_per_group) > 0;

  const duration = [
    program.duration_days ? `${program.duration_days} day${program.duration_days > 1 ? 's' : ''}` : null,
    program.duration_hours ? `${program.duration_hours} hours` : null,
  ].filter(Boolean).join(' / ') || 'N/A';

  const location = [program.city, program.state].filter(Boolean).join(', ') || null;

  const trainers = program.program_trainers?.map((pt: any) => pt.trainer).filter(Boolean) || [];

  const programType = program.program_type === 'in_house' ? 'In-House' : program.program_type === 'public' ? 'Public' : program.program_type || 'Public';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'outcomes', label: 'Learning Outcomes' },
    { key: 'schedule', label: 'Schedule & Details' },
    { key: 'trainer', label: 'Trainer Info' },
    { key: 'reviews', label: `Reviews${reviews?.stats?.total_reviews ? ` (${reviews.stats.total_reviews})` : ''}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Hero */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {program.category && <Badge color="blue">{program.category.name}</Badge>}
              <Badge color={programType === 'In-House' ? 'violet' : 'green'}>{programType}</Badge>
              {program.skill_type && <Badge color="gray">{program.skill_type}</Badge>}
              {program.is_certification && program.certification_body && <Badge color="amber">Certified — {program.certification_body}</Badge>}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{program.title}</h1>
            {program.short_description && (
              <p className="text-foreground-muted text-lg mb-3">{program.short_description}</p>
            )}
            {program.provider && (
              <div className="flex items-center gap-2">
                <Avatar name={program.provider.provider_name} src={program.provider.logo_url} size="sm" />
                <span className="text-foreground-muted">by <Link href={`/providers/${program.provider.provider_id}`} className="font-semibold text-user-primary hover:underline">{program.provider.provider_name}</Link></span>
                {program.provider.quality_tier && program.provider.quality_tier !== 'unverified' && (
                  <Badge color={program.provider.quality_tier === 'premium' ? 'amber' : 'green'} size="sm">{program.provider.quality_tier}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {hasPaxFee && (
              <div className="rounded-lg bg-background-subtle p-4 text-center">
                <DollarSign className="mx-auto h-5 w-5 text-user-primary mb-1" />
                <p className="text-base font-bold text-foreground">{formatCurrency(Number(program.fee_per_pax))}</p>
                <p className="text-xs text-foreground-muted">Public (per pax)</p>
              </div>
            )}
            {hasGroupFee && (
              <div className="rounded-lg bg-background-subtle p-4 text-center">
                <DollarSign className="mx-auto h-5 w-5 text-user-primary mb-1" />
                <p className="text-base font-bold text-foreground">{formatCurrency(Number(program.fee_per_group))}</p>
                <p className="text-xs text-foreground-muted">In-House (per day)</p>
              </div>
            )}
            {!hasPaxFee && !hasGroupFee && (
              <div className="rounded-lg bg-background-subtle p-4 text-center">
                <DollarSign className="mx-auto h-5 w-5 text-user-primary mb-1" />
                <p className="text-base font-bold text-foreground">Contact</p>
                <p className="text-xs text-foreground-muted">For pricing</p>
              </div>
            )}
            <div className="rounded-lg bg-background-subtle p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-user-primary mb-1" />
              <p className="text-base font-bold text-foreground">{duration}</p>
              <p className="text-xs text-foreground-muted">Duration</p>
            </div>
            <div className="rounded-lg bg-background-subtle p-4 text-center">
              <Monitor className="mx-auto h-5 w-5 text-user-primary mb-1" />
              <p className="text-base font-bold text-foreground">{formatDeliveryMode(program.delivery_mode)}</p>
              <p className="text-xs text-foreground-muted">Delivery Mode</p>
            </div>
            <div className="rounded-lg bg-background-subtle p-4 text-center">
              <Users className="mx-auto h-5 w-5 text-user-primary mb-1" />
              <p className="text-base font-bold text-foreground">{program.max_participants || 'Open'}</p>
              <p className="text-xs text-foreground-muted">Max Participants</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-6">
            <div className="flex gap-6">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'pb-3 text-sm font-medium border-b-2 transition-colors',
                    tab === t.key
                      ? 'border-user-primary text-user-primary'
                      : 'border-transparent text-foreground-muted hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {program.description && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-sm text-foreground whitespace-pre-line">{program.description}</p>
                </div>
              )}
              {program.objective && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Objective</h3>
                  <p className="text-sm text-foreground whitespace-pre-line">{program.objective}</p>
                </div>
              )}
              {program.target_group && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Target Audience</h3>
                  <p className="text-sm text-foreground">{program.target_group}</p>
                </div>
              )}
              {program.prerequisites && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Prerequisites</h3>
                  <p className="text-sm text-foreground">{program.prerequisites}</p>
                </div>
              )}
              {program.skill_tags?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Skills Covered</h3>
                  <div className="flex flex-wrap gap-2">
                    {program.skill_tags.map((st: any) => (
                      <Badge key={st.skill_tag?.tag_id || st.tag_id} color="violet" size="sm">
                        {st.skill_tag?.name || st.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'outcomes' && (
            <div className="space-y-4">
              {program.objective ? (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Learning Outcomes</h3>
                  <div className="space-y-2">
                    {program.objective.split(/[;\n]/).filter(Boolean).map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{item.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">Learning outcomes not specified.</p>
              )}
              {program.is_certification && program.certification_body && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-800">Certified Program</h4>
                  </div>
                  {program.certification_name && (
                    <p className="text-sm text-amber-700">Certification: {program.certification_name}</p>
                  )}
                  {program.certification_body && (
                    <p className="text-sm text-amber-700">Awarding Body: {program.certification_body}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-6">
              {/* Program details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-foreground-muted mb-1">Program Type</p>
                  <p className="text-sm font-medium text-foreground">{programType}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-foreground-muted mb-1">Delivery Mode</p>
                  <p className="text-sm font-medium text-foreground">{formatDeliveryMode(program.delivery_mode)}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-foreground-muted mb-1">Duration</p>
                  <p className="text-sm font-medium text-foreground">{duration}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-foreground-muted mb-1">Language</p>
                  <p className="text-sm font-medium text-foreground">{program.language || 'English'}</p>
                </div>
                {location && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-foreground-muted mb-1">Location</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1"><MapPin className="h-4 w-4" />{location}</p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-foreground-muted mb-1">Max Participants</p>
                  <p className="text-sm font-medium text-foreground">{program.max_participants || 'No limit'}</p>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {program.fee_per_pax && (
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs text-foreground-muted mb-1">Per Person</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(Number(program.fee_per_pax))}</p>
                    </div>
                  )}
                  {program.fee_per_group && (
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs text-foreground-muted mb-1">In-House (Per Group / Per Day)</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(Number(program.fee_per_group))}</p>
                    </div>
                  )}
                  {program.early_bird_fee && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-xs text-green-700 mb-1">Early Bird Fee</p>
                      <p className="text-lg font-bold text-green-800">{formatCurrency(Number(program.early_bird_fee))}</p>
                    </div>
                  )}
                </div>
                {program.fee_notes && (
                  <p className="text-xs text-foreground-muted mt-2">{program.fee_notes}</p>
                )}
              </div>

              {/* Upcoming Schedules */}
              {program.schedules?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Upcoming Schedules</h3>
                  <div className="space-y-3">
                    {program.schedules.map((s: any) => (
                      <div key={s.schedule_id} className="flex items-center gap-3 rounded-lg border border-border p-4">
                        <Calendar className="h-5 w-5 text-user-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(s.start_date)}{s.end_date ? ` — ${formatDate(s.end_date)}` : ''}
                          </p>
                          {s.location && <p className="text-xs text-foreground-muted">{s.location}</p>}
                          {s.available_seats != null && <p className="text-xs text-foreground-muted">{s.available_seats} seats available</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agenda */}
              {program.agenda && program.agenda.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Agenda</h3>
                  <div className="space-y-2">
                    {(Array.isArray(program.agenda) ? program.agenda : [program.agenda]).map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="flex-shrink-0 rounded-full bg-user-primary text-white w-6 h-6 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <p>{typeof item === 'string' ? item : item.title || item.topic || JSON.stringify(item)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'trainer' && (
            <div className="text-sm text-foreground-muted">
              {trainers.length > 0 ? (
                <div className="space-y-4">
                  {trainers.map((t: any) => (
                    <Card key={t.trainer_id}>
                      <div className="flex items-start gap-4">
                        <Avatar name={t.name || 'Trainer'} size="lg" />
                        <div>
                          <h4 className="font-semibold text-foreground text-base">{t.name}</h4>
                          {t.qualification && <p className="text-sm text-foreground-muted mt-1">{t.qualification}</p>}
                          {t.specialization && <p className="text-sm mt-1"><strong>Specialization:</strong> {t.specialization}</p>}
                          {t.years_experience && <p className="text-sm mt-1"><strong>Experience:</strong> {t.years_experience} years</p>}
                          {t.bio && <p className="text-sm mt-2 whitespace-pre-line">{t.bio}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>Trainer information not available yet. Send an enquiry to ask about trainers.</p>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-6">
              {/* Rating summary */}
              {reviews?.stats && (
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">{reviews.stats.average_rating}</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviews.stats.average_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">{reviews.stats.total_reviews} review{reviews.stats.total_reviews !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5,4,3,2,1].map((n) => (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-foreground-muted">{n}</span>
                        <div className="flex-1 h-2 bg-background-subtle rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${reviews.stats.total_reviews > 0 ? ((reviews.stats.distribution[n] || 0) / reviews.stats.total_reviews * 100) : 0}%` }} />
                        </div>
                        <span className="w-5 text-foreground-muted text-right">{reviews.stats.distribution[n] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Write review */}
              <Card>
                <h4 className="text-sm font-semibold text-foreground mb-3">Write a Review</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-foreground-muted mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <button key={s} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>
                          <Star className={`h-6 w-6 ${s <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} hover:text-amber-400`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input type="text" placeholder="Review title (optional)" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded border border-border bg-background-paper px-3 py-2 text-sm focus:border-user-primary focus:outline-none" />
                  <textarea placeholder="Share your experience..." value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} rows={3} className="w-full rounded border border-border bg-background-paper px-3 py-2 text-sm focus:border-user-primary focus:outline-none" />
                  <Button size="sm" onClick={submitReview} isLoading={submittingReview}>Submit Review</Button>
                </div>
              </Card>

              {/* Reviews list */}
              {reviews?.reviews?.length > 0 ? (
                <div className="space-y-4">
                  {reviews.reviews.map((r: any) => (
                    <div key={r.review_id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-foreground-muted">{r.user?.full_name || 'User'}</span>
                        <span className="text-xs text-foreground-subtle">{formatDate(r.created_at)}</span>
                      </div>
                      {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
                      {r.comment && <p className="text-sm text-foreground-muted mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">No reviews yet. Be the first to review this program.</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save button */}
          <button
            onClick={async () => {
              if (saved) {
                await api.delete(`/programs/${id}/save`);
                setSaved(false);
                toast.success('Removed from saved');
              } else {
                await api.post(`/programs/${id}/save`, {});
                setSaved(true);
                toast.success('Saved!');
              }
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${saved ? 'border-red-300 bg-red-50 text-red-600' : 'border-border bg-background-paper text-foreground hover:border-red-300 hover:text-red-500'}`}
          >
            <Heart className={`h-5 w-5 ${saved ? 'fill-red-500' : ''}`} />
            {saved ? 'Saved' : 'Save Program'}
          </button>

          {/* Enquiry card */}
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Interested in this program?</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Subject (optional)"
                value={enquirySubject}
                onChange={(e) => setEnquirySubject(e.target.value)}
                className="w-full rounded-lg border border-border bg-background-paper px-3 py-2 text-sm focus:border-user-primary focus:outline-none focus:ring-1 focus:ring-user-primary"
              />
              <Textarea
                placeholder="Write your message or question..."
                value={enquiryMessage}
                onChange={(e) => setEnquiryMessage(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handleEnquiry}
                isLoading={sending}
                className="w-full"
                leftIcon={<Send className="h-4 w-4" />}
              >
                Send Enquiry
              </Button>
            </div>
          </Card>

          {/* Share buttons */}
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-3">Share this program</h3>
            <div className="flex items-center gap-2">
              <button
                title="Share via WhatsApp"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Check out this training program: ${program.title} - ${url}`)}`,
                    '_blank',
                  );
                }}
                className="rounded-lg border border-border p-2.5 text-foreground-muted hover:border-green-500 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                title="Share via Email"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  window.open(
                    `mailto:?subject=${encodeURIComponent(`Training Program: ${program.title}`)}&body=${encodeURIComponent(`Check out this program: ${url}`)}`,
                    '_self',
                  );
                }}
                className="rounded-lg border border-border p-2.5 text-foreground-muted hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                title="Copy link"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      toast.success('Link copied!');
                    });
                  }
                }}
                className="rounded-lg border border-border p-2.5 text-foreground-muted hover:border-user-primary hover:text-user-primary transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                title="Share"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({
                      title: program.title,
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      toast.success('Link copied!');
                    });
                  }
                }}
                className="rounded-lg border border-border p-2.5 text-foreground-muted hover:border-user-primary hover:text-user-primary transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </Card>

          {/* Provider info */}
          {program.provider && (
            <Link href={`/providers/${program.provider.provider_id}`}>
            <Card hover clickable>
              <h3 className="text-sm font-semibold text-foreground mb-3">Training Provider</h3>
              <div className="flex items-center gap-3">
                <Avatar name={program.provider.provider_name} src={program.provider.logo_url} />
                <div>
                  <p className="font-medium text-user-primary">{program.provider.provider_name}</p>
                  {program.provider.quality_tier && program.provider.quality_tier !== 'unverified' && (
                    <Badge color={program.provider.quality_tier === 'premium' ? 'amber' : 'green'} size="sm">{program.provider.quality_tier}</Badge>
                  )}
                  {program.provider.average_rating > 0 && (
                    <p className="text-xs text-foreground-muted mt-1">Rating: {Number(program.provider.average_rating).toFixed(1)}/5</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-user-primary mt-3">View full profile &rarr;</p>
            </Card>
            </Link>
          )}

          {/* HRD Corp */}
          {program.hrd_corp_claimable && (
            <Card className="border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-green-600" />
                <h3 className="text-sm font-semibold text-green-800">HRD Corp Claimable</h3>
              </div>
              <p className="text-xs text-green-700">This program is eligible for HRD Corp levy claims.</p>
              {program.hrd_corp_scheme && (
                <p className="text-xs text-green-700 mt-1">Scheme: {program.hrd_corp_scheme}</p>
              )}
            </Card>
          )}

          {/* Promotions */}
          {program.promotions?.length > 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <h3 className="text-sm font-semibold text-purple-800 mb-2">Active Promotions</h3>
              {program.promotions.map((p: any, i: number) => (
                <div key={i} className="text-xs text-purple-700">
                  {p.label || `${p.promotion_type}: ${p.discount_value}% off`}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
