'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Trash2, X, Edit2, Check, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { PAGES, PageKey } from '@/types/constants/pages';

type Locale = 'en' | 'pl';
interface Category {
  _id:  string;
  page: PageKey;
  name: { en?: string; pl?: string };
}

export default function CategoriesAdminClient({ locale = 'en' }: { locale?: Locale }) {
  const { data: session } = useSession();

  const [cats, setCats]        = useState<Category[]>([]);
  const [nameEn, setNameEn]    = useState('');
  const [namePl, setNamePl]    = useState('');
  const [pageKey, setPage]     = useState<PageKey>('multi');
  const [loading, setLoading]  = useState(false);
  const [modalId, setModalId]  = useState<string | null>(null);

  // للحالة عند التعديل
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNamePl, setEditNamePl] = useState('');
  const [editPageKey, setEditPageKey] = useState<PageKey>('multi');
  const [editLoading, setEditLoading] = useState(false);

  const t = {
    title:        locale === 'pl' ? 'Zarządzaj kategoriami' : 'Manage Categories',
    unauthorized: locale === 'pl' ? 'Brak uprawnień.'       : 'Unauthorized',
    empty:        locale === 'pl' ? 'Brak kategorii.'       : 'No categories.',
    needNames:    locale === 'pl' ? 'Wprowadź nazwy'        : 'Names required',
    loadFail:     locale === 'pl' ? 'Błąd ładowania'        : 'Failed to load',
    addFail:      locale === 'pl' ? 'Błąd dodawania'        : 'Add failed',
    addOk:        locale === 'pl' ? 'Dodano'                : 'Added',
    delFail:      locale === 'pl' ? 'Błąd usuwania'         : 'Delete failed',
    delOk:        locale === 'pl' ? 'Usunięto'              : 'Deleted',
    modalQ:       locale === 'pl' ? 'Usunąć kategorię?'     : 'Delete category?',
    yes:          locale === 'pl' ? 'Tak, usuń'             : 'Yes, delete',
    no:           locale === 'pl' ? 'Anuluj'                : 'Cancel',
    edit:         locale === 'pl' ? 'Edytuj'                : 'Edit',
    save:         locale === 'pl' ? 'Zapisz'                : 'Save',
    cancel:       locale === 'pl' ? 'Anuluj'                : 'Cancel',
    editFail:     locale === 'pl' ? 'Błąd edycji'           : 'Edit failed',
    editOk:       locale === 'pl' ? 'Zaktualizowano'        : 'Updated',
  } as const;

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
        body: JSON.stringify({ nameEn, namePl, page: pageKey }),
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

  /* ---------- حذف ---------- */
  const deleteCat = async (id: string) => {
    if (loading) return;
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

  /* ---------- بدء التعديل ---------- */
  const startEditing = (cat: Category) => {
    setEditingCatId(cat._id);
    setEditNameEn(cat.name.en ?? '');
    setEditNamePl(cat.name.pl ?? '');
    setEditPageKey(cat.page);
  };

  /* ---------- إلغاء التعديل ---------- */
  const cancelEditing = () => {
    setEditingCatId(null);
    setEditNameEn('');
    setEditNamePl('');
    setEditPageKey('multi');
  };

  /* ---------- حفظ التعديل ---------- */
  const saveEdit = async () => {
    if (!editNameEn || !editNamePl) return toast.error(t.needNames);
    if (!editingCatId) return;

    setEditLoading(true);

    try {
      const res = await fetch(`/api/admin/categories/${editingCatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: editNameEn, namePl: editNamePl, page: editPageKey }),
      });

      if (!res.ok) throw new Error(await res.text());

      const updatedCat: Category = await res.json();
      setCats(prev => prev.map(c => c._id === updatedCat._id ? updatedCat : c));
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
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            />
            <input
              value={editNamePl}
              onChange={e => setEditNamePl(e.target.value)}
              placeholder="Edit Name (PL)"
              disabled={editLoading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            />
            <select
              value={editPageKey}
              onChange={e => setEditPageKey(e.target.value as PageKey)}
              disabled={editLoading}
              className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            >
              {PAGES.map(p => (
                <option key={p.key} value={p.key}>{p.labelEn}</option>
              ))}
            </select>
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
              className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-500 text-white flex items-center justify-center disabled:opacity-60"
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
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            />
            <input
              value={namePl}
              onChange={e => setNamePl(e.target.value)}
              placeholder="Name (PL)"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            />
            <select
              value={pageKey}
              onChange={e => setPage(e.target.value as PageKey)}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-200 focus:ring-blue-500"
            >
              {PAGES.map(p => (
                <option key={p.key} value={p.key}>{p.labelEn}</option>
              ))}
            </select>
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
      <div className="rounded-xl overflow-auto shadow ring-1 ring-white/40">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <th className="py-3 px-4">EN</th>
              <th className="py-3 px-4">PL</th>
              <th className="py-3 px-4">Page</th>
              <th className="py-3 px-4 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c._id} className={i % 2 ? 'bg-zinc-900/60' : ''}>
                <td className="py-2 px-4">{c.name.en ?? '—'}</td>
                <td className="py-2 px-4">{c.name.pl ?? '—'}</td>
                <td className="py-2 px-4 uppercase">{c.page}</td>
                <td className="py-2 px-4 space-x-2">
                  <button
                    disabled={loading}
                    onClick={() => !loading && setModalId(c._id)}
                    className="text-red-500 hover:text-red-400 disabled:opacity-40"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    disabled={loading || editingCatId !== null}
                    onClick={() => startEditing(c)}
                    className="text-blue-500 hover:text-blue-400 disabled:opacity-40"
                    aria-label="Edit"
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}

            {cats.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-zinc-400">
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal تأكيد الحذف */}
      {modalId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-zinc-800 rounded-xl p-6 w-80 text-center space-y-6">
            <p className="text-lg">{t.modalQ}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => deleteCat(modalId)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t.yes}
              </button>
              <button
                onClick={() => setModalId(null)}
                className="px-4 py-2 bg-red-600 text-white dark:bg-zinc-900 rounded-md hover:bg-red-700"
              >
                {t.no}
              </button>
            </div>
            <button
              onClick={() => setModalId(null)}
              className="absolute top-3 right-3  dark:bg-zinc-900 hover:text-zinc-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
