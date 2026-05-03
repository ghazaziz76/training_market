'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { Button, Spinner, Pagination, Modal, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['all', 'pending_review', 'published', 'rejected', 'archived'] as const;

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPrograms = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (tab !== 'all') params.set('status', tab);
    api.get(`/admin/programs?${params}`).then((res: any) => {
      setPrograms(res.data || []);
      if (res.pagination) setPagination(res.pagination);
      setLoading(false);
    });
  };

  useEffect(() => { fetchPrograms(); }, [tab]);

  const handleApprove = async (id: string) => {
    const res = await api.put(`/admin/programs/${id}/approve`);
    if (res.success) {
      toast.success('Program approved');
      fetchPrograms(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const res = await api.put(`/admin/programs/${rejectModal}/reject`, { reason: rejectReason });
    if (res.success) {
      toast.success('Program rejected');
      fetchPrograms(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <>
      <AdminHeader title="Programs" />
      <div className="p-6">
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-admin-accent text-admin-accent' : 'border-transparent text-foreground-muted hover:text-foreground')}>
              {t === 'all' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <p className="text-sm text-foreground-muted mb-4">{pagination.total} programs</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.program_id}>
                    <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
                    <TableCell className="text-foreground-muted">{p.provider?.provider_name || '-'}</TableCell>
                    <TableCell>{p.category?.name || '-'}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span></TableCell>
                    <TableCell>{formatCurrency(p.fee)}</TableCell>
                    <TableCell className="text-foreground-muted">{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      {p.status === 'pending_review' && (
                        <div className="flex gap-1">
                          <Button size="sm" portal="admin" onClick={() => handleApprove(p.program_id)}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => setRejectModal(p.program_id)}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.total_pages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination currentPage={pagination.page} totalPages={pagination.total_pages} onPageChange={fetchPrograms} />
              </div>
            )}
          </>
        )}

        {/* Reject Modal */}
        <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Program" size="md">
          <Textarea label="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Explain why this program is being rejected..." />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject}>Reject Program</Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
