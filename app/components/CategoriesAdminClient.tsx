// app/components/CategoriesAdminClient.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Loader2, Trash2, XCircle, Edit2, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDelete from '@/app/components/ConfirmDelete';

type Locale = 'en' | 'pl';

interface Category {
  _id: string;
  name: { en?: string; pl?: string };
}

export default function CategoriesAdminClient({ locale = 'en' }: { locale?: Locale }) {
  const { data: session } = useSession();

  const [cats, setCats] = useState<Category[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [namePl, setNamePl] = useState('');
  const [loading, setLoading] = useState(false);

  // حوار تأكيد الحذف
  const [modalId, setModalId] = useState<string | null>(null);

  // حالة التعديل
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNamePl, setEditNamePl] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const t = useMemo(() => ({
    title:        locale === 'pl' ? 'Zarządzaj kategoriami' : 'Manage Categories',
    unauthorized: locale === 'pl' ? 'Brak uprawnień.'       : 'Unauthorized',
    empty:        locale === 'pl' ? 'Brak kategorii.'       : 'No categories.',
    needNames:    locale === 'pl' ? 'Wprowadź nazwy'        : 'Names required',
    loadFail:     locale === 'pl' ? 'Błąd ładowania'        : 'Failed to load',
    addFail:      locale === 'pl' ? 'Błąd dodawania'        : 'Add failed',
    addOk:        locale === 'pl' ? 'Dodano'                : 'Added',
    delFail:      locale === 'pl' ? 'Błąd usuwania'         : 'Delete failed',
    delOk:        locale === 'pl' ? 'Usunięto'              : 'Deleted',
    modalTitle:   locale === 'pl' ? 'Potwierdź usunięcie'   : 'Confirm deletion',
    modalQ:       locale === 'pl' ? 'Usunąć kategorię?'     : 'Delete category?',
    yes:          locale === 'pl' ? 'Tak, usuń'             : 'Yes, delete',
    no:           locale === 'pl' ? 'Anuluj'                : 'Cancel',
    edit:         locale === 'pl' ? 'Edytuj'                : 'Edit',
    save:         locale === 'pl' ? 'Zapisz'                : 'Save',
    cancel:       locale === 'pl' ? 'Anuluj'                : 'Cancel',
    editFail:     locale === 'pl' ? 'Błąd edycji'           : 'Edit failed',
    editOk:       locale === 'pl' ? 'Zaktualizowano'        : 'Updated',
  }), [locale]);

  /* ---------- جلب ---------- */
  const loadCats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error(await res.text());
      const data: Category[] = await res.json();
      setCats(data);
    } catch {
      toast.error(t.loadFail);
    } finally {
      setLoading(false);
    }
  }, [t.loadFail]);

  useEffect(() => { loadCats(); }, [loadCats]);

  /* ---------- إضافة ---------- */
  const addCat = async () => {
    if (!nameEn || !namePl) return toast.error(t.needNames);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn, namePl }), // بدون page
      });
      if (!res.ok) throw new Error(await res.text());

      const newCat: Category = await res.json();
      setCats(prev => [newCat, ...prev]);
      setNameEn('');
      setNamePl('');
      toast.success(t.addOk);
    } catch {
      toast.error(t.addFail);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- حذف (يُستدعى بعد التأكيد) ---------- */
  const deleteCat = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.status === 204 || res.status === 200) {
        setCats(prev => prev.filter(c => c._id !== id));
        toast.success(t.delOk);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Server error' }));
        toast.error(error ?? t.delFail);
      }
    } catch {
      toast.error(t.delFail);
    } finally {
      setLoading(false);
      setModalId(null);
    }
  };

  /* ---------- التعديل ---------- */
  const startEditing = (cat: Category) => {
    setEditingCatId(cat._id);
    setEditNameEn(cat.name.en ?? '');
    setEditNamePl(cat.name.pl ?? '');
  };

  const cancelEditing = () => {
    setEditingCatId(null);
    setEditNameEn('');
    setEditNamePl('');
  };

  const saveEdit = async () => {
    if (!editNameEn || !editNamePl) return toast.error(t.needNames);
    if (!editingCatId) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingCatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: editNameEn, namePl: editNamePl }), // بدون page
      });
      if (!res.ok) throw new Error(await res.text());

      const updatedCat: Category = await res.json();
      setCats(prev => prev.map(c => (c._id === updatedCat._id ? updatedCat : c)));
      toast.success(t.editOk);
      cancelEditing();
    } catch {
      toast.error(t.editFail);
    } finally {
      setEditLoading(false);
    }
  };

  if (!session) {
    return <p className="text-center py-20 text-zinc-400">{t.unauthorized}</p>;
  }

  const catToDelete = modalId ? cats.find(c => c._id === modalId) ?? null : null;

  return (
    <main className="max-w-5xl mx-auto px-4 pt-12 pb-20">
      <Toaster position="bottom-left" />

      <h1 className="text-4xl font-bold mb-12 text-center">{t.title}</h1>

      {/* نموذج الإضافة أو التعديل */}
      <div className="flex flex-col lg:flex-row gap-4 mb-12">
        {editingCatId ? (
          <>
            <input
              value={editNameEn}
              onChange={e => setEditNameEn(e.target.value)}
              placeholder="Edit Name (EN)"
              disabled={editLoading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <input
              value={editNamePl}
              onChange={e => setEditNamePl(e.target.value)}
              placeholder="Edit Name (PL)"
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
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              placeholder="Name (EN)"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <input
              value={namePl}
              onChange={e => setNamePl(e.target.value)}
              placeholder="Name (PL)"
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

      {/* جدول التصنيفات */}
      <div className="rounded-xl overflow-auto shadow ring-1 ring-white/10 dark:ring-zinc-800/60">
        <table className="w-full min-w-[520px] text-left">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <th className="py-3 px-4">EN</th>
              <th className="py-3 px-4">PL</th>
              <th className="py-3 px-4 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c._id} className={i % 2 ? 'bg-zinc-900/60' : ''}>
                <td className="py-2 px-4">{c.name.en ?? '—'}</td>
                <td className="py-2 px-4">{c.name.pl ?? '—'}</td>
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
                    disabled={loading || editingCatId !== null}
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
                <td colSpan={3} className="py-6 text-center text-zinc-400">
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ConfirmDelete بدلاً من المودال اليدوي */}
      <ConfirmDelete
        open={!!modalId}
        setOpen={(v) => setModalId(v ? modalId : null)}
        onConfirm={() => modalId && deleteCat(modalId)}
        title={t.modalTitle}
        message={
          catToDelete
            ? `${t.modalQ}\n${catToDelete.name.en ?? '—'} / ${catToDelete.name.pl ?? '—'}`
            : t.modalQ
        }
        cancelLabel={t.no}
        deleteLabel={t.yes}
      />
    </main>
  );
}
