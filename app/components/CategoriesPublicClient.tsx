'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { FolderKanban, ChevronRight } from 'lucide-react';

type Locale = 'en' | 'pl';

/* ----------------------------- Types ----------------------------- */
type LegacyName = {
  en?: string;
  pl?: string;
} & Record<string, string | undefined>;

type ApiCategory = {
  _id: string;
  name: string | LegacyName;
};

type UiCategory = {
  _id: string;
  name: { en: string; pl: string };
};

/* ------------------------ Type Guards/Utils ----------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isLegacyName(v: unknown): v is LegacyName {
  if (!isRecord(v)) return false;
  return Object.values(v).every(
    (val) => typeof val === 'undefined' || typeof val === 'string',
  );
}

function isApiCategory(v: unknown): v is ApiCategory {
  return (
    isRecord(v) &&
    typeof v._id === 'string' &&
    (typeof v.name === 'string' || isLegacyName(v.name))
  );
}

function isApiCategoryArray(v: unknown): v is ApiCategory[] {
  return Array.isArray(v) && v.every(isApiCategory);
}

/** يطبع الاسم إلى شكل ثنائي اللغة دائمًا */
function normalizeName(n: string | LegacyName): { en: string; pl: string } {
  if (typeof n === 'string') {
    const v = n.trim();
    return { en: v, pl: v };
  }
  const pl = (n.pl ?? '').trim();
  const en = (n.en ?? '').trim();
  if (pl || en) {
    return { en: en || pl, pl: pl || en };
  }
  // لو الكائن فيه مفاتيح أخرى نصية، نختار أول قيمة غير فارغة
  const first = Object.values(n).find(
    (val) => typeof val === 'string' && val.trim().length > 0,
  ) as string | undefined;
  const v = (first ?? '').trim();
  return { en: v, pl: v };
}

function normalizeCategory(c: ApiCategory): UiCategory {
  return {
    _id: c._id,
    name: normalizeName(c.name),
  };
}

/* ----------------------------- Component ----------------------------- */
export default function CategoriesPublicClient({ locale }: { locale: Locale }) {
  const [cats, setCats] = useState<UiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok || !isApiCategoryArray(json)) {
        throw new Error('Failed to load categories');
      }
      setCats(json.map(normalizeCategory));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load categories');
      setCats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-12 text-center tracking-wide">
        {locale === 'pl' ? 'Kategorie' : 'Categories'}
      </h1>

      {loading ? (
        <p className="text-center text-zinc-400">Loading…</p>
      ) : err ? (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">
            {locale === 'pl' ? 'Nie udało się wczytać kategorii.' : 'Failed to load categories.'}
          </p>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            {locale === 'pl' ? 'Spróbuj ponownie' : 'Retry'}
          </button>
        </div>
      ) : cats.length === 0 ? (
        <p className="text-center text-zinc-400">
          {locale === 'pl' ? 'Brak kategorii.' : 'No categories yet.'}
        </p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <li key={c._id}>
              <Link
                href={`/${locale}/articles?cat=${c._id}`}
                className="group block relative isolate rounded-2xl overflow-hidden shadow-lg
                           ring-1 ring-inset ring-white/10 hover:ring-blue-400 transition"
              >
                {/* الخلفية المتدرجة */}
                <div
                  className="absolute inset-0 -z-10 bg-gradient-to-br
                             from-indigo-600 via-blue-600 to-sky-600
                             dark:from-indigo-500 dark:via-blue-500 dark:to-sky-500
                             opacity-80 group-hover:opacity-100 transition"
                />

                {/* محتوى البطاقة */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-6 h-6 shrink-0 text-white/90" />
                    <span className="text-lg font-medium text-white drop-shadow-sm capitalize">
                      {c.name[locale] || c.name.en || c.name.pl || '—'}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
