// components/admin/ArticlesFiltersClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type Locale = 'en' | 'pl';

interface Props {
  locale: Locale;
  initialSearch: string;
}

export default function ArticlesFiltersClient({
  locale,
  initialSearch,
}: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  const [search, setSearch] = useState<string>(initialSearch);

  const pushQuery = useCallback(
    (sp: URLSearchParams): void => {
      const params = new URLSearchParams(sp.toString());

      // حدّث/احذف search فقط
      const q = search.trim();
      if (q) params.set('search', q);
      else params.delete('search');

      // أعد الصفحة للأولى عند تغيير البحث
      params.set('page', '1');

      const next = `${pathname}?${params.toString()}`;
      const curr = `${pathname}?${sp.toString()}`;
      if (next !== curr) {
        router.replace(next, { scroll: false });
      }
    },
    [search, pathname, router],
  );

  // debounce للبحث
  useEffect(() => {
    const id = window.setTimeout(() => {
      const sp = new URLSearchParams(searchParams?.toString() || '');
      pushQuery(sp);
    }, 400);
    return () => window.clearTimeout(id);
  }, [search, searchParams, pushQuery]);

  function resetAll(): void {
    setSearch('');
    // إزالة كل فلاتر البحث (ونترك الباقي كما هو)
    const sp = new URLSearchParams(searchParams?.toString() || '');
    sp.delete('search');
    sp.set('page', '1');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
      <div className="flex-1">
        <label className="block text-xs font-semibold mb-1">
          {locale === 'pl' ? 'Szukaj' : 'Search'}
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'pl' ? 'Tytuł lub slug…' : 'Title or slug…'}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetAll}
          className="h-10 px-4 rounded-md border text-sm
                     hover:bg-zinc-100 dark:hover:bg-zinc-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {locale === 'pl' ? 'Reset' : 'Reset'}
        </button>
      </div>
    </div>
  );
}
