'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Archive, Copy, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { VendorHeader } from '@/components/layout/VendorHeader';
import { Button, Spinner, Pagination, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { formatCurrency, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['all', 'draft', 'pending_review', 'published', 'archived'] as const;

export default function ProviderProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const fetchPrograms = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (tab !== 'all') params.set('status', tab);
    api.get(`/programs/my-programs?${params}`).then((res: any) => {
      setPrograms(res.data || []);
      if (res.pagination) setPagination(res.pagination);
      setLoading(false);
    });
  };

  useEffect(() => { fetchPrograms(); }, [tab]);

  const handleArchive = async (id: string) => {
    const res = await api.delete(`/programs/${id}`);
    if (res.success) {
      toast.success('Program archived');
      fetchPrograms(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const handleDuplicate = async (id: string) => {
    const res = await api.post(`/programs/${id}/duplicate`);
    if (res.success) {
      toast.success('Program duplicated');
      fetchPrograms(pagination.page);
    } else {
      toast.error(res.message || 'Failed to duplicate');
    }
  };

  return (
    <>
      <VendorHeader title="Programs" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-foreground-muted">{pagination.total} programs</p>
          <div className="flex gap-2">
            <Link href="/provider/programs/import">
              <Button variant="outline" portal="vendor" leftIcon={<Upload className="h-4 w-4" />}>Bulk Import (CSV)</Button>
            </Link>
            <Link href="/provider/programs/new">
              <Button portal="vendor" leftIcon={<Plus className="h-4 w-4" />}>New Program</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t ? 'border-vendor-primary text-vendor-primary' : 'border-transparent text-foreground-muted hover:text-foreground',
              )}
            >
              {t === 'all' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : programs.length === 0 ? (
          <EmptyState title="No programs" description="Create your first training program" action={<Link href="/provider/programs/new"><Button portal="vendor">Create Program</Button></Link>} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.program_id}>
                    <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
                    <TableCell>{p.category?.name || '-'}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span></TableCell>
                    <TableCell className="capitalize">{p.delivery_mode}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {p.fee_per_pax && Number(p.fee_per_pax) > 0 && <div>{formatCurrency(Number(p.fee_per_pax))}/pax</div>}
                        {p.fee_per_group && Number(p.fee_per_group) > 0 && <div className="text-foreground-muted">{formatCurrency(Number(p.fee_per_group))}/day (in-house)</div>}
                        {(!p.fee_per_pax || Number(p.fee_per_pax) === 0) && (!p.fee_per_group || Number(p.fee_per_group) === 0) && <span>-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/provider/programs/${p.program_id}/edit`}>
                          <Button variant="ghost" size="sm" portal="vendor"><Pencil className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(p.program_id)} title="Duplicate"><Copy className="h-3.5 w-3.5 text-foreground-muted" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(p.program_id)}><Archive className="h-3.5 w-3.5 text-foreground-muted" /></Button>
                      </div>
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
      </div>
    </>
  );
}
