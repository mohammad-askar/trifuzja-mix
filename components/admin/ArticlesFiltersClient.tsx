'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Props {
  locale: 'en' | 'pl';
  initialSearch: string;
  initialStatus: string;
  initialPageKey: string;
  initialPage: number;
  initialLimit: number;
}

export default function ArticlesFiltersClient({
  locale,
  initialSearch,
  initialStatus,
  initialPageKey,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch]     = useState(initialSearch);
  const [status, setStatus]     = useState(initialStatus);
  const [pageKey, setPageKey]   = useState(initialPageKey);

  const pushQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const setOrDelete = (k: string, v: string) => {
      if (v) params.set(k, v); else params.delete(k);
    };

    setOrDelete('search', search.trim());
    setOrDelete('status', status);
    setOrDelete('pageKey', pageKey);
    params.set('page','1'); // إعادة أول صفحة عند تغيير الفلاتر

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [search, status, pageKey, router, pathname, searchParams]);

  useEffect(() => {
    const id = setTimeout(() => pushQuery(), 400);
    return () => clearTimeout(id);
  }, [search, pushQuery]);

  useEffect(() => {
    pushQuery();
  }, [status, pageKey, pushQuery]);

  function resetAll() {
    setSearch('');
    setStatus('');
    setPageKey('');
    router.replace(pathname, { scroll: false });
  }

  const pageOptions = [
    { key: '', label: locale === 'pl' ? 'Wszystko' : 'All' },
    { key: 'multi', label: 'multi' },
    { key: 'terra', label: 'terra' },
    { key: 'daily', label: 'daily' },
  ];

  const statusOptions = [
    { key: '', label: locale === 'pl' ? 'Wszystko' : 'All' },
    { key: 'draft', label: locale === 'pl' ? 'Szkic' : 'Draft' },
    { key: 'published', label: locale === 'pl' ? 'Opublik.' : 'Published' },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
      <div className="flex-1">
        <label className="block text-xs font-semibold mb-1">
          {locale === 'pl' ? 'Szukaj' : 'Search'}
        </label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={locale === 'pl' ? 'Tytuł lub slug…' : 'Title or slug…'}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          {locale === 'pl' ? 'Strona' : 'Page'}
        </label>
        <select
          value={pageKey}
          onChange={e => setPageKey(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
        >
          {pageOptions.map(p => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          {locale === 'pl' ? 'Status' : 'Status'}
        </label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900"
        >
          {statusOptions.map(s => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetAll}
          className="h-10 px-4 rounded-md border text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {locale === 'pl' ? 'Reset' : 'Reset'}
        </button>
      </div>
    </div>
  );
}
