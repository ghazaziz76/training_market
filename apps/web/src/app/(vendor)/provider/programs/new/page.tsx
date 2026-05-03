'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Coffee, GripVertical, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface AgendaSlot { module_title: string; description?: string; is_break?: boolean; }
interface AgendaDay { day: number; title?: string; slots: AgendaSlot[]; }

const BREAK_PRESETS = ['Morning Tea Break', 'Lunch Break', 'Afternoon Tea Break', 'Dinner Break', 'Night Break'];
const MODES = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
];
const TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'in_house', label: 'In-House' },
  { value: 'both', label: 'Both' },
];
const SKILL_TYPES = [
  { value: 'soft_skills', label: 'Soft Skills' },
  { value: 'technical', label: 'Technical' },
  { value: 'both', label: 'Both' },
];

function FileUploadButton({ label, onUrl }: { label: string; onUrl: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const token = localStorage.getItem('auth-tokens');
      const accessToken = token ? JSON.parse(token).access_token : null;
      const res = await fetch(`${API_BASE}/uploads`, { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, body: fd });
      const json = await res.json();
      if (json.success && json.data) onUrl(json.data.file_url);
      else toast.error(json.message || 'Upload failed');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
    if (ref.current) ref.current.value = '';
  };
  return (
    <>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} isLoading={uploading} leftIcon={<Upload className="h-4 w-4" />}>
        {uploading ? 'Uploading...' : label}
      </Button>
    </>
  );
}

export default function NewProgramPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [agenda, setAgenda] = useState<AgendaDay[]>([]);
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    custom_category: '',
    description: '',
    objective: '',
    target_group: '',
    short_description: '',
    prerequisites: '',
    language: 'English',
    max_participants: '',
    delivery_mode: 'physical',
    program_type: 'public',
    skill_type: 'both',
    city: '',
    state: '',
    duration_hours: '',
    duration_days: '',
    fee_per_pax: '',
    fee_per_group: '',
    is_certification: false,
    certification_name: '',
    certification_body: '',
    certification_doc_url: '',
    hrd_corp_claimable: false,
    skill_tags: '',
  });

  useEffect(() => {
    api.get('/categories').then((res: any) => {
      if (res.success && res.data) {
        const opts: { value: string; label: string }[] = [];
        res.data.forEach((c: any) => {
          opts.push({ value: c.category_id, label: c.name });
          if (c.subcategories) {
            c.subcategories.forEach((s: any) => {
              opts.push({ value: s.category_id, label: `  — ${s.name}` });
            });
          }
        });
        setCategories(opts);
      }
    });
  }, []);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (status: 'draft' | 'pending_review') => {
    if (!form.title || !form.description) {
      toast.error('Please fill in title and description');
      return;
    }
    if (!form.category_id) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);
    const payload: any = {
      title: form.title,
      category_id: form.category_id,
      description: form.description,
      program_type: form.program_type,
      delivery_mode: form.delivery_mode,
      skill_type: form.skill_type,
      language: form.language,
      is_certification: form.is_certification,
      hrd_corp_claimable: form.hrd_corp_claimable,
      status,
    };
    if (form.custom_category) payload.custom_category = form.custom_category;
    if (form.objective) payload.objective = form.objective;
    if (form.target_group) payload.target_group = form.target_group;
    if (form.short_description) payload.short_description = form.short_description;
    if (form.prerequisites) payload.prerequisites = form.prerequisites;
    if (form.max_participants) payload.max_participants = Number(form.max_participants);
    if (form.city) payload.city = form.city;
    if (form.state) payload.state = form.state;
    if (form.duration_hours) payload.duration_hours = Number(form.duration_hours);
    if (form.duration_days) payload.duration_days = Number(form.duration_days);
    if (form.fee_per_pax) payload.fee_per_pax = Number(form.fee_per_pax);
    if (form.fee_per_group) payload.fee_per_group = Number(form.fee_per_group);
    // fee field required by validator — use per_pax or per_group
    payload.fee = Number(form.fee_per_pax) || Number(form.fee_per_group) || 0;
    if (form.certification_name) payload.certification_name = form.certification_name;
    if (form.certification_body) payload.certification_body = form.certification_body;
    if (form.certification_doc_url) payload.certification_doc_url = form.certification_doc_url;
    if (form.skill_tags) payload.skill_tags = form.skill_tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (agenda.length > 0) payload.agenda = agenda;

    const res = await api.post('/programs', payload);
    setLoading(false);
    if (res.success) {
      toast.success(status === 'draft' ? 'Saved as draft' : 'Submitted for review');
      router.push('/provider/programs');
    } else {
      toast.error(res.message || 'Failed to create program');
    }
  };

  const isOther = categories.find((c) => c.value === form.category_id)?.label === 'Other';

  return (
    <>
      <VendorHeader title="New Program" />
      <div className="p-6 max-w-4xl">
        <div className="space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input label="Program Title" value={form.title} onChange={(e) => update('title', e.target.value)} required placeholder="e.g. Advanced Strategic Leadership Masterclass" />
              <Input label="Short Description" value={form.short_description} onChange={(e) => update('short_description', e.target.value)} placeholder="Brief summary (max 500 chars)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Category" options={categories} value={form.category_id} onChange={(e) => update('category_id', e.target.value)} placeholder="Select category" />
                <Select label="Program Type" options={TYPES} value={form.program_type} onChange={(e) => update('program_type', e.target.value)} />
                <Select label="Skill Type" options={SKILL_TYPES} value={form.skill_type} onChange={(e) => update('skill_type', e.target.value)} />
              </div>
              {isOther && (
                <Input label="Specify Category" value={form.custom_category} onChange={(e) => update('custom_category', e.target.value)} placeholder="e.g. Aviation, Halal Industry, Shariah Compliance" />
              )}
              <Textarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} required />
              <Textarea label="Objective / Learning Outcomes" value={form.objective} onChange={(e) => update('objective', e.target.value)} rows={4} placeholder="Separate each outcome with a semicolon or new line" />
            </div>
          </section>

          {/* Details */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Target Audience" value={form.target_group} onChange={(e) => update('target_group', e.target.value)} placeholder="e.g. Senior managers, HR professionals" />
                <Input label="Prerequisites" value={form.prerequisites} onChange={(e) => update('prerequisites', e.target.value)} placeholder="e.g. Min 3 years experience" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Language" value={form.language} onChange={(e) => update('language', e.target.value)} />
                <Input label="Max Participants" type="number" value={form.max_participants} onChange={(e) => update('max_participants', e.target.value)} />
                <Select label="Delivery Mode" options={MODES} value={form.delivery_mode} onChange={(e) => update('delivery_mode', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Kuala Lumpur" />
                <Input label="State" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="e.g. Selangor" />
              </div>
            </div>
          </section>

          {/* Duration & Pricing */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Duration & Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Duration (Days)" type="number" value={form.duration_days} onChange={(e) => update('duration_days', e.target.value)} />
                <Input label="Duration (Hours)" type="number" value={form.duration_hours} onChange={(e) => update('duration_hours', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Fee Per Pax (RM) — Public Rate" type="number" value={form.fee_per_pax} onChange={(e) => update('fee_per_pax', e.target.value)} placeholder="e.g. 1500" />
                <Input label="Fee Per Group / Per Day (RM) — In-House Rate" type="number" value={form.fee_per_group} onChange={(e) => update('fee_per_group', e.target.value)} placeholder="e.g. 5000" />
              </div>
            </div>
          </section>

          {/* Certification & HRD Corp */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Certification & HRD Corp</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.hrd_corp_claimable} onChange={(e) => update('hrd_corp_claimable', e.target.checked)} className="rounded" />
                  HRD Corp Claimable
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_certification} onChange={(e) => update('is_certification', e.target.checked)} className="rounded" />
                  Certification Program
                </label>
              </div>
              {form.is_certification && (
                <div className="space-y-3 ml-6 pl-4 border-l-2 border-vendor-primary/20">
                  <p className="text-xs text-foreground-muted">A Certification Program must be accredited by a recognized local or global awarding body. Please provide the details and upload your authorization/accreditation letter.</p>
                  <Input label="Certification Name" value={form.certification_name} onChange={(e) => update('certification_name', e.target.value)} placeholder="e.g. Lean Six Sigma Green Belt, PMP, CIPM" />
                  <Input label="Awarding / Certification Body" value={form.certification_body} onChange={(e) => update('certification_body', e.target.value)} placeholder="e.g. ASQ, PMI, HRDF, City & Guilds" />
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Authorization / Accreditation Letter</label>
                    {form.certification_doc_url ? (
                      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-800 flex-1">Document uploaded</span>
                        <button type="button" onClick={() => update('certification_doc_url', '')} className="text-green-600 hover:text-red-500"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <FileUploadButton label="Upload Document" onUrl={(url) => update('certification_doc_url', url)} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Agenda / Modules */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Training Modules / Agenda</h2>
            <p className="text-sm text-foreground-muted mb-4">Add the day-by-day breakdown of your training modules.</p>

            {agenda.map((day, di) => (
              <div key={di} className="mb-6 rounded-lg border border-border bg-background-subtle p-4">
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
            <Button type="button" variant="outline" size="sm" onClick={() => setAgenda([...agenda, { day: agenda.length + 1, title: '', slots: [] }])} leftIcon={<Plus className="h-4 w-4" />}>Add Day</Button>
          </section>

          {/* Tags */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Skill Tags</h2>
            <Input label="Skill Tags" placeholder="Comma-separated e.g. Leadership, Communication, Strategy" value={form.skill_tags} onChange={(e) => update('skill_tags', e.target.value)} />
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" portal="vendor" onClick={() => handleSubmit('draft')} isLoading={loading}>Save as Draft</Button>
            <Button portal="vendor" onClick={() => handleSubmit('published')} isLoading={loading}>Publish</Button>
          </div>
        </div>
      </div>
    </>
  );
}
