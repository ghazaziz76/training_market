'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Select, Textarea, Spinner, Card } from '@/components/ui';
import { api } from '@/lib/api';

const INDUSTRIES = [
  'Manufacturing', 'Information Technology', 'Finance & Banking', 'Healthcare',
  'Education', 'Retail', 'Construction', 'Oil & Gas', 'Hospitality', 'Logistics',
  'Telecommunications', 'Government', 'Professional Services', 'Agriculture',
  'Real Estate', 'Media & Entertainment', 'Other',
].map((i) => ({ value: i, label: i }));

const SIZES = [
  { value: '', label: '— Select —' },
  { value: '1-50', label: '1-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1,000 employees' },
  { value: '1001+', label: '1,000+ employees' },
];

const MALAYSIAN_STATES = [
  { value: '', label: '— Select State —' },
  { value: 'Johor', label: 'Johor' },
  { value: 'Kedah', label: 'Kedah' },
  { value: 'Kelantan', label: 'Kelantan' },
  { value: 'Kuala Lumpur', label: 'Kuala Lumpur' },
  { value: 'Labuan', label: 'Labuan' },
  { value: 'Melaka', label: 'Melaka' },
  { value: 'Negeri Sembilan', label: 'Negeri Sembilan' },
  { value: 'Pahang', label: 'Pahang' },
  { value: 'Penang', label: 'Penang' },
  { value: 'Perak', label: 'Perak' },
  { value: 'Perlis', label: 'Perlis' },
  { value: 'Putrajaya', label: 'Putrajaya' },
  { value: 'Sabah', label: 'Sabah' },
  { value: 'Sarawak', label: 'Sarawak' },
  { value: 'Selangor', label: 'Selangor' },
  { value: 'Terengganu', label: 'Terengganu' },
];

export default function EmployerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completionPct, setCompletionPct] = useState(0);
  const [form, setForm] = useState({
    company_name: '',
    registration_no: '',
    industry: '',
    company_size: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    hrd_corp_registered: false,
    hrd_corp_levy_balance: '',
    training_interests: '',
  });

  useEffect(() => {
    api.get('/employer/profile').then((res: any) => {
      if (res.success && res.data) {
        const d = res.data;
        setForm({
          company_name: d.company_name || '',
          registration_no: d.registration_no || '',
          industry: d.industry || '',
          company_size: d.company_size || '',
          contact_person: d.contact_person || '',
          contact_email: d.contact_email || '',
          contact_phone: d.contact_phone || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          postcode: d.postcode || '',
          hrd_corp_registered: d.hrd_corp_registered || false,
          hrd_corp_levy_balance: d.hrd_corp_levy_balance != null ? String(d.hrd_corp_levy_balance) : '',
          training_interests: Array.isArray(d.training_interests) ? d.training_interests.join(', ') : d.training_interests || '',
        });
        setCompletionPct(d.profile_completion_pct || 0);
      }
      setLoading(false);
    });
  }, []);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      company_name: form.company_name || undefined,
      registration_no: form.registration_no || undefined,
      industry: form.industry || undefined,
      company_size: form.company_size || undefined,
      contact_person: form.contact_person || undefined,
      contact_email: form.contact_email || undefined,
      contact_phone: form.contact_phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      postcode: form.postcode || undefined,
      hrd_corp_registered: form.hrd_corp_registered,
      hrd_corp_levy_balance: form.hrd_corp_levy_balance ? Number(form.hrd_corp_levy_balance) : null,
      training_interests: form.training_interests ? form.training_interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const res = await api.put('/employer/profile', payload);
    setSaving(false);
    if (res.success) {
      toast.success('Profile updated successfully');
      if ((res.data as any)?.profile_completion_pct != null) {
        setCompletionPct((res.data as any).profile_completion_pct);
      }
    } else {
      toast.error(res.message || 'Failed to update');
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-2">Company Profile</h1>
      <p className="text-sm text-foreground-muted mb-6">Manage your company information. A complete profile helps training providers tailor proposals to your needs.</p>

      {/* Profile Completion */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Profile Completion</span>
          <span className="text-sm font-bold text-user-primary">{completionPct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-background-subtle overflow-hidden">
          <div className="h-full rounded-full bg-user-primary transition-all duration-500" style={{ width: `${completionPct}%` }} />
        </div>
        {completionPct < 80 && (
          <p className="mt-2 text-xs text-foreground-muted flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Complete your profile to get better training recommendations and proposals.
          </p>
        )}
      </Card>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Company Information */}
        <Card>
          <h3 className="text-md font-semibold text-foreground mb-4">Company Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Company Name *" value={form.company_name} onChange={(e) => update('company_name', e.target.value)} required placeholder="e.g. Syarikat ABC Sdn Bhd" />
              <Input label="Registration No. (SSM)" value={form.registration_no} onChange={(e) => update('registration_no', e.target.value)} placeholder="e.g. 201901012345 (1234567-X)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Industry" options={[{ value: '', label: '— Select Industry —' }, ...INDUSTRIES]} value={form.industry} onChange={(e) => update('industry', e.target.value)} />
              <Select label="Company Size" options={SIZES} value={form.company_size} onChange={(e) => update('company_size', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <h3 className="text-md font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="space-y-4">
            <Input label="Contact Person" value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} placeholder="e.g. Siti Aminah binti Hassan" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Contact Email" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} placeholder="e.g. hr@company.com" />
              <Input label="Contact Phone" value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} placeholder="e.g. +60 3-1234 5678" />
            </div>
          </div>
        </Card>

        {/* Business Address */}
        <Card>
          <h3 className="text-md font-semibold text-foreground mb-4">Business Address</h3>
          <div className="space-y-4">
            <Textarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} placeholder="e.g. Level 8, Menara TM, Jalan Pantai Baharu" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Kuala Lumpur" />
              <Select label="State" options={MALAYSIAN_STATES} value={form.state} onChange={(e) => update('state', e.target.value)} />
              <Input label="Postcode" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} placeholder="e.g. 59200" maxLength={5} />
            </div>
          </div>
        </Card>

        {/* HRD Corp */}
        <Card>
          <h3 className="text-md font-semibold text-foreground mb-4">HRD Corp</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hrd"
                checked={form.hrd_corp_registered}
                onChange={(e) => update('hrd_corp_registered', e.target.checked)}
                className="h-4 w-4 rounded border-border text-user-primary focus:ring-user-primary"
              />
              <label htmlFor="hrd" className="text-sm text-foreground">We are a HRD Corp Registered Employer</label>
            </div>

            {form.hrd_corp_registered && (
              <div className="ml-7 pl-4 border-l-2 border-user-primary/20 space-y-4">
                <div>
                  <Input
                    label="Annual HRD Corp Levy Balance (RM) (Estimates)"
                    type="number"
                    value={form.hrd_corp_levy_balance}
                    onChange={(e) => update('hrd_corp_levy_balance', e.target.value)}
                    placeholder="e.g. 50000"
                    min="0"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">
                    Enter your current levy balance. This helps the platform recommend programs within your budget and optimize levy utilization.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Training Interests */}
        <Card>
          <h3 className="text-md font-semibold text-foreground mb-1">Training Interests</h3>
          <p className="text-xs text-foreground-muted mb-3">What training areas is your company interested in? This helps us match you with relevant programs and providers.</p>
          <Input
            value={form.training_interests}
            onChange={(e) => update('training_interests', e.target.value)}
            placeholder="e.g. Leadership, Digital Transformation, Safety & Health, Customer Service"
          />
          <p className="mt-1 text-xs text-foreground-muted">Separate multiple interests with commas.</p>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <p className="text-xs text-foreground-muted">All changes are saved when you click Save Profile.</p>
          <Button type="submit" isLoading={saving} size="lg">Save Profile</Button>
        </div>
      </form>
    </div>
  );
}
