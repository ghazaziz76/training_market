'use client';

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Send, FileText, Upload, X } from 'lucide-react';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Card, Badge, Button, Input, Textarea, Select, Spinner, EmptyState } from '@/components/ui';
import { formatRelativeTime, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TABS = ['all', 'sent', 'read', 'replied', 'closed'] as const;

interface UploadedFile {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [sending, setSending] = useState(false);
  // Proposal form state
  const [proposalFor, setProposalFor] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    proposal_message: '',
    fee_per_pax: '',
    fee_per_group: '',
    proposed_fee: '',
    proposed_schedule: '',
    proposed_start_date: '',
    proposed_end_date: '',
    proposed_duration: '',
    trainer_details: '',
  });
  const [proposalDocs, setProposalDocs] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [myPrograms, setMyPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');

  useEffect(() => {
    api.get('/enquiries/received').then((res) => {
      setEnquiries((res.data as any) || []);
      setLoading(false);
    });
  }, []);

  const filtered = tab === 'all' ? enquiries : enquiries.filter((e) => e.status === tab);

  const handleReply = async (id: string) => {
    if (!replyMsg.trim()) return;
    setSending(true);
    const res = await api.post(`/enquiries/${id}/replies`, { message: replyMsg });
    setSending(false);
    if (res.success) {
      toast.success('Reply sent');
      setReplyTo(null);
      setReplyMsg('');
      setEnquiries((prev) => prev.map((e) => (e.enquiry_id === id ? { ...e, status: 'replied' } : e)));
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const openProposalForm = async (enquiryId: string) => {
    setProposalFor(enquiryId);
    setReplyTo(null);
    // Fetch programs for selection
    if (myPrograms.length === 0) {
      const res = await api.get('/programs/my-programs?limit=50');
      if (res.success && res.data) setMyPrograms((res.data as any).filter((p: any) => p.status === 'published' || p.status === 'draft'));
    }
  };

  const handleProgramSelect = async (programId: string) => {
    setSelectedProgramId(programId);
    if (!programId) return;
    const res = await api.get(`/programs/${programId}`);
    if (res.success && res.data) {
      const p = res.data as any;
      setProposalForm((f) => ({
        ...f,
        proposal_message: f.proposal_message || `We would like to propose our program "${p.title}" for your training needs.`,
        fee_per_pax: p.fee_per_pax ? String(p.fee_per_pax) : f.fee_per_pax,
        fee_per_group: p.fee_per_group ? String(p.fee_per_group) : f.fee_per_group,
        proposed_duration: p.duration_days ? `${p.duration_days} days` : f.proposed_duration,
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const token = localStorage.getItem('auth-tokens');
        const accessToken = token ? JSON.parse(token).access_token : null;
        const res = await fetch(`${API_BASE}/uploads`, { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, body: fd });
        const json = await res.json();
        if (json.success && json.data) setProposalDocs((prev) => [...prev, json.data]);
        else toast.error(json.message || 'Upload failed');
      } catch { toast.error('Upload failed'); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submitProposal = async (enquiryId: string) => {
    if (!proposalForm.proposal_message.trim()) { toast.error('Please fill in the proposal message'); return; }
    setSending(true);
    const pax = Number(proposalForm.fee_per_pax) || 0;
    const group = Number(proposalForm.fee_per_group) || 0;
    const total = Number(proposalForm.proposed_fee) || pax || group;

    const schedule = [
      proposalForm.proposed_start_date && proposalForm.proposed_end_date ? `${proposalForm.proposed_start_date} to ${proposalForm.proposed_end_date}` : proposalForm.proposed_start_date || '',
      proposalForm.proposed_duration || '',
    ].filter(Boolean).join(' · ') || proposalForm.proposed_schedule || '';

    const res = await api.post(`/enquiries/${enquiryId}/proposal`, {
      program_id: selectedProgramId || undefined,
      proposal_message: proposalForm.proposal_message,
      fee_per_pax: pax || undefined,
      fee_per_group: group || undefined,
      proposed_fee: total,
      proposed_schedule: schedule,
      proposed_duration: proposalForm.proposed_duration || undefined,
      trainer_details: proposalForm.trainer_details || undefined,
      attachments: proposalDocs,
    });
    setSending(false);
    if (res.success) {
      toast.success('Proposal submitted!');
      setProposalFor(null);
      setProposalForm({ proposal_message: '', fee_per_pax: '', fee_per_group: '', proposed_fee: '', proposed_schedule: '', proposed_start_date: '', proposed_end_date: '', proposed_duration: '', trainer_details: '' });
      setProposalDocs([]);
      setSelectedProgramId('');
      setEnquiries((prev) => prev.map((e) => (e.enquiry_id === enquiryId ? { ...e, status: 'replied' } : e)));
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const updatePF = (key: string, value: string) => setProposalForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <VendorHeader title="Enquiries" />
      <div className="p-6">
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize', tab === t ? 'border-vendor-primary text-vendor-primary' : 'border-transparent text-foreground-muted hover:text-foreground')}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="No enquiries" description="Enquiries from employers will appear here" />
        ) : (
          <div className="space-y-4">
            {filtered.map((e) => (
              <Card key={e.enquiry_id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{e.subject || 'General Enquiry'}</h3>
                    <p className="text-xs text-foreground-muted">
                      From: {e.requester?.full_name || 'Employer'}
                      {e.program?.title ? ` · Program: ${e.program.title}` : ''}
                      {' · '}{formatRelativeTime(e.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>{e.status}</span>
                </div>
                <p className="text-sm text-foreground mt-2">{e.message}</p>
                {e.participant_count && <p className="text-xs text-foreground-muted mt-1">Participants: {e.participant_count}</p>}
                {e.preferred_dates && <p className="text-xs text-foreground-muted">Preferred dates: {e.preferred_dates}</p>}
                {e.budget_range && <p className="text-xs text-foreground-muted">Budget: {e.budget_range}</p>}
                {e.enquiry_type && <Badge color="blue" size="sm" className="mt-2">{e.enquiry_type.replace('_', ' ')}</Badge>}

                {/* Reply form */}
                {replyTo === e.enquiry_id && (
                  <div className="mt-4 space-y-3">
                    <Textarea placeholder="Type your reply..." value={replyMsg} onChange={(ev) => setReplyMsg(ev.target.value)} rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" portal="vendor" onClick={() => handleReply(e.enquiry_id)} isLoading={sending} leftIcon={<Send className="h-3.5 w-3.5" />}>Send Reply</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyMsg(''); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Proposal form */}
                {proposalFor === e.enquiry_id && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-vendor-primary">Submit Proposal</h4>

                    {/* Program select */}
                    <Select
                      label="Start from an existing program (optional)"
                      options={[{ value: '', label: '— Custom proposal —' }, ...myPrograms.map((p: any) => ({ value: p.program_id, label: p.title }))]}
                      value={selectedProgramId}
                      onChange={(ev) => handleProgramSelect(ev.target.value)}
                    />

                    <Textarea label="Proposal Message" value={proposalForm.proposal_message} onChange={(ev) => updatePF('proposal_message', ev.target.value)} rows={4} placeholder="Describe your proposal..." />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input label="Fee Per Pax (RM)" type="number" value={proposalForm.fee_per_pax} onChange={(ev) => updatePF('fee_per_pax', ev.target.value)} placeholder="e.g. 1500" />
                      <Input label="Fee Per Group/Day (RM)" type="number" value={proposalForm.fee_per_group} onChange={(ev) => updatePF('fee_per_group', ev.target.value)} placeholder="e.g. 5000" />
                      <Input label="Total Proposed Fee (RM)" type="number" value={proposalForm.proposed_fee} onChange={(ev) => updatePF('proposed_fee', ev.target.value)} placeholder="Final total" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input label="Start Date" type="date" value={proposalForm.proposed_start_date} onChange={(ev) => updatePF('proposed_start_date', ev.target.value)} />
                      <Input label="End Date" type="date" value={proposalForm.proposed_end_date} onChange={(ev) => updatePF('proposed_end_date', ev.target.value)} />
                      <Input label="Duration" value={proposalForm.proposed_duration} onChange={(ev) => updatePF('proposed_duration', ev.target.value)} placeholder="e.g. 3 days" />
                    </div>

                    <Textarea label="Trainer Details" value={proposalForm.trainer_details} onChange={(ev) => updatePF('trainer_details', ev.target.value)} rows={2} placeholder="Trainer qualifications..." />

                    {/* Documents */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Supporting Documents</label>
                      {proposalDocs.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {proposalDocs.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs rounded border border-border px-2 py-1.5">
                              <FileText className="h-3.5 w-3.5 text-foreground-muted" />
                              <span className="flex-1 truncate">{doc.file_name}</span>
                              <button onClick={() => setProposalDocs((prev) => prev.filter((_, j) => j !== i))} className="text-foreground-muted hover:text-red-500"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading} leftIcon={<Upload className="h-3.5 w-3.5" />}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" portal="vendor" onClick={() => submitProposal(e.enquiry_id)} isLoading={sending} leftIcon={<Send className="h-3.5 w-3.5" />}>Submit Proposal</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setProposalFor(null); setProposalDocs([]); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!replyTo && !proposalFor && e.status !== 'closed' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" portal="vendor" onClick={() => { setReplyTo(e.enquiry_id); setProposalFor(null); }}>Reply</Button>
                    <Button size="sm" portal="vendor" onClick={() => openProposalForm(e.enquiry_id)} leftIcon={<FileText className="h-3.5 w-3.5" />}>Submit Proposal</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
