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
      createdCol: 'Utworzono',
      updatedCol: 'Zaktualizowano',
      confirmTitle: 'Potwierdź usunięcie',
      confirmMsg: (n: string) => `Usunąć kategorię: „${n}”?`,
      confirm: 'Tak, usuń',
      cancel: 'Anuluj',
      nameRequired: 'Wprowadź nazwę',
      edit: 'Edytuj',
      del: 'Usuń',
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
    createdCol: 'Created',
    updatedCol: 'Updated',
    confirmTitle: 'Confirm deletion',
    confirmMsg: (n: string) => `Delete category: “${n}”?`,
    confirm: 'Yes, delete',
    cancel: 'Cancel',
    nameRequired: 'Enter a name',
    edit: 'Edit',
    del: 'Delete',
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

      // نضمن أن name دائمًا string (لو قديم كان {en,pl})
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
        // API أحادية الاسم (string)
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
        // API أحادية الاسم (string)
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
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center">{tr.title}</h1>

      {/* نموذج الإضافة / التعديل — متجاوب */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row mb-8 sm:mb-12">
        {editingId ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={tr.addPlaceholder}
              disabled={editLoading}
              className="flex-1 px-4 h-11 rounded-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={saveEdit}
              disabled={editLoading}
              className="h-11 px-5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-60"
              aria-label={tr.saveBtn}
            >
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={cancelEditing}
              disabled={editLoading}
              className="h-11 px-5 rounded-md bg-zinc-500 hover:bg-zinc-600 text-white flex items-center justify-center disabled:opacity-60"
              aria-label={tr.cancelBtn}
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
              className="flex-1 px-4 h-11 rounded-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addCat}
              disabled={loading}
              className="h-11 px-5 rounded-md bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center disabled:opacity-60"
              aria-label={tr.addBtn}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      {/* ===== Desktop Table ===== */}
      <div className="hidden md:block rounded-xl overflow-auto shadow ring-1 ring-white/10 dark:ring-zinc-800/60">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <th className="py-3 px-4 text-left w-[45%]">{tr.nameCol}</th>
              <th className="py-3 px-4 text-left w-[20%]">{tr.createdCol}</th>
              <th className="py-3 px-4 text-left w-[20%]">{tr.updatedCol}</th>
              <th className="py-3 px-4 text-center w-[15%]">{tr.actions}</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900 dark:text-zinc-100">
            {cats.map((c, i) => {
              const created =
                c.createdAt ? new Date(c.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
              const updated =
                c.updatedAt ? new Date(c.updatedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
              return (
                <tr key={c._id} className={i % 2 ? 'bg-zinc-900/60' : ''}>
                  <td className="py-2 px-4">{c.name || '—'}</td>
                  <td className="py-2 px-4 text-xs text-zinc-600 dark:text-zinc-300">{created}</td>
                  <td className="py-2 px-4 text-xs text-zinc-600 dark:text-zinc-300">{updated}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        disabled={loading || editingId !== null}
                        onClick={() => startEditing(c)}
                        className="text-emerald-600 hover:text-emerald-500 disabled:opacity-40"
                        aria-label={tr.edit}
                        title={tr.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => !loading && setModalId(c._id)}
                        className="text-rose-600 hover:text-rose-500 disabled:opacity-40"
                        aria-label={tr.del}
                        title={tr.del}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {cats.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-zinc-400">
                  {tr.noCats}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile Cards ===== */}
      <div className="md:hidden grid gap-3">
        {cats.map((c) => {
          const created =
            c.createdAt ? new Date(c.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
          const updated =
            c.updatedAt ? new Date(c.updatedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

          return (
            <article key={c._id} className="rounded-xl border border-zinc-800 bg-gray-900/80 p-3 text-zinc-100">
              <h3 className="font-semibold leading-snug">{c.name || '—'}</h3>
              <p className="mt-1 text-[11px] text-zinc-400">
                {tr.createdCol}: {created} &nbsp;•&nbsp; {tr.updatedCol}: {updated}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => startEditing(c)}
                  disabled={loading || editingId !== null}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-emerald-500 disabled:opacity-40"
                  aria-label={tr.edit}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {tr.edit}
                </button>

                <button
                  onClick={() => setModalId(c._id)}
                  disabled={loading}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-rose-500 disabled:opacity-40"
                  aria-label={tr.del}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {tr.del}
                </button>
              </div>
            </article>
          );
        })}

        {cats.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-gray-900/80 p-6 text-center text-zinc-400">
            {tr.noCats}
          </div>
        )}
      </div>

      <ConfirmDelete
        open={!!modalId}
        setOpen={(v) => {
          if (!v) setModalId(null);
        }}
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
