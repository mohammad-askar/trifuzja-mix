'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, ChevronRight } from 'lucide-react';

type Locale = 'en' | 'pl';

interface Category {
  _id: string;
  name: { en: string; pl: string };
}

/* ---------- component ---------- */
export default function CategoriesPublicClient({ locale }: { locale: Locale }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-12 text-center tracking-wide">
        {locale === 'pl' ? 'Kategorie' : 'Categories'}
      </h1>

      {loading ? (
        <p className="text-center text-zinc-400">Loading…</p>
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
                  style={{
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }}
                />

                {/* محتوى البطاقة */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-6 h-6 shrink-0 text-white/90" />
                    <span className="text-lg font-medium text-white drop-shadow-sm capitalize">
                      {c.name[locale]}
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
