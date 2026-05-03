'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { api } from '@/lib/api';

const TRAINING_TYPE_OPTIONS = [
  { value: 'public', label: 'Public (send employees to a scheduled class)' },
  { value: 'in_house', label: 'In-House (trainer comes to your company)' },
];

const DELIVERY_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function NewBroadcastPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    target_audience: '',
    participant_count: '',
    training_days: '',
    training_type: 'public',
    preferred_mode: '',
    preferred_location: '',
    preferred_dates: '',
    budget_min: '',
    budget_max: '',
    industry_context: '',
    target_skills: '',
    response_deadline: '',
  });

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: any = {
      title: form.title,
      description: form.description,
      participant_count: Number(form.participant_count) || 1,
      training_days: Number(form.training_days) || 1,
      training_type: form.training_type || 'public',
      response_deadline: form.response_deadline,
    };
    if (form.target_audience) payload.target_audience = form.target_audience;
    if (form.preferred_mode) payload.preferred_mode = form.preferred_mode;
    if (form.preferred_location) payload.preferred_location = form.preferred_location;
    if (form.preferred_dates) payload.preferred_dates = form.preferred_dates;
    if (form.budget_min) payload.budget_min = Number(form.budget_min);
    if (form.budget_max) payload.budget_max = Number(form.budget_max);
    if (form.industry_context) payload.industry_context = form.industry_context;
    if (form.target_skills) payload.target_skills = form.target_skills.split(',').map((s) => s.trim()).filter(Boolean);
    const res = await api.post('/broadcast-requests', payload);
    setLoading(false);
    if (res.success) {
      toast.success('Broadcast request created!');
      router.push('/employer/broadcasts');
    } else {
      toast.error(res.message || 'Failed to create broadcast');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/employer/broadcasts" className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Broadcasts
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">Create Broadcast Request</h1>
      <p className="text-sm text-foreground-muted mb-8">Describe your training needs and all registered providers will be notified.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input label="Title" placeholder="e.g. Leadership Training for Senior Managers" value={form.title} onChange={(e) => update('title', e.target.value)} required />
        <Textarea label="Description" placeholder="Describe your training needs in detail..." value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} required />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Target Audience" placeholder="e.g. Senior Managers" value={form.target_audience} onChange={(e) => update('target_audience', e.target.value)} />
          <Input label="Number of Participants" type="number" placeholder="e.g. 20" value={form.participant_count} onChange={(e) => update('participant_count', e.target.value)} required min="1" />
          <Input label="Number of Training Days" type="number" placeholder="e.g. 3" value={form.training_days} onChange={(e) => update('training_days', e.target.value)} required min="1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Training Type" options={TRAINING_TYPE_OPTIONS} value={form.training_type} onChange={(e) => update('training_type', e.target.value)} />
          <Select label="Preferred Delivery Mode" options={DELIVERY_OPTIONS} value={form.preferred_mode} onChange={(e) => update('preferred_mode', e.target.value)} placeholder="Select mode" />
        </div>
        <Input label="Preferred Location" placeholder="e.g. Kuala Lumpur" value={form.preferred_location} onChange={(e) => update('preferred_location', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Preferred Dates" placeholder="e.g. April 2026, flexible" value={form.preferred_dates} onChange={(e) => update('preferred_dates', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Budget Min (RM)" type="number" placeholder="e.g. 5000" value={form.budget_min} onChange={(e) => update('budget_min', e.target.value)} />
          <Input label="Budget Max (RM)" type="number" placeholder="e.g. 15000" value={form.budget_max} onChange={(e) => update('budget_max', e.target.value)} />
        </div>
        <Input label="Industry Context" placeholder="e.g. Manufacturing" value={form.industry_context} onChange={(e) => update('industry_context', e.target.value)} />
        <Input label="Target Skills" placeholder="Comma-separated e.g. Leadership, Communication, Strategy" value={form.target_skills} onChange={(e) => update('target_skills', e.target.value)} />
        <Input label="Response Deadline" type="date" value={form.response_deadline} onChange={(e) => update('response_deadline', e.target.value)} />

        <div className="flex justify-end gap-3 pt-4">
          <Link href="/employer/broadcasts"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" isLoading={loading}>Broadcast Request</Button>
        </div>
      </form>
    </div>
  );
}
