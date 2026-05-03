'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { Button, Spinner, Pagination, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';

const TIER_OPTIONS = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'verified', label: 'Verified' },
  { value: 'trusted', label: 'Trusted' },
  { value: 'premium', label: 'Premium' },
];


export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const fetchProviders = (page = 1) => {
    setLoading(true);
    api.get(`/admin/providers?page=${page}&limit=20`).then((res: any) => {
      setProviders(res.data || []);
      if (res.pagination) setPagination(res.pagination);
      setLoading(false);
    });
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleVerify = async (id: string) => {
    const res = await api.put(`/admin/providers/${id}/verify`);
    if (res.success) {
      toast.success('Provider verified');
      fetchProviders(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const handleTierUpdate = async (providerId: string, tier: string) => {
    const res = await api.put(`/admin/tiers/${providerId}`, { quality_tier: tier });
    if (res.success) {
      toast.success('Tier updated');
      fetchProviders(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  return (
    <>
      <AdminHeader title="Providers" />
      <div className="p-6">
        <p className="text-sm text-foreground-muted mb-4">{pagination.total} providers</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Reg. No.</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.provider_id}>
                    <TableCell className="font-medium">{p.provider_name}</TableCell>
                    <TableCell className="text-foreground-muted">{p.contact_person || '-'}</TableCell>
                    <TableCell className="text-foreground-muted">{p.registration_no || '-'}</TableCell>
                    <TableCell>
                      <Select
                        options={TIER_OPTIONS}
                        value={p.quality_tier || 'unverified'}
                        onChange={(e) => handleTierUpdate(p.provider_id, e.target.value)}
                        className="w-28 text-xs"
                      />
                    </TableCell>
                    <TableCell>{p._count?.programs ?? 0}</TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span></TableCell>
                    <TableCell>
                      {p.status !== 'verified' && (
                        <Button size="sm" portal="admin" onClick={() => handleVerify(p.provider_id)}>Verify</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.total_pages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination currentPage={pagination.page} totalPages={pagination.total_pages} onPageChange={fetchProviders} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
