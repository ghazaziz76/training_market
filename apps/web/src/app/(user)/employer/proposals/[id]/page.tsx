'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, File, Star, CheckCircle, XCircle, Clock, MapPin, Users, Monitor, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Badge, Card, Spinner, Avatar } from '@/components/ui';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_HOST = API_BASE.replace(/\/api$/, '');

interface ParsedProposal {
  coverMessage: string;
  programTitle: string;
  programDescription: string;
  objective: string;
  targetAudience: string;
  deliveryMode: string;
  duration: string;
  language: string;
  maxParticipants: string;
  location: string;
  agenda: { day: number; modules: { title: string; isBreak: boolean }[] }[];
}

function parseProposalMessage(message: string): ParsedProposal {
  const result: ParsedProposal = {
    coverMessage: '',
    programTitle: '',
    programDescription: '',
    objective: '',
    targetAudience: '',
    deliveryMode: '',
    duration: '',
    language: '',
    maxParticipants: '',
    location: '',
    agenda: [],
  };

  const programSplit = message.split('--- Program Details ---');
  result.coverMessage = (programSplit[0] ?? '').trim();

  if (programSplit.length > 1) {
    const afterProgram = programSplit[1] ?? '';
    const moduleSplit = afterProgram.split('--- Training Modules ---');
    const detailsSection = moduleSplit[0] ?? '';

    for (const line of detailsSection.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Title:')) result.programTitle = trimmed.replace('Title:', '').trim();
      else if (trimmed.startsWith('Description:')) result.programDescription = trimmed.replace('Description:', '').trim();
      else if (trimmed.startsWith('Objective/Learning Outcomes:')) result.objective = trimmed.replace('Objective/Learning Outcomes:', '').trim();
      else if (trimmed.startsWith('Target Audience:')) result.targetAudience = trimmed.replace('Target Audience:', '').trim();
      else if (trimmed.startsWith('Delivery Mode:')) result.deliveryMode = trimmed.replace('Delivery Mode:', '').trim();
      else if (trimmed.startsWith('Duration:')) result.duration = trimmed.replace('Duration:', '').trim();
      else if (trimmed.startsWith('Language:')) result.language = trimmed.replace('Language:', '').trim();
      else if (trimmed.startsWith('Max Participants:')) result.maxParticipants = trimmed.replace('Max Participants:', '').trim();
      else if (trimmed.startsWith('Location:')) result.location = trimmed.replace('Location:', '').trim();
    }

    if (moduleSplit.length > 1) {
      const agendaText = (moduleSplit[1] ?? '').trim();
      const dayBlocks = agendaText.split(/Day (\d+):/);
      for (let i = 1; i < dayBlocks.length; i += 2) {
        const dayNum = parseInt(dayBlocks[i] ?? '0', 10);
        const modulesText = dayBlocks[i + 1] ?? '';
        const modules: { title: string; isBreak: boolean }[] = [];
        for (const mLine of modulesText.split('\n')) {
          const mt = mLine.trim();
          if (!mt) continue;
          if (mt.startsWith('\u2615')) {
            modules.push({ title: mt.replace('\u2615', '').trim(), isBreak: true });
          } else if (mt.startsWith('\u2022')) {
            modules.push({ title: mt.replace('\u2022', '').trim(), isBreak: false });
          }
        }
        if (modules.length > 0) {
          result.agenda.push({ day: dayNum, modules });
        }
      }
    }
  }

  return result;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/proposals/${id}`).then((res) => {
      if (res.success && res.data) setProposal(res.data);
      setLoading(false);
    });
  }, [id]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('auth-tokens');
      const accessToken = token ? JSON.parse(token).access_token : null;
      const res = await fetch(`${API_BASE}/proposals/${id}/pdf`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposal_${proposal?.provider?.provider_name?.replace(/\s+/g, '_') || 'Provider'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
    setDownloading(false);
  };

  const updateProposal = async (status: string) => {
    const action = status === 'shortlisted' ? 'shortlist' : status === 'selected' ? 'select' : 'reject';
    const res = await api.put(`/proposals/${id}/${action}`, {});
    if (res.success) {
      toast.success(`Proposal ${status}`);
      setProposal((prev: any) => ({ ...prev, status }));
    } else {
      toast.error(res.message || 'Action failed');
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!proposal) return <div className="flex min-h-[60vh] items-center justify-center"><p>Proposal not found</p></div>;

  const parsed = parseProposalMessage(proposal.proposal_message || '');
  const attachments: any[] = Array.isArray(proposal.attachments) ? proposal.attachments : [];
  const objectives = parsed.objective ? parsed.objective.split(/[;\n]|(?:- )/).map((o: string) => o.trim()).filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back link */}
      {proposal.request?.request_id ? (
        <Link href={`/employer/broadcasts/${proposal.request.request_id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Broadcast
        </Link>
      ) : proposal.enquiry?.enquiry_id ? (
        <Link href={`/employer/enquiries/${proposal.enquiry.enquiry_id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Enquiry
        </Link>
      ) : null}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={proposal.provider?.provider_name || 'P'} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{proposal.provider?.provider_name || 'Training Provider'}</h1>
            <div className="mt-1 flex items-center gap-2">
              {proposal.provider?.quality_tier && <Badge color="green" size="sm">{proposal.provider.quality_tier}</Badge>}
              {proposal.provider?.average_rating > 0 && (
                <span className="flex items-center gap-1 text-sm text-foreground-muted">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(proposal.provider.average_rating).toFixed(1)}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(proposal.status)}`}>{proposal.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} isLoading={downloading} leftIcon={<Download className="h-4 w-4" />}>
            Download PDF
          </Button>
          {proposal.status === 'submitted' && (
            <>
              <Button size="sm" onClick={() => updateProposal('shortlisted')} leftIcon={<Star className="h-3.5 w-3.5" />}>Shortlist</Button>
              <Button size="sm" variant="outline" onClick={() => updateProposal('selected')} leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>Select</Button>
              <Button size="sm" variant="ghost" onClick={() => updateProposal('rejected')} leftIcon={<XCircle className="h-3.5 w-3.5" />}>Reject</Button>
            </>
          )}
        </div>
      </div>

      {/* For request/enquiry */}
      {(proposal.request?.title || proposal.enquiry?.subject) && (
        <p className="mb-6 text-sm text-foreground-muted">
          Proposal for: <strong className="text-foreground">{proposal.request?.title || proposal.enquiry?.subject}</strong>
          {proposal.enquiry && <span className="ml-2 rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-[10px] font-semibold">via Enquiry</span>}
        </p>
      )}

      {/* Summary bar */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center py-4">
          <p className="text-xs font-medium uppercase text-foreground-muted">Total Proposed Fee</p>
          <p className="mt-1 text-xl font-bold text-foreground">{proposal.proposed_fee ? formatCurrency(Number(proposal.proposed_fee)) : 'N/A'}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs font-medium uppercase text-foreground-muted">Proposed Dates</p>
          <p className="mt-1 text-lg font-bold text-foreground">{proposal.proposed_schedule || 'N/A'}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs font-medium uppercase text-foreground-muted">Duration</p>
          <p className="mt-1 text-lg font-bold text-foreground">{parsed.duration || proposal.proposed_duration || 'N/A'}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs font-medium uppercase text-foreground-muted">Delivery</p>
          <p className="mt-1 text-lg font-bold text-foreground capitalize">{parsed.deliveryMode || 'N/A'}</p>
        </Card>
      </div>

      {/* Cover Message */}
      {parsed.coverMessage && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Proposal Message</h2>
          <p className="text-foreground-muted whitespace-pre-line">{parsed.coverMessage}</p>
        </Card>
      )}

      {/* Program Details */}
      {parsed.programTitle && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Program Details</h2>
          <h3 className="text-xl font-bold text-foreground mb-4">{parsed.programTitle}</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            {parsed.targetAudience && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Target Audience</p>
                  <p className="text-sm font-medium text-foreground">{parsed.targetAudience}</p>
                </div>
              </div>
            )}
            {parsed.deliveryMode && (
              <div className="flex items-start gap-2">
                <Monitor className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Delivery Mode</p>
                  <p className="text-sm font-medium text-foreground capitalize">{parsed.deliveryMode}</p>
                </div>
              </div>
            )}
            {parsed.duration && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Duration</p>
                  <p className="text-sm font-medium text-foreground">{parsed.duration}</p>
                </div>
              </div>
            )}
            {parsed.language && (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Language</p>
                  <p className="text-sm font-medium text-foreground">{parsed.language}</p>
                </div>
              </div>
            )}
            {parsed.maxParticipants && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Max Participants</p>
                  <p className="text-sm font-medium text-foreground">{parsed.maxParticipants}</p>
                </div>
              </div>
            )}
            {parsed.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground-muted">Location</p>
                  <p className="text-sm font-medium text-foreground">{parsed.location}</p>
                </div>
              </div>
            )}
          </div>

          {parsed.programDescription && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-1">Description</h4>
              <p className="text-sm text-foreground-muted whitespace-pre-line">{parsed.programDescription}</p>
            </div>
          )}

          {objectives.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Learning Outcomes / Objectives</h4>
              <ul className="space-y-1.5">
                {objectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground-muted">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Training Modules / Agenda */}
      {parsed.agenda.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Training Modules</h2>
          <div className="space-y-4">
            {parsed.agenda.map((day) => (
              <div key={day.day}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                    {day.day}
                  </span>
                  <span className="text-sm font-semibold text-foreground">Day {day.day}</span>
                </div>
                <div className="ml-11 space-y-1.5">
                  {day.modules.map((mod, mi) => (
                    <div
                      key={mi}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        mod.isBreak
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-gray-50 text-foreground border border-gray-200'
                      }`}
                    >
                      {mod.isBreak ? '\u2615 ' : '\u2022 '}{mod.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trainer Details */}
      {proposal.trainer_details && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Trainer Details</h2>
          <p className="text-sm text-foreground-muted whitespace-pre-line">{proposal.trainer_details}</p>
        </Card>
      )}

      {/* Supporting Documents */}
      {attachments.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Supporting Documents</h2>
          <p className="text-xs text-foreground-muted mb-4">Documents submitted by the provider with this proposal.</p>
          <div className="space-y-2">
            {attachments.map((doc: any, i: number) => (
              <a
                key={i}
                href={`${API_HOST}${doc.file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-background-subtle px-4 py-3 transition-colors hover:bg-background-paper hover:border-blue-300"
              >
                {doc.file_type === 'application/pdf' ? (
                  <FileText className="h-6 w-6 text-red-500 flex-shrink-0" />
                ) : doc.file_type?.startsWith('image/') ? (
                  <File className="h-6 w-6 text-green-500 flex-shrink-0" />
                ) : (
                  <File className="h-6 w-6 text-blue-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-foreground-muted">
                    {doc.file_type?.split('/').pop()?.toUpperCase() || 'FILE'}
                    {doc.file_size ? ` \u2022 ${formatFileSize(doc.file_size)}` : ''}
                  </p>
                </div>
                <Download className="h-4 w-4 text-foreground-muted flex-shrink-0" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Provider Info */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">About the Provider</h2>
        <div className="flex items-center gap-4">
          <Avatar name={proposal.provider?.provider_name || 'P'} size="lg" />
          <div>
            <p className="font-semibold text-foreground">{proposal.provider?.provider_name}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-foreground-muted">
              {proposal.provider?.quality_tier && <Badge color="green" size="sm">{proposal.provider.quality_tier}</Badge>}
              {proposal.provider?.average_rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(proposal.provider.average_rating).toFixed(1)} rating
                </span>
              )}
              {proposal.provider?.total_completed_programs > 0 && (
                <span>{proposal.provider.total_completed_programs} programs completed</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} isLoading={downloading} leftIcon={<Download className="h-4 w-4" />}>
          Download Full Proposal (PDF)
        </Button>
        {proposal.status === 'submitted' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateProposal('shortlisted')} leftIcon={<Star className="h-3.5 w-3.5" />}>Shortlist</Button>
            <Button size="sm" variant="outline" onClick={() => updateProposal('selected')} leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>Select</Button>
            <Button size="sm" variant="ghost" onClick={() => updateProposal('rejected')} leftIcon={<XCircle className="h-3.5 w-3.5" />}>Reject</Button>
          </div>
        )}
      </div>
    </div>
  );
}
