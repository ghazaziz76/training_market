'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Button, Card, Input, Select, Textarea, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type Step = 'upload' | 'preview' | 'saving' | 'done';

interface ImportedProgram {
  index: number;
  title: string;
  description: string;
  objective: string;
  target_group: string;
  duration_days: number | null;
  duration_hours: number | null;
  fee_per_pax: number | null;
  fee_per_group: number | null;
  delivery_mode: string;
  language: string;
  category_suggestion: string;
  category_id: string;
  selected: boolean;
}

const CSV_TEMPLATE = `title,short_description,description,objective,target_group,program_type,skill_type,delivery_mode,duration_days,duration_hours,fee_per_pax,fee_per_group,early_bird_fee,city,state,max_participants,language,prerequisites,is_certification,certification_name,certification_body,hrd_corp_claimable,hrd_corp_scheme,category
"Advanced Leadership Masterclass","Strategic leadership for senior managers","Comprehensive leadership program covering strategic thinking, team management, and change leadership.","Develop strategic leadership capabilities; Lead high-performance teams; Drive organizational change","Senior Managers, Directors",public,soft_skills,physical,3,24,1800,,1500,Kuala Lumpur,Selangor,25,English,,no,,,yes,SBL-KHAS,Leadership
"Excel for Business Analytics","Hands-on Excel for data analysis","Hands-on Excel training covering pivot tables, VLOOKUP, Power Query, dashboards, and data visualization.","Master Excel for reporting; Build interactive dashboards; Automate data analysis","Finance staff, Analysts, Managers",both,technical,hybrid,2,16,800,12000,650,Petaling Jaya,Selangor,20,English,Basic Excel knowledge,no,,,yes,SBL-KHAS,Office Productivity`;

export default function ImportCSVPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [programs, setPrograms] = useState<ImportedProgram[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-programs-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth-tokens');
      const accessToken = token ? JSON.parse(token).access_token : null;

      const res = await fetch(`${API_BASE}/programs/import-csv`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });

      const json = await res.json();

      if (json.success && json.data?.programs?.length > 0) {
        setPrograms(json.data.programs);
        setStep('preview');
        toast.success(`Found ${json.data.programs.length} programs in CSV`);
        if (json.data.skipped_count > 0) {
          toast(`${json.data.skipped_count} rows skipped (no title)`, { icon: '⚠️' });
        }
      } else {
        setError(json.message || 'No programs found in the CSV');
      }
    } catch {
      setError('Failed to process the file. Please check the format.');
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  const updateProgram = (index: number, key: string, value: any) => {
    setPrograms((prev) => prev.map((p) => (p.index === index ? { ...p, [key]: value } : p)));
  };

  const toggleAll = (selected: boolean) => {
    setPrograms((prev) => prev.map((p) => ({ ...p, selected })));
  };

  const handleImport = async () => {
    const selected = programs.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.error('Please select at least one program');
      return;
    }

    setStep('saving');

    const payload = selected.map((p) => ({
      title: p.title,
      description: p.description || p.title,
      objective: p.objective,
      target_group: p.target_group,
      duration_days: p.duration_days,
      duration_hours: p.duration_hours,
      fee_per_pax: p.fee_per_pax,
      fee_per_group: p.fee_per_group,
      delivery_mode: p.delivery_mode,
      language: p.language,
      category_id: p.category_id || undefined,
    }));

    const res = await api.post('/programs/import-save', { programs: payload });

    if (res.success && res.data) {
      setResult(res.data);
      setStep('done');
      toast.success(`${(res.data as any).created_count} programs imported as drafts`);
    } else {
      toast.error((res as any).message || 'Import failed');
      setStep('preview');
    }
  };

  const selectedCount = programs.filter((p) => p.selected).length;

  return (
    <>
      <VendorHeader title="Bulk Import Programs" />
      <div className="p-6 max-w-5xl">

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Bulk Import Programs from CSV</h2>
              <p className="text-sm text-foreground-muted">Download the template, fill in your programs, then upload the CSV file.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Step 1: Download template */}
            <Card>
              <h3 className="font-semibold text-foreground mb-2">Step 1: Download the CSV Template</h3>
              <p className="text-sm text-foreground-muted mb-4">The template includes column headers and 2 example rows. Fill in your programs and save as CSV.</p>
              <Button variant="outline" portal="vendor" onClick={downloadTemplate} leftIcon={<Download className="h-4 w-4" />}>
                Download Template (CSV)
              </Button>
            </Card>

            {/* Step 2: Fill in */}
            <Card>
              <h3 className="font-semibold text-foreground mb-2">Step 2: Fill in Your Programs</h3>
              <p className="text-sm text-foreground-muted mb-3">Open the template in Excel or Google Sheets. Each row = one program.</p>
              <div className="text-xs text-foreground-muted space-y-1">
                <p><strong>Required:</strong> title, description</p>
                <p><strong>Important:</strong> program_type (public/in_house/both), delivery_mode (physical/online/hybrid), duration_days, fee_per_pax or fee_per_group, category</p>
                <p><strong>Recommended:</strong> objective, target_group, city, state, max_participants, skill_type (soft_skills/technical/both)</p>
                <p><strong>Certification:</strong> is_certification (yes/no), certification_name, certification_body</p>
                <p><strong>HRD Corp:</strong> hrd_corp_claimable (yes/no), hrd_corp_scheme</p>
                <p><strong>Optional:</strong> short_description, early_bird_fee, language, prerequisites</p>
                <p><strong>Note:</strong> Training modules/agenda can be added after import by editing each program</p>
              </div>
            </Card>

            {/* Step 3: Upload */}
            <Card className="border-2 border-dashed border-border hover:border-vendor-primary transition-colors">
              <div className="flex flex-col items-center justify-center py-8">
                <Upload className="h-10 w-10 text-foreground-muted mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Step 3: Upload Your CSV</h3>
                <p className="text-sm text-foreground-muted mb-4">Select your filled CSV file</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
                <Button portal="vendor" onClick={() => fileRef.current?.click()} leftIcon={<Upload className="h-4 w-4" />}>
                  Upload CSV File
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Review Programs</h2>
                <p className="text-sm text-foreground-muted">{programs.length} programs found. Review, assign categories, and import.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleAll(true)} className="text-xs text-vendor-primary hover:underline">Select All</button>
                <button onClick={() => toggleAll(false)} className="text-xs text-foreground-muted hover:underline">Deselect All</button>
              </div>
            </div>

            <div className="space-y-4">
              {programs.map((p) => (
                <Card key={p.index} className={`transition-all ${p.selected ? 'border-vendor-primary/30' : 'opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <label className="mt-1">
                      <input type="checkbox" checked={p.selected} onChange={(e) => updateProgram(p.index, 'selected', e.target.checked)} className="rounded" />
                    </label>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="Title" value={p.title} onChange={(e) => updateProgram(p.index, 'title', e.target.value)} />
                        <Select
                          label="Category"
                          options={[{ value: '', label: `Auto-assign${p.category_suggestion ? ` (suggested: ${p.category_suggestion})` : ''}` }, ...categories]}
                          value={p.category_id || ''}
                          onChange={(e) => updateProgram(p.index, 'category_id', e.target.value)}
                        />
                      </div>
                      <Textarea label="Description" value={p.description} onChange={(e) => updateProgram(p.index, 'description', e.target.value)} rows={2} />
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Input label="Days" type="number" value={p.duration_days ?? ''} onChange={(e) => updateProgram(p.index, 'duration_days', e.target.value ? Number(e.target.value) : null)} />
                        <Input label="Hours" type="number" value={p.duration_hours ?? ''} onChange={(e) => updateProgram(p.index, 'duration_hours', e.target.value ? Number(e.target.value) : null)} />
                        <Input label="Fee/Pax" type="number" value={p.fee_per_pax ?? ''} onChange={(e) => updateProgram(p.index, 'fee_per_pax', e.target.value ? Number(e.target.value) : null)} />
                        <Input label="Fee/Group" type="number" value={p.fee_per_group ?? ''} onChange={(e) => updateProgram(p.index, 'fee_per_group', e.target.value ? Number(e.target.value) : null)} />
                        <div className="text-xs text-foreground-muted pt-6">{p.delivery_mode} · {p.language}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-foreground-muted">{selectedCount} of {programs.length} programs selected</p>
              <div className="flex gap-3">
                <Button variant="outline" portal="vendor" onClick={() => { setStep('upload'); setPrograms([]); }}>Start Over</Button>
                <Button portal="vendor" onClick={handleImport} disabled={selectedCount === 0}>
                  Import {selectedCount} Program{selectedCount !== 1 ? 's' : ''} as Drafts
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-vendor-primary animate-spin mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Importing programs...</h2>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-12">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Import Complete!</h2>
              <p className="text-sm text-foreground-muted">
                {result.created_count} program{result.created_count !== 1 ? 's' : ''} imported as drafts.
                {result.error_count > 0 && ` ${result.error_count} failed.`}
              </p>
            </div>

            {result.errors?.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <h3 className="font-semibold text-red-800 mb-2">Errors ({result.errors.length})</h3>
                {result.errors.map((err: any, i: number) => (
                  <p key={i} className="text-sm text-red-700">{err.title || `Row ${err.index + 1}`}: {err.error}</p>
                ))}
              </Card>
            )}

            <div className="flex justify-center gap-3">
              <Button variant="outline" portal="vendor" onClick={() => { setStep('upload'); setPrograms([]); setResult(null); }}>Import More</Button>
              <Button portal="vendor" onClick={() => router.push('/provider/programs')}>Go to Programs</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
