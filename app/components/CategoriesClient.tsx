'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderKanban, Trash2, Plus, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

/* ----------------------------- Types ----------------------------- */
type Locale = 'en' | 'pl';

type LegacyName = {
  en?: string;
  pl?: string;
} & Record<string, string | undefined>;

type ApiCategory = {
  _id: string;
  name: string | LegacyName;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Category = {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiError = { error?: string };

/* ----------------------- Type Guards & Utils ---------------------- */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLegacyName(v: unknown): v is LegacyName {
  if (!isRecord(v)) return false;
  // يكفينا التحقق أنه كائن ويحتوي قيم نصية اختيارياً
  return Object.values(v).every(
    (val) => typeof val === 'undefined' || typeof val === 'string',
  );
}

function isApiCategory(v: unknown): v is ApiCategory {
  if (!isRecord(v)) return false;
  const idOk = typeof v._id === 'string';
  const nameOk =
    typeof v.name === 'string' || (isRecord(v.name) && isLegacyName(v.name));
  const slugOk = typeof (v as { slug?: unknown }).slug === 'undefined' || typeof (v as { slug?: unknown }).slug === 'string';
  const createdOk =
    typeof (v as { createdAt?: unknown }).createdAt === 'undefined' ||
    typeof (v as { createdAt?: unknown }).createdAt === 'string';
  const updatedOk =
    typeof (v as { updatedAt?: unknown }).updatedAt === 'undefined' ||
    typeof (v as { updatedAt?: unknown }).updatedAt === 'string';
  return idOk && nameOk && slugOk && createdOk && updatedOk;
}

function isApiCategoryArray(v: unknown): v is ApiCategory[] {
  return Array.isArray(v) && v.every(isApiCategory);
}

/** يلتقط اسمًا نصيًا من string أو من LegacyName مع تفضيل PL ثم EN ثم أول قيمة نصية متاحة */
function normalizeName(name: string | LegacyName): string {
  if (typeof name === 'string') return name;
  if (name.pl && name.pl.trim()) return name.pl.trim();
  if (name.en && name.en.trim()) return name.en.trim();
  const anyVal = Object.values(name).find(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
  return (anyVal as string | undefined)?.trim() ?? '';
}

function normalizeCategory(api: ApiCategory): Category {
  return {
    _id: api._id,
    name: normalizeName(api.name),
    slug: api.slug,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

/* ------------------------------ i18n ------------------------------ */
const T: Record<Locale, {
  title: string;
  addPlaceholder: string;
  addBtn: string;
  empty: string;
  loadErr: string;
  addErr: string;
  addOk: string;
  delAsk: string;
  delOk: string;
  delErr: string;
}> = {
  en: {
    title: 'Manage Categories',
    addPlaceholder: 'Category name',
    addBtn: 'Add',
    empty: 'No categories yet.',
    loadErr: 'Failed to load categories',
    addErr: 'Add failed',
    addOk: 'Added!',
    delAsk: 'Delete this category?',
    delOk: 'Deleted',
    delErr: 'Delete failed',
  },
  pl: {
    title: 'Zarządzaj kategoriami',
    addPlaceholder: 'Nazwa kategorii',
    addBtn: 'Dodaj',
    empty: 'Brak kategorii.',
    loadErr: 'Błąd ładowania kategorii',
    addErr: 'Nie udało się dodać',
    addOk: 'Dodano!',
    delAsk: 'Usunąć tę kategorię?',
    delOk: 'Usunięto',
    delErr: 'Nie udało się usunąć',
  },
};

/* ----------------------------- Component ----------------------------- */
export default function CategoriesClient({ locale }: { locale: Locale }) {
  const t = T[locale];

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ---------- fetch list ---------- */
  const fetchCategories = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok || !isApiCategoryArray(json)) {
        throw new Error(t.loadErr);
      }
      setCategories(json.map(normalizeCategory));
    } catch {
      toast.error(t.loadErr);
    }
  }, [t.loadErr]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ---------- add ---------- */
  const handleAdd = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t.addErr);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok || !isApiCategory(json)) {
        const maybeErr = (json as ApiError | null)?.error;
        throw new Error(maybeErr ?? t.addErr);
      }

      setCategories((prev) => [normalizeCategory(json), ...prev]);
      setName('');
      toast.success(t.addOk);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.addErr);
    } finally {
      setAdding(false);
    }
  };

  /* ---------- delete ---------- */
  const handleDelete = async (id: string): Promise<void> => {
    if (!id) return;
    if (!confirm(t.delAsk)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!(res.status === 204 || res.ok)) {
        const json: unknown = await res.json().catch(() => null);
        const maybeErr =
          isRecord(json) && typeof (json as ApiError).error === 'string'
            ? (json as ApiError).error
            : undefined;
        throw new Error(maybeErr ?? t.delErr);
      }
      setCategories((prev) => prev.filter((c) => c._id !== id));
      toast.success(t.delOk);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.delErr);
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-8 text-center">{t.title}</h1>

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow mb-10 space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.addPlaceholder}
            className="px-4 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
            disabled={adding}
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t.addBtn}
          </button>
        </div>
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <p className="text-center text-zinc-500">{t.empty}</p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-6">
          {categories.map((c) => (
            <li
              key={c._id}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-5 rounded-xl shadow flex justify-between items-center"
            >
              <div className="flex items-start gap-3">
                <FolderKanban className="w-5 h-5 mt-1 text-blue-500" />
                <div>
                  <p className="font-semibold">{c.name || '—'}</p>
                  {c.slug && (
                    <p className="text-xs text-zinc-500 mt-0.5">{c.slug}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(c._id)}
                disabled={deletingId !== null}
                className="text-red-500 hover:text-red-400 disabled:opacity-50"
                title={t.delAsk}
              >
                <Trash2
                  className={`w-5 h-5 ${
                    deletingId === c._id ? 'animate-pulse' : ''
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
