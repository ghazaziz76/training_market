'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { Button, Badge, Input, Spinner, Pagination, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { formatDate, getStatusColor } from '@/lib/format';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLE_TABS = ['all', 'employer', 'individual', 'provider', 'admin'] as const;

const roleColor: Record<string, 'blue' | 'teal' | 'violet' | 'red'> = {
  employer: 'blue', individual: 'teal', provider: 'violet', admin: 'red',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleTab, setRoleTab] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [confirmModal, setConfirmModal] = useState<{ userId: string; action: string } | null>(null);

  const fetchUsers = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (roleTab !== 'all') params.set('role', roleTab);
    if (search) params.set('search', search);
    api.get(`/admin/users?${params}`).then((res: any) => {
      setUsers(res.data || []);
      if (res.pagination) setPagination(res.pagination);
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, [roleTab]);

  const handleStatusChange = async () => {
    if (!confirmModal) return;
    const res = await api.put(`/admin/users/${confirmModal.userId}/status`, { status: confirmModal.action });
    if (res.success) {
      toast.success(`User ${confirmModal.action}`);
      fetchUsers(pagination.page);
    } else {
      toast.error(res.message || 'Failed');
    }
    setConfirmModal(null);
  };

  return (
    <>
      <AdminHeader title="Users" />
      <div className="p-6">
        {/* Search */}
        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {ROLE_TABS.map((t) => (
            <button key={t} onClick={() => setRoleTab(t)} className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize', roleTab === t ? 'border-admin-accent text-admin-accent' : 'border-transparent text-foreground-muted hover:text-foreground')}>
              {t}
            </button>
          ))}
        </div>

        <p className="text-sm text-foreground-muted mb-4">{pagination.total} users</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-foreground-muted">{u.email}</TableCell>
                    <TableCell><Badge color={roleColor[u.role] || 'gray'} size="sm">{u.role}</Badge></TableCell>
                    <TableCell><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(u.status)}`}>{u.status}</span></TableCell>
                    <TableCell className="text-foreground-muted">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.status !== 'active' && <Button size="sm" portal="admin" onClick={() => setConfirmModal({ userId: u.user_id, action: 'active' })}>Activate</Button>}
                        {u.status !== 'suspended' && <Button size="sm" variant="ghost" onClick={() => setConfirmModal({ userId: u.user_id, action: 'suspended' })}>Suspend</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.total_pages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination currentPage={pagination.page} totalPages={pagination.total_pages} onPageChange={fetchUsers} />
              </div>
            )}
          </>
        )}

        {/* Confirmation Modal */}
        <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm Action" size="sm">
          <p className="text-sm text-foreground mb-4">
            Are you sure you want to <strong>{confirmModal?.action}</strong> this user?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button size="sm" portal="admin" onClick={handleStatusChange}>Confirm</Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
