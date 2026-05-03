'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, FileText, File, Plus, Coffee, GripVertical } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Button, Input, Textarea, Card, Badge, Spinner, Select } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/api';

interface UploadedFile {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface AgendaSlot { module_title: string; is_break?: boolean; }
interface AgendaDay { day: number; slots: AgendaSlot[]; }

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const MODES = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
];

const BREAK_PRESETS = ['Morning Tea Break', 'Lunch Break', 'Afternoon Tea Break', 'Dinner Break', 'Night Break'];

export default function BroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [trainerDocs, setTrainerDocs] = useState<UploadedFile[]>([]);
  const [myPrograms, setMyPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [agenda, setAgenda] = useState<AgendaDay[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    objective: '',
    target_group: '',
    delivery_mode: 'physical',
    duration_days: '',
    duration_hours: '',
    fee_per_pax: '',
    fee_per_group: '',
    proposed_total: '',
    language: 'English',
    max_participants: '',
    city: '',
    proposal_message: '',
    proposed_schedule: '',
    proposed_start_date: '',
    proposed_end_date: '',
    trainer_details: '',
    value_add_offers: '',
  });

  useEffect(() => {
    Promise.all([
      api.get(`/broadcast-requests/${id}`),
      api.get('/programs/my-programs?limit=50'),
    ]).then(([reqRes, progRes]: any[]) => {
      if (reqRes.success && reqRes.data) {
        setRequest(reqRes.data);
        if (reqRes.data.my_proposal) setAlreadySubmitted(true);
      }
      if (progRes.success && progRes.data) {
        setMyPrograms(progRes.data.filter((p: any) => p.status === 'published' || p.status === 'draft'));
      }
      setLoading(false);
    });
  }, [id]);

  const handleProgramSelect = async (programId: string) => {
    setSelectedProgramId(programId);
    if (!programId) {
      // Reset to blank
      setForm({ title: '', description: '', objective: '', target_group: '', delivery_mode: 'physical', duration_days: '', duration_hours: '', fee_per_pax: '', fee_per_group: '', proposed_total: '', language: 'English', max_participants: '', city: '', proposal_message: '', proposed_schedule: '', proposed_start_date: '', proposed_end_date: '', trainer_details: '', value_add_offers: '' });
      setAgenda([]);
      return;
    }
    // Fetch full program details
    const res = await api.get(`/programs/${programId}`);
    if (res.success && res.data) {
      const p = res.data as any;
      setForm({
        title: p.title || '',
        description: p.description || '',
        objective: p.objective || '',
        target_group: p.target_group || '',
        delivery_mode: p.delivery_mode || 'physical',
        duration_days: p.duration_days ? String(p.duration_days) : '',
        duration_hours: p.duration_hours ? String(p.duration_hours) : '',
        fee_per_pax: p.fee_per_pax ? String(p.fee_per_pax) : '',
        fee_per_group: p.fee_per_group ? String(p.fee_per_group) : '',
        language: p.language || 'English',
        max_participants: p.max_participants ? String(p.max_participants) : '',
        city: [p.city, p.state].filter(Boolean).join(', '),
        proposal_message: `We would like to propose our program "${p.title}" for this training request.`,
        proposed_schedule: p.duration_days ? `${p.duration_days} day(s)` : '',
        proposed_total: '',
        proposed_start_date: '',
        proposed_end_date: '',
        trainer_details: '',
        value_add_offers: '',
      });
      if (Array.isArray(p.agenda) && p.agenda.length > 0) {
        setAgenda(p.agenda);
      } else {
        setAgenda([]);
      }
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const token = localStorage.getItem('auth-tokens');
        const accessToken = token ? JSON.parse(token).access_token : null;
        const res = await fetch(`${API_BASE}/uploads`, {
          method: 'POST',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data) {
          setTrainerDocs((prev) => [...prev, json.data]);
        } else {
          toast.error(json.message || `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setTrainerDocs((prev) => prev.filter((_, i) => i !== index));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proposal_message.trim()) {
      toast.error('Please fill in the proposal message');
      return;
    }
    setSubmitting(true);

    // Build a rich proposal message that includes all the program details
    const fullProposal = [
      form.proposal_message,
      form.title ? `\n\n--- Program Details ---\nTitle: ${form.title}` : '',
      form.description ? `\nDescription: ${form.description}` : '',
      form.objective ? `\nObjective/Learning Outcomes: ${form.objective}` : '',
      form.target_group ? `\nTarget Audience: ${form.target_group}` : '',
      form.delivery_mode ? `\nDelivery Mode: ${form.delivery_mode}` : '',
      form.duration_days ? `\nDuration: ${form.duration_days} day(s)` : '',
      form.language ? `\nLanguage: ${form.language}` : '',
      form.max_participants ? `\nMax Participants: ${form.max_participants}` : '',
      form.city ? `\nLocation: ${form.city}` : '',
      agenda.length > 0 ? `\n\n--- Training Modules ---\n${agenda.map((d) => `Day ${d.day}:\n${d.slots.map((s) => `  ${s.is_break ? '☕' : '•'} ${s.module_title}`).join('\n')}`).join('\n\n')}` : '',
    ].filter(Boolean).join('');

    // Fee calculation
    const paxFee = form.fee_per_pax ? Number(form.fee_per_pax) : 0;
    const groupFee = form.fee_per_group ? Number(form.fee_per_group) : 0;
    const count = request.participant_count || 1;
    const days = request.training_days || 1;
    const isInHouse = request.training_type === 'in_house';
    const calculatedTotal = isInHouse
      ? (groupFee ? groupFee * days : paxFee * count)
      : (paxFee ? paxFee * count : groupFee * days);
    // TP can override the total
    const totalFee = form.proposed_total ? Number(form.proposed_total) : calculatedTotal;

    const parts: string[] = [];
    if (paxFee) parts.push(`RM ${paxFee.toLocaleString()}/pax`);
    if (groupFee) parts.push(`RM ${groupFee.toLocaleString()}/day (group)`);
    parts.push(`${count} pax, ${days} day(s)`);
    const breakdown = `${parts.join(' | ')} = Total: RM ${totalFee.toLocaleString()}`;

    const res = await api.post(`/broadcast-requests/${id}/proposals`, {
      program_id: selectedProgramId || undefined,
      proposal_message: fullProposal,
      fee_per_pax: paxFee || undefined,
      fee_per_group: groupFee || undefined,
      proposed_fee: totalFee,
      fee_breakdown: breakdown,
      proposed_schedule: [
        form.proposed_start_date && form.proposed_end_date ? `${form.proposed_start_date} to ${form.proposed_end_date}` : form.proposed_start_date || '',
        form.duration_days ? `${form.duration_days} day(s)` : '',
      ].filter(Boolean).join(' · ') || form.proposed_schedule || '',
      proposed_duration: form.duration_days ? `${form.duration_days} days` : undefined,
      trainer_details: form.trainer_details,
      value_add_offers: [],
      attachments: trainerDocs,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Proposal submitted!');
      router.push('/provider/proposals');
    } else {
      toast.error(res.message || 'Submission failed');
    }
  };

  if (loading) return <><VendorHeader title="Broadcast Detail" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;
  if (!request) return <><VendorHeader title="Not Found" /><div className="p-6">Request not found</div></>;

  return (
    <>
      <VendorHeader title="Broadcast Detail" />
      <div className="p-6 max-w-4xl">
        <Link href="/provider/broadcasts" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Request details */}
        <Card className="mb-8">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">{request.title}</h2>
              {request.employer && (
                <p className="text-xs text-foreground-muted mt-1">
                  {request.employer.company_name || 'Employer'}
                  {request.employer.industry ? ` · ${request.employer.industry}` : ''}
                  {request.employer.company_size ? ` · ${request.employer.company_size} employees` : ''}
                </p>
              )}
            </div>
            <Badge color="blue">{request.status}</Badge>
          </div>
          <p className="text-foreground-muted whitespace-pre-line mb-4">{request.description}</p>
          {request.target_audience && (
            <p className="text-sm text-foreground-muted mb-4"><strong>Target Audience:</strong> {request.target_audience}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            {request.training_type && <div><span className="text-foreground-muted">Type:</span> <strong>{request.training_type === 'in_house' ? 'In-House' : 'Public'}</strong></div>}
            {request.participant_count && <div><span className="text-foreground-muted">Participants:</span> <strong>{request.participant_count} pax</strong></div>}
            {request.training_days && <div><span className="text-foreground-muted">Duration:</span> <strong>{request.training_days} day(s)</strong></div>}
            {request.preferred_mode && request.preferred_mode !== 'any' && <div><span className="text-foreground-muted">Mode:</span> <strong className="capitalize">{request.preferred_mode}</strong></div>}
            {request.preferred_location && <div><span className="text-foreground-muted">Location:</span> <strong>{request.preferred_location}</strong></div>}
            {(request.budget_min || request.budget_max) && <div><span className="text-foreground-muted">Budget:</span> <strong>{request.budget_min && request.budget_max ? `RM ${Number(request.budget_min).toLocaleString()} – RM ${Number(request.budget_max).toLocaleString()}` : request.budget_max ? `Up to RM ${Number(request.budget_max).toLocaleString()}` : `From RM ${Number(request.budget_min).toLocaleString()}`}</strong></div>}
            {request.preferred_dates && <div><span className="text-foreground-muted">Preferred Dates:</span> <strong>{request.preferred_dates}</strong></div>}
            {request.response_deadline && <div><span className="text-foreground-muted">Deadline:</span> <strong>{formatDate(request.response_deadline)}</strong></div>}
          </div>
          {request.target_skills && request.target_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {request.target_skills.map((s: string) => <Badge key={s} color="violet" size="sm">{s}</Badge>)}
            </div>
          )}
        </Card>

        {/* Proposal form */}
        {alreadySubmitted ? (
          <Card className="border-vendor-primary-light bg-vendor-primary-50">
            <p className="text-vendor-primary font-medium">You have already submitted a proposal for this request.</p>
          </Card>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-4">Submit Your Proposal</h3>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Program Selection */}
              <Card className="bg-background-subtle">
                <label className="block text-sm font-medium text-foreground mb-2">Start from an existing program or create from scratch</label>
                <Select
                  options={[
                    { value: '', label: '— Create custom proposal from scratch —' },
                    ...myPrograms.map((p: any) => ({
                      value: p.program_id,
                      label: `${p.title}${p.fee_per_pax ? ` (RM ${Number(p.fee_per_pax).toLocaleString()}/pax)` : ''}`,
                    })),
                  ]}
                  value={selectedProgramId}
                  onChange={(e) => handleProgramSelect(e.target.value)}
                />
                {selectedProgramId && (
                  <p className="text-xs text-vendor-primary mt-2">Program details loaded. Customize everything below before submitting — this will NOT change your original program.</p>
                )}
              </Card>

              {/* Proposal Message */}
              <Textarea label="Proposal Message" placeholder="Describe how your program meets the employer's needs..." value={form.proposal_message} onChange={(e) => update('proposal_message', e.target.value)} rows={4} required />

              {/* Program Details */}
              <section>
                <h4 className="text-md font-semibold text-foreground mb-3">Program Details</h4>
                <div className="space-y-4">
                  <Input label="Program Title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Advanced Leadership Masterclass" />
                  <Textarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} placeholder="Full program description..." />
                  <Textarea label="Objective / Learning Outcomes" value={form.objective} onChange={(e) => update('objective', e.target.value)} rows={3} placeholder="What participants will learn (separate with semicolons or new lines)" />
                  <Input label="Target Audience" value={form.target_group} onChange={(e) => update('target_group', e.target.value)} placeholder="e.g. Senior managers, HR professionals" />
                </div>
              </section>

              {/* Delivery & Pricing */}
              <section>
                <h4 className="text-md font-semibold text-foreground mb-3">Delivery & Pricing</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select label="Delivery Mode" options={MODES} value={form.delivery_mode} onChange={(e) => update('delivery_mode', e.target.value)} />
                    <Input label="Duration (Days)" type="number" value={form.duration_days} onChange={(e) => update('duration_days', e.target.value)} />
                    <Input label="Duration (Hours)" type="number" value={form.duration_hours} onChange={(e) => update('duration_hours', e.target.value)} />
                  </div>

                  {/* Fee info box */}
                  {request.participant_count && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                      <p className="font-medium text-blue-800">
                        Employer requested: <strong>{request.training_type === 'in_house' ? 'In-House' : 'Public'}</strong> training for <strong>{request.participant_count}</strong> participant{request.participant_count > 1 ? 's' : ''}, <strong>{request.training_days || '—'}</strong> day(s)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {request.training_type === 'in_house'
                          ? `Provide your per-day group rate. Total = daily rate x ${request.training_days || 1} day(s).`
                          : `Provide per-person rate. Total = rate x ${request.participant_count} participants.`}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Fee Per Pax (RM)" type="number" value={form.fee_per_pax} onChange={(e) => {
                      const pax = Number(e.target.value) || 0;
                      const group = Number(form.fee_per_group) || 0;
                      const count = request.participant_count || 1;
                      const days = request.training_days || 1;
                      const isInHouse = request.training_type === 'in_house';
                      const total = isInHouse ? (group ? group * days : pax * count) : (pax ? pax * count : group * days);
                      setForm((f) => ({ ...f, fee_per_pax: e.target.value, proposed_total: total > 0 ? String(total) : f.proposed_total }));
                    }} placeholder="e.g. 1500" />
                    <Input label="Fee Per Group / Per Day (RM)" type="number" value={form.fee_per_group} onChange={(e) => {
                      const pax = Number(form.fee_per_pax) || 0;
                      const group = Number(e.target.value) || 0;
                      const count = request.participant_count || 1;
                      const days = request.training_days || 1;
                      const isInHouse = request.training_type === 'in_house';
                      const total = isInHouse ? (group ? group * days : pax * count) : (pax ? pax * count : group * days);
                      setForm((f) => ({ ...f, fee_per_group: e.target.value, proposed_total: total > 0 ? String(total) : f.proposed_total }));
                    }} placeholder="e.g. 5000 per day" />
                  </div>

                  {/* Total — auto-calculated but editable */}
                  {(() => {
                    const pax = Number(form.fee_per_pax) || 0;
                    const group = Number(form.fee_per_group) || 0;
                    const count = request.participant_count || 1;
                    const days = request.training_days || 1;
                    const isInHouse = request.training_type === 'in_house';
                    const calculated = isInHouse ? (group ? group * days : pax * count) : (pax ? pax * count : group * days);
                    const calcText = isInHouse
                      ? group ? `RM ${group.toLocaleString()}/day x ${days} day(s) = RM ${calculated.toLocaleString()}` : pax ? `RM ${pax.toLocaleString()}/pax x ${count} pax = RM ${calculated.toLocaleString()}` : ''
                      : pax ? `RM ${pax.toLocaleString()}/pax x ${count} pax = RM ${calculated.toLocaleString()}` : group ? `RM ${group.toLocaleString()}/day x ${days} day(s) = RM ${calculated.toLocaleString()}` : '';
                    return (
                      <div className="rounded-lg border border-vendor-primary/30 bg-vendor-primary/5 px-4 py-3">
                        <Input
                          label="Total Proposed Fee (RM)"
                          type="number"
                          value={form.proposed_total}
                          onChange={(e) => update('proposed_total', e.target.value)}
                          placeholder="Auto-calculated, but you can adjust"
                        />
                        {calcText && (
                          <p className="text-xs text-foreground-muted mt-1">Auto-calculated: {calcText}</p>
                        )}
                        <p className="text-xs text-vendor-primary mt-1">You can adjust this total to match the employer's budget or your pricing strategy.</p>
                      </div>
                    );
                  })()}

                  {/* Training dates */}
                  {request.preferred_dates && (
                    <p className="text-xs text-foreground-muted">Employer's preferred dates: <strong>{request.preferred_dates}</strong></p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Proposed Start Date" type="date" value={form.proposed_start_date} onChange={(e) => update('proposed_start_date', e.target.value)} />
                    <Input label="Proposed End Date" type="date" value={form.proposed_end_date} onChange={(e) => update('proposed_end_date', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Language" value={form.language} onChange={(e) => update('language', e.target.value)} />
                    <Input label="Max Participants" type="number" value={form.max_participants} onChange={(e) => update('max_participants', e.target.value)} />
                    <Input label="Location" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Kuala Lumpur" />
                  </div>
                </div>
              </section>

              {/* Training Modules / Agenda */}
              <section>
                <h4 className="text-md font-semibold text-foreground mb-2">Training Modules / Agenda</h4>
                <p className="text-xs text-foreground-muted mb-3">Day-by-day breakdown of training modules for this proposal.</p>

                {agenda.map((day, di) => (
                  <div key={di} className="mb-4 rounded-lg border border-border bg-background-subtle p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-vendor-primary text-white w-8 h-8 flex items-center justify-center text-sm font-bold">D{day.day}</span>
                        <span className="text-sm font-semibold text-foreground">Day {day.day}</span>
                      </div>
                      <button type="button" onClick={() => setAgenda(agenda.filter((_, i) => i !== di))} className="text-foreground-muted hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-2 ml-11">
                      {day.slots.map((slot, si) => (
                        <div key={si} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${slot.is_break ? 'bg-amber-50 border border-amber-200' : 'bg-background-paper border border-border'}`}>
                          {slot.is_break ? <Coffee className="h-4 w-4 text-amber-500 flex-shrink-0" /> : <GripVertical className="h-4 w-4 text-foreground-subtle flex-shrink-0" />}
                          <input type="text" value={slot.module_title} onChange={(e) => { const u = [...agenda]; u[di].slots[si].module_title = e.target.value; setAgenda(u); }} placeholder={slot.is_break ? 'Break name' : 'Module title'} className="flex-1 border-0 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-foreground-muted" />
                          <button type="button" onClick={() => { const u = [...agenda]; u[di].slots = u[di].slots.filter((_, i) => i !== si); setAgenda(u); }} className="text-foreground-muted hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button type="button" onClick={() => { const u = [...agenda]; u[di].slots.push({ module_title: '', is_break: false }); setAgenda(u); }} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-foreground-muted hover:border-vendor-primary hover:text-vendor-primary"><Plus className="h-3 w-3" /> Module</button>
                        {BREAK_PRESETS.map((bp) => (
                          <button key={bp} type="button" onClick={() => { const u = [...agenda]; u[di].slots.push({ module_title: bp, is_break: true }); setAgenda(u); }} className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50"><Coffee className="h-3 w-3" /> {bp}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setAgenda([...agenda, { day: agenda.length + 1, slots: [] }])} leftIcon={<Plus className="h-4 w-4" />}>Add Day</Button>
              </section>

              {/* Trainer Details */}
              <section>
                <h4 className="text-md font-semibold text-foreground mb-3">Trainer Details</h4>
                <Textarea placeholder="Trainer qualifications, experience, certifications..." value={form.trainer_details} onChange={(e) => update('trainer_details', e.target.value)} rows={3} />

                {/* Trainer Document Uploads */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Trainer Documents</label>
                  <p className="text-xs text-foreground-muted mb-3">Upload trainer CVs, certifications, or supporting documents (PDF, DOC, DOCX, JPG, PNG — max 10MB each)</p>
                  {trainerDocs.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {trainerDocs.map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background-subtle px-3 py-2">
                          {doc.file_type === 'application/pdf' ? <FileText className="h-5 w-5 text-red-500 flex-shrink-0" /> : <File className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                            <p className="text-xs text-foreground-muted">{formatFileSize(doc.file_size)}</p>
                          </div>
                          <button type="button" onClick={() => removeFile(i)} className="flex-shrink-0 rounded p-1 text-foreground-muted hover:text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={uploading} leftIcon={<Upload className="h-4 w-4" />}>
                    {uploading ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                </div>
              </section>

              {/* Value Add */}
              <Textarea label="Value-Add Offers" placeholder="e.g. Free coaching session, post-training support..." value={form.value_add_offers} onChange={(e) => update('value_add_offers', e.target.value)} rows={2} />

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" portal="vendor" isLoading={submitting} size="lg">Submit Proposal</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
