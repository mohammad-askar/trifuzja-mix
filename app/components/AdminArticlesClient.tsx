'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Row {
  id: string;
  slug: string;
  title: string;
  page: string;
  status: 'draft' | 'published';
  createdAt?: string;
}

interface ClientProps {
  locale: 'en' | 'pl';
  initialRows: Row[];
  total: number;
  pageNo: number;
  totalPages: number;
  limit: number;              // ✅ مُبقاة فقط للمستقبل (يمكن حذفها لو أردت)
  initialSearch: string;
  initialStatus: string;
  initialPageKey: string;
}

/**
 * AdminArticlesClient
 * واجهة تفاعلية للفلاتر + التصفح (Pagination) مبنية على SSR.
 * كل تغيير في الفلاتر يُعاد توجيهه (router.replace) مع query جديدة.
 */
export default function AdminArticlesClient({
  locale,
  initialRows,
  total,
  pageNo,
  totalPages,
  // limit,  // ← لو لا تحتاجه الآن احذفه من البارامترات
  initialSearch,
  initialStatus,
  initialPageKey,
}: ClientProps) {

  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  // حالات الفلاتر
  const [search, setSearch]   = useState(initialSearch);
  const [status, setStatus]   = useState(initialStatus);
  const [pageKey, setPageKey] = useState(initialPageKey);
  const [navigating, setNavigating] = useState(false);

  const t = useCallback(
    (en: string, pl: string) => (locale === 'pl' ? pl : en),
    [locale],
  );

  /* -------- بناء / تحديث الاستعلام -------- */
  const buildParams = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    function setOrDel(k: string, v: string) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    setOrDel('search', search.trim());
    setOrDel('status', status);
    setOrDel('pageKey', pageKey);
    return params;
  }, [search, status, pageKey, searchParams]);

  const pushQueryFirstPage = useCallback(() => {
    const params = buildParams();
    params.set('page', '1'); // العودة للصفحة الأولى عند تغيير فلتر
    setNavigating(true);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [buildParams, router, pathname]);

  // بحث (debounce)
  useEffect(() => {
    const id = setTimeout(() => {
      pushQueryFirstPage();
    }, 400);
    return () => clearTimeout(id);
  }, [search, pushQueryFirstPage]);

  // تغيّر الحالة أو الصفحة (بدون debounce)
  useEffect(() => {
    pushQueryFirstPage();
  }, [status, pageKey, pushQueryFirstPage]);

  function resetAll() {
    setSearch('');
    setStatus('');
    setPageKey('');
    setNavigating(true);
    router.replace(pathname, { scroll: false });
  }

  function goto(p: number) {
    const params = buildParams();
    params.set('page', String(p));
    setNavigating(true);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // للتلوين النشط للصفحة
  const pagesArray = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  // إنهاء حالة navigating بمجرد تغيّر أي من قيم SSR (نظرياً يتحقق عند re-render)
  useEffect(() => {
    if (navigating) {
      const timer = setTimeout(() => setNavigating(false), 150);
      return () => clearTimeout(timer);
    }
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

        {/* Page filter */}
        <div>
          <label className="block text-xs font-semibold mb-1">
            {t('Page', 'Strona')}
          </label>
          <select
            value={pageKey}
            onChange={e => setPageKey(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
          >
            <option value="">{t('All', 'Wszystko')}</option>
            <option value="multi">multi</option>
            <option value="terra">terra</option>
            <option value="daily">daily</option>
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs font-semibold mb-1">
            {t('Status', 'Status')}
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
          >
            <option value="">{t('All', 'Wszystko')}</option>
            <option value="draft">{t('Draft', 'Szkic')}</option>
            <option value="published">{t('Published', 'Opublikowany')}</option>
          </select>
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

      {/* Table */}
      <div className="overflow-auto rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left">{t('Title', 'Tytuł')}</th>
              <th className="px-3 py-2">{t('Page', 'Strona')}</th>
              <th className="px-3 py-2">{t('Status', 'Status')}</th>
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
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      r.status === 'published'
                        ? 'bg-green-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
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
                  colSpan={4}
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

      {/* Scroll to top (optional enhancement) */}
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
