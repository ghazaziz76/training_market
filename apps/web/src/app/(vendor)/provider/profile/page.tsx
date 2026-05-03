'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, X, FileText, Camera, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Button, Input, Textarea, Spinner, Card, Select, Badge } from '@/components/ui';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_HOST = API_BASE.replace(/\/api$/, '');

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

const SPECIALIZATION_OPTIONS = [
  'Leadership & Management',
  'Human Resources',
  'Sales & Marketing',
  'Finance & Accounting',
  'Information Technology',
  'Occupational Safety & Health',
  'Quality Management',
  'Project Management',
  'Communication & Soft Skills',
  'Customer Service',
  'Digital Transformation',
  'Data Analytics & AI',
  'Supply Chain & Logistics',
  'Legal & Compliance',
  'Manufacturing & Engineering',
  'Environmental & Sustainability',
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [completionPct, setCompletionPct] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    provider_name: '',
    registration_no: '',
    business_description: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    website: '',
    logo_url: '',
    year_established: '',
    specializations: [] as string[],
    accreditation_details: '',
    hrd_corp_registered_provider: false,
    hrd_corp_provider_id: '',
    hrd_corp_certificate_url: '',
  });

  useEffect(() => {
    api.get('/provider/profile').then((res: any) => {
      if (res.success && res.data) {
        const d = res.data;
        setForm({
          provider_name: d.provider_name || '',
          registration_no: d.registration_no || '',
          business_description: d.business_description || '',
          contact_person: d.contact_person || '',
          contact_email: d.contact_email || '',
          contact_phone: d.contact_phone || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          postcode: d.postcode || '',
          website: d.website || '',
          logo_url: d.logo_url || '',
          year_established: d.year_established ? String(d.year_established) : '',
          specializations: Array.isArray(d.specializations) ? d.specializations : [],
          accreditation_details: d.accreditation_details || '',
          hrd_corp_registered_provider: d.hrd_corp_registered_provider || false,
          hrd_corp_provider_id: d.hrd_corp_provider_id || '',
          hrd_corp_certificate_url: d.hrd_corp_certificate_url || '',
        });
        setCompletionPct(d.profile_completion_pct || 0);
      }
      setLoading(false);
    });
  }, []);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const uploadFile = async (file: File, onUrl: (url: string) => void, setUploading: (v: boolean) => void) => {
    setUploading(true);
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
        onUrl(json.data.file_url);
      } else {
        toast.error(json.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG or PNG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    uploadFile(file, (url) => update('logo_url', url), setUploadingLogo);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, (url) => update('hrd_corp_certificate_url', url), setUploadingCert);
    if (certInputRef.current) certInputRef.current.value = '';
  };

  const toggleSpecialization = (spec: string) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter((s) => s !== spec)
        : [...f.specializations, spec],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      ...form,
      year_established: form.year_established ? Number(form.year_established) : null,
      hrd_corp_certificate_url: form.hrd_corp_certificate_url || null,
    };
    const res = await api.put('/provider/profile', payload);
    setSaving(false);
    if (res.success) {
      toast.success('Profile updated successfully');
      if ((res.data as any)?.profile_completion_pct != null) {
        setCompletionPct((res.data as any).profile_completion_pct);
      }
    } else {
      toast.error(res.message || 'Failed to save profile');
    }
  };

  if (loading) return <><VendorHeader title="Profile" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  return (
    <>
      <VendorHeader title="Company Profile" />
      <div className="p-6 max-w-4xl">
        {/* Profile Completion Bar */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Profile Completion</span>
            <span className="text-sm font-bold text-vendor-primary">{completionPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-background-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-vendor-primary transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 80 && (
            <p className="mt-2 text-xs text-foreground-muted flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Complete your profile to build trust with employers and improve visibility.
            </p>
          )}
        </Card>

        <form onSubmit={handleSave} className="space-y-8">
          {/* ============================================================ */}
          {/* SECTION: Company Logo */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-1">Company Logo</h3>
            <p className="text-xs text-foreground-muted mb-4">
              Upload your company logo. Recommended size: <strong>200 x 200 px</strong> (square). Max 2MB. JPG or PNG.
            </p>
            <div className="flex items-center gap-5">
              {/* Logo Preview */}
              <div className="relative flex-shrink-0">
                {form.logo_url ? (
                  <div className="relative">
                    <img src={`${API_HOST}${form.logo_url}`} alt="Logo" width={96} height={96} className="h-24 w-24 rounded-lg border-2 border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => update('logo_url', '')}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-background-subtle text-foreground-muted">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png" onChange={handleLogoUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} isLoading={uploadingLogo} leftIcon={<Camera className="h-4 w-4" />}>
                  {uploadingLogo ? 'Uploading...' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <p className="mt-1 text-xs text-foreground-muted">200 x 200 px, square, JPG/PNG, max 2MB</p>
              </div>
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SECTION: Company Information */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-4">Company Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Company / Provider Name *" value={form.provider_name} onChange={(e) => update('provider_name', e.target.value)} required placeholder="e.g. Excel Training Academy Sdn Bhd" />
                <Input label="Registration No. (SSM)" value={form.registration_no} onChange={(e) => update('registration_no', e.target.value)} placeholder="e.g. 201901012345 (1234567-X)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Year Established" type="number" value={form.year_established} onChange={(e) => update('year_established', e.target.value)} placeholder="e.g. 2010" min="1900" max={new Date().getFullYear()} />
                <Input label="Website" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="e.g. https://www.yourcompany.com" />
              </div>
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SECTION: About / Business Description */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-1">About Your Company</h3>
            <p className="text-xs text-foreground-muted mb-3">
              Brief description of your company, what you do, and what makes you different. This will be visible to employers.
            </p>
            <Textarea
              value={form.business_description}
              onChange={(e) => update('business_description', e.target.value)}
              rows={5}
              placeholder="e.g. We are a leading training provider specializing in leadership development and digital transformation programs. With over 15 years of experience and 500+ corporate clients across Malaysia..."
            />
          </Card>

          {/* ============================================================ */}
          {/* SECTION: Specializations */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-1">Areas of Specialization</h3>
            <p className="text-xs text-foreground-muted mb-4">
              Select the training areas your company specializes in. This helps employers find you.
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => {
                const selected = form.specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? 'border-vendor-primary bg-vendor-primary text-white'
                        : 'border-border bg-background-paper text-foreground-muted hover:border-vendor-primary hover:text-vendor-primary'
                    }`}
                  >
                    {selected && <CheckCircle className="mr-1 -ml-0.5 inline h-3.5 w-3.5" />}
                    {spec}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SECTION: Contact Information */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-4">Contact Information</h3>
            <div className="space-y-4">
              <Input label="Contact Person" value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} placeholder="e.g. Ahmad bin Ibrahim" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Contact Email" type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} placeholder="e.g. contact@yourcompany.com" />
                <Input label="Contact Phone" value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} placeholder="e.g. +60 12-345 6789" />
              </div>
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SECTION: Address */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-4">Business Address</h3>
            <div className="space-y-4">
              <Textarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} placeholder="e.g. Level 12, Menara KL, Jalan Sultan Ismail" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Kuala Lumpur" />
                <Select label="State" options={MALAYSIAN_STATES} value={form.state} onChange={(e) => update('state', e.target.value)} />
                <Input label="Postcode" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} placeholder="e.g. 50250" maxLength={5} />
              </div>
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SECTION: Accreditation & Certifications */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-1">Accreditation & Certifications</h3>
            <p className="text-xs text-foreground-muted mb-3">
              List any accreditations, certifications, or industry memberships (e.g. ISO 9001, PSMB registered, MIM member).
            </p>
            <Textarea
              value={form.accreditation_details}
              onChange={(e) => update('accreditation_details', e.target.value)}
              rows={3}
              placeholder="e.g. ISO 9001:2015 Certified, PSMB Registered Training Provider, Member of Malaysian Institute of Management"
            />
          </Card>

          {/* ============================================================ */}
          {/* SECTION: HRD Corp */}
          {/* ============================================================ */}
          <Card>
            <h3 className="text-md font-semibold text-foreground mb-4">HRD Corp Registration</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hrd"
                  checked={form.hrd_corp_registered_provider}
                  onChange={(e) => update('hrd_corp_registered_provider', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-vendor-primary focus:ring-vendor-primary"
                />
                <label htmlFor="hrd" className="text-sm text-foreground">I am a HRD Corp Registered Training Provider</label>
              </div>

              {form.hrd_corp_registered_provider && (
                <div className="space-y-4 ml-7 pl-4 border-l-2 border-vendor-primary/20">
                  <Input
                    label="HRD Corp Provider ID"
                    value={form.hrd_corp_provider_id}
                    onChange={(e) => update('hrd_corp_provider_id', e.target.value)}
                    placeholder="e.g. TP/12345/2024"
                  />

                  {/* HRD Corp Certificate Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">HRD Corp License / Certificate</label>
                    <p className="text-xs text-foreground-muted mb-3">
                      Upload a copy of your HRD Corp registration certificate (PDF, JPG, or PNG, max 10MB).
                    </p>
                    {form.hrd_corp_certificate_url ? (
                      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                        <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800">Certificate uploaded</p>
                          <a
                            href={`${API_HOST}${form.hrd_corp_certificate_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline"
                          >
                            View uploaded certificate
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => update('hrd_corp_certificate_url', '')}
                          className="flex-shrink-0 rounded p-1 text-green-600 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input ref={certInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleCertUpload} className="hidden" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => certInputRef.current?.click()}
                          isLoading={uploadingCert}
                          leftIcon={<Upload className="h-4 w-4" />}
                        >
                          {uploadingCert ? 'Uploading...' : 'Upload Certificate'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ============================================================ */}
          {/* SAVE */}
          {/* ============================================================ */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-foreground-muted">All changes are saved when you click Save Profile.</p>
            <Button type="submit" portal="vendor" isLoading={saving} size="lg">
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
