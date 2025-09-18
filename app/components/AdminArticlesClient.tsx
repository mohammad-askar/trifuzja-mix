// app/components/AdminArticlesClient.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Row {
  id: string;
  slug: string;
  title: string;
  page: string;          // للعرض فقط
  createdAt?: string;
}

interface ClientProps {
  locale: 'en' | 'pl';
  initialRows: Row[];
  total: number;
  pageNo: number;
  totalPages: number;
  limit: number;         // اختياري للاستخدام المستقبلي
  initialSearch: string;
}

export default function AdminArticlesClient({
  locale,
  initialRows,
  total,
  pageNo,
  totalPages,
  // limit,
  initialSearch,
}: ClientProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  // فلتر واحد فقط: البحث
  const [search, setSearch] = useState<string>(initialSearch);
  const [navigating, setNavigating] = useState<boolean>(false);

  const t = useCallback(
    (en: string, pl: string) => (locale === 'pl' ? pl : en),
    [locale],
  );

  /* ---------- بناء / تحديث الاستعلام (بحث فقط) ---------- */
  const buildParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const q = search.trim();
    if (q) params.set('search', q);
    else params.delete('search');
    return params;
  }, [search, searchParams]);

  const pushQueryFirstPage = useCallback((): void => {
    const params = buildParams();
    params.set('page', '1'); // ارجع لأول صفحة مع أي تغيير
    setNavigating(true);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [buildParams, router, pathname]);

  // بحث (debounce)
  useEffect(() => {
    const id = window.setTimeout(() => {
      pushQueryFirstPage();
    }, 400);
    return () => window.clearTimeout(id);
  }, [search, pushQueryFirstPage]);

  function resetAll(): void {
    setSearch('');
    setNavigating(true);
    router.replace(pathname, { scroll: false });
  }

  function goto(p: number): void {
    const params = buildParams();
    params.set('page', String(p));
    setNavigating(true);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const pagesArray = useMemo<number[]>(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  // إنهاء حالة الـ navigating بعد إعادة الرندر بالبيانات الجديدة
  useEffect(() => {
    if (navigating) {
      const timer = window.setTimeout(() => setNavigating(false), 150);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [navigating, initialRows, pageNo, total]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        {/* Search */}
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1">
            {t('Search', 'Szukaj')}
          </label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Title or slug…', 'Tytuł lub slug…')}
            className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
          />
        </div>

        {/* Reset */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="h-10 px-4 rounded-md border text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            disabled={navigating}
          >
            {t('Reset', 'Reset')}
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex justify-between items-center text-xs text-zinc-500">
        <div>
          {total} {t('results', 'wyników')}
          {search && (
            <>
              {' '}— {t('searched:', 'szukano:')}{' '}
              <span className="font-medium">“{search}”</span>
            </>
          )}
        </div>
        <div>
          {t('Page', 'Strona')} {pageNo}/{totalPages}
        </div>
      </div>

      {/* Table (بدون عمود Status وأي فلاتر صفحات) */}
      <div className="overflow-auto rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left">{t('Title', 'Tytuł')}</th>
              <th className="px-3 py-2">{t('Page', 'Strona')}</th>
              <th className="px-3 py-2">{t('Actions', 'Akcje')}</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map(r => (
              <tr
                key={r.id}
                className="border-t border-zinc-200 dark:border-zinc-700"
              >
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-center uppercase">{r.page}</td>
                <td className="px-3 py-2 flex gap-2 justify-center">
                  <a
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                  >
                    {t('Edit', 'Edytuj')}
                  </a>
                  <a
                    href={`/${locale}/articles/${r.slug}`}
                    className="px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded text-xs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('View', 'Podgląd')}
                  </a>
                </td>
              </tr>
            ))}
            {initialRows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-zinc-500 text-sm"
                >
                  {t('No articles', 'Brak artykułów')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {pagesArray.map(p => {
            const active = p === pageNo;
            return (
              <button
                key={p}
                onClick={() => goto(p)}
                disabled={navigating || active}
                className={`px-3 py-1 rounded border text-xs transition ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white cursor-default'
                    : 'bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                } disabled:opacity-60`}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}

      {/* Scroll to top */}
      <div className="pt-4">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {t('Back to top', 'Do góry ↑')}
        </button>
      </div>
    </div>
  );
}
