// app/components/CategoriesAdminClient.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Trash2, XCircle, Edit2, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDelete from '@/app/components/ConfirmDelete';

/* ----------------------------- Types ----------------------------- */
type Category = {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type Locale = 'en' | 'pl';

/* ترجمة بسيطة حسب اللغة */
function t(locale: Locale) {
  if (locale === 'pl') {
    return {
      title: 'Zarządzaj kategoriami',
      unauthorized: 'Brak uprawnień.',
      addPlaceholder: 'Nazwa kategorii',
      addBtn: 'Dodaj',
      saveBtn: 'Zapisz',
      cancelBtn: 'Anuluj',
      noCats: 'Brak kategorii.',
      loadFail: 'Błąd ładowania',
      addFail: 'Błąd dodawania',
      addOk: 'Dodano',
      delFail: 'Błąd usuwania',
      delOk: 'Usunięto',
      editFail: 'Błąd edycji',
      editOk: 'Zaktualizowano',
      actions: 'Akcje',
      nameCol: 'Nazwa',
      confirmTitle: 'Potwierdź usunięcie',
      confirmMsg: (n: string) => `Usunąć kategorię: ${n}?`,
      confirm: 'Tak, usuń',
      cancel: 'Anuluj',
      nameRequired: 'Wprowadź nazwę',
    };
  }
  return {
    title: 'Manage Categories',
    unauthorized: 'Unauthorized',
    addPlaceholder: 'Category name',
    addBtn: 'Add',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    noCats: 'No categories yet.',
    loadFail: 'Failed to load',
    addFail: 'Add failed',
    addOk: 'Added',
    delFail: 'Delete failed',
    delOk: 'Deleted',
    editFail: 'Edit failed',
    editOk: 'Updated',
    actions: 'Actions',
    nameCol: 'Name',
    confirmTitle: 'Confirm deletion',
    confirmMsg: (n: string) => `Delete category: ${n}?`,
    confirm: 'Yes, delete',
    cancel: 'Cancel',
    nameRequired: 'Enter a name',
  };
}

export default function CategoriesAdminClient({ locale = 'en' }: { locale?: Locale }) {
  const { data: session } = useSession();
  const tr = t(locale);

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // نموذج الإضافة (حقل واحد)
  const [name, setName] = useState<string>('');

  // حالة التعديل
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // تأكيد الحذف
  const [modalId, setModalId] = useState<string | null>(null);

  /* ---------------------------- Load ---------------------------- */
  const loadCats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Array<{
        _id: string;
        name: unknown;
        slug?: string;
        createdAt?: string;
        updatedAt?: string;
      }>;

      // نضمن أن name دائمًا string (لو عندك بيانات قديمة {en,pl} نأخذ أول قيمة نصية)
      const normalized: Category[] = data.map((d) => {
        let nm = '';
        if (typeof d.name === 'string') nm = d.name;
        else if (d.name && typeof d.name === 'object') {
          const first = Object.values(d.name as Record<string, unknown>).find(
            (v) => typeof v === 'string' && v.trim(),
          );
          nm = typeof first === 'string' ? first : '';
        }
        return {
          _id: d._id,
          name: nm,
          slug: d.slug,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });

      setCats(normalized);
    } catch (e) {
      console.error(e);
      toast.error(tr.loadFail);
    } finally {
      setLoading(false);
    }
  }, [tr.loadFail]);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  /* ---------------------------- Add ----------------------------- */
  const addCat = async () => {
    if (!name.trim()) {
      toast.error(tr.nameRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // API أحادية الاسم
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || tr.addFail);
      }
      const created = (await res.json()) as Category;
      setCats((prev) => [created, ...prev]);
      setName('');
      toast.success(tr.addOk);
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || tr.addFail);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Delete --------------------------- */
  const deleteCat = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.status === 204 || res.status === 200) {
        setCats((prev) => prev.filter((c) => c._id !== id));
        toast.success(tr.delOk);
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || tr.delFail);
      }
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || tr.delFail);
    } finally {
      setLoading(false);
      setModalId(null);
    }
  };

  /* ---------------------------- Edit ---------------------------- */
  const startEditing = (cat: Category) => {
    setEditingId(cat._id);
    setEditName(cat.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      toast.error(tr.nameRequired);
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // API أحادية الاسم
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || tr.editFail);
      }
      const updated = (await res.json()) as Category;
      setCats((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      toast.success(tr.editOk);
      cancelEditing();
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || tr.editFail);
    } finally {
      setEditLoading(false);
    }
  };

  /* --------------------------- Guard ---------------------------- */
  if (!session) {
    return <p className="text-center py-20 text-zinc-400">{tr.unauthorized}</p>;
  }

  const catToDelete = modalId ? cats.find((c) => c._id === modalId) ?? null : null;

  /* ----------------------------- UI ----------------------------- */
  return (
    <main className="max-w-5xl mx-auto px-4 pt-20 pb-20">
      <Toaster position="bottom-left" />
      <h1 className="text-4xl font-bold mb-12 text-center">{tr.title}</h1>

      {/* نموذج الإضافة أو التعديل — حقل واحد فقط */}
      <div className="flex flex-col lg:flex-row gap-4 mb-12">
        {editingId ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={tr.addPlaceholder}
              disabled={editLoading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <button
              onClick={saveEdit}
              disabled={editLoading}
              className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center justify-center disabled:opacity-60"
              aria-label="Save"
            >
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={cancelEditing}
              disabled={editLoading}
              className="px-5 py-2 rounded-md bg-gray-400 hover:bg-gray-500 text-white flex items-center justify-center disabled:opacity-60"
              aria-label="Cancel"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr.addPlaceholder}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <button
              onClick={addCat}
              disabled={loading}
              className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-60"
              aria-label="Add"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      {/* جدول التصنيفات — عمود واحد للاسم */}
      <div className="rounded-xl overflow-auto shadow ring-1 ring-white/10 dark:ring-zinc-800/60">
        <table className="w-full min-w-[420px] text-left">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <th className="py-3 px-4">{tr.nameCol}</th>
              <th className="py-3 px-4 w-24">{tr.actions}</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c._id} className={i % 2 ? 'bg-zinc-900/60' : ''}>
                <td className="py-2 px-4">{c.name || '—'}</td>
                <td className="py-2 px-4 space-x-2">
                  <button
                    disabled={loading}
                    onClick={() => !loading && setModalId(c._id)}
                    className="text-red-700 hover:text-red-400 disabled:opacity-40"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    disabled={loading || editingId !== null}
                    onClick={() => startEditing(c)}
                    className="text-green-700 hover:text-green-400 disabled:opacity-40"
                    aria-label="Edit"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}

            {cats.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-zinc-400">
                  {tr.noCats}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDelete
  open={!!modalId}
  setOpen={(v) => { if (!v) setModalId(null); }}
  onConfirm={async () => {
    if (modalId) await deleteCat(modalId);
  }}
  title={tr.confirmTitle}
  message={tr.confirmMsg(catToDelete?.name || '')}
  cancelLabel={tr.cancel}
  deleteLabel={tr.confirm}
/>
    </main>
  );
}
