'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Input, Select, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

const EDUCATION = [
  { value: 'spm', label: 'SPM / O-Level' },
  { value: 'stpm', label: 'STPM / A-Level' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'degree', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD / Doctorate' },
  { value: 'professional', label: 'Professional Certification' },
  { value: 'other', label: 'Other' },
];

const MODES = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function IndividualProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    occupation: '',
    education_level: '',
    location: '',
    skill_interests: '',
    career_goals: '',
    preferred_training_mode: '',
  });

  useEffect(() => {
    api.get('/individual/profile').then((res: any) => {
      if (res.success && res.data) {
        setForm({
          occupation: res.data.occupation || '',
          education_level: res.data.education_level || '',
          location: res.data.location || '',
          skill_interests: Array.isArray(res.data.skill_interests) ? res.data.skill_interests.join(', ') : res.data.skill_interests || '',
          career_goals: res.data.career_goals || '',
          preferred_training_mode: res.data.preferred_training_mode || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.put('/individual/profile', {
      ...form,
      skill_interests: form.skill_interests ? form.skill_interests.split(',').map((s) => s.trim()) : [],
    });
    setSaving(false);
    if (res.success) toast.success('Profile updated');
    else toast.error(res.message || 'Failed to update');
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Occupation" placeholder="e.g. Software Engineer" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          <Select label="Education Level" options={EDUCATION} value={form.education_level} onChange={(e) => setForm({ ...form, education_level: e.target.value })} placeholder="Select level" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Location" placeholder="e.g. Penang" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Select label="Preferred Training Mode" options={MODES} value={form.preferred_training_mode} onChange={(e) => setForm({ ...form, preferred_training_mode: e.target.value })} placeholder="Select mode" />
        </div>
        <Input label="Skill Interests" placeholder="Comma-separated e.g. Python, Data Science, Public Speaking" value={form.skill_interests} onChange={(e) => setForm({ ...form, skill_interests: e.target.value })} />
        <Input label="Career Goals" placeholder="e.g. Transition to Data Science" value={form.career_goals} onChange={(e) => setForm({ ...form, career_goals: e.target.value })} />
        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>Save Profile</Button>
        </div>
      </form>
    </div>
  );
}
