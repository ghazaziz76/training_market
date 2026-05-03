'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { Button, Input, Modal, Spinner, EmptyState, Card } from '@/components/ui';
import { api } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = () => {
    api.get('/admin/categories').then((res) => {
      setCategories((res.data as any) || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', sort_order: '0' });
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.category_id);
    setForm({ name: cat.name, sort_order: String(cat.sort_order || 0) });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = { name: form.name, sort_order: Number(form.sort_order) };
    const res = editingId
      ? await api.put(`/admin/categories/${editingId}`, body)
      : await api.post('/admin/categories', body);
    setSaving(false);
    if (res.success) {
      toast.success(editingId ? 'Category updated' : 'Category created');
      setModalOpen(false);
      fetchCategories();
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const res = await api.delete(`/admin/categories/${id}`);
    if (res.success) {
      toast.success('Category deleted');
      fetchCategories();
    } else {
      toast.error(res.message || 'Failed');
    }
  };

  if (loading) return <><AdminHeader title="Categories" /><div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div></>;

  return (
    <>
      <AdminHeader title="Categories" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <p className="text-foreground-muted">{categories.length} categories</p>
          <Button portal="admin" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Category</Button>
        </div>

        {categories.length === 0 ? (
          <EmptyState icon={<FolderTree className="h-12 w-12" />} title="No categories" description="Add training program categories" action={<Button portal="admin" onClick={openCreate}>Add First Category</Button>} />
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <Card key={c.category_id} padding="sm" className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-foreground-muted">{c._count?.programs ?? 0} programs &middot; Sort: {c.sort_order ?? 0}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.category_id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Category' : 'Add Category'} size="sm">
          <div className="space-y-4">
            <Input label="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Sort Order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button portal="admin" size="sm" onClick={handleSave} isLoading={saving}>{editingId ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
