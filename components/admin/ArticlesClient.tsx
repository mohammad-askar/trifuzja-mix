// المسار: /components/admin/ArticlesClient.tsx
'use client';
import { useState, useCallback } from 'react';
import type { Locale } from '@/types/core/article';

interface ArticleTableRow {
  id: string;
  slug: string;
  title: string;
  page: string;
  status: 'draft' | 'published';
  createdAt?: string;
}

interface InitialArticlesPayload {
  rows: ArticleTableRow[];
  total: number;
  totalPages: number;
  pageNo: number;
  limit: number;
}

interface ArticlesClientProps {
  locale: Locale;
  initial?: InitialArticlesPayload; // ← اجعلها اختيارية لكن ضع افتراض
}

export default function ArticlesClient({ locale, initial }: ArticlesClientProps) {
  const {
    rows: initialRows = [],
    total: initialTotal = 0,
    totalPages: initialTotalPages = 1,
    pageNo: initialPage = 1,
    limit: initialLimit = 20,
  } = initial ?? {};

  const [rows, setRows] = useState<ArticleTableRow[]>(initialRows);
  const [pageNo, setPageNo] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [total, setTotal] = useState<number>(initialTotal);
  const [limit] = useState<number>(initialLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetchPage = useCallback(async (target: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(target),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/articles/list?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');

      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPageNo(data.pageNo ?? target);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // مثال استدعاء: fetchPage(pageNo) عند التغيير
  // … اكمل UI

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>
          {total} {locale === 'pl' ? 'wyników' : 'results'}
        </span>
        <span>
          {locale === 'pl' ? 'Strona' : 'Page'} {pageNo}/{totalPages}
        </span>
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          {error}
          <button
            className="ml-3 underline"
            onClick={() => fetchPage(pageNo)}
          >
            {locale === 'pl' ? 'Ponów' : 'Retry'}
          </button>
        </div>
      )}

      {!error && rows.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm">
          {locale === 'pl' ? 'Brak danych' : 'No data'}
        </p>
      )}

      {/* جدول مصغّر */}
      <div className="overflow-auto rounded border border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2">Page</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-zinc-700">
                <td className="px-3 py-2">{r.slug}</td>
                <td className="px-3 py-2 text-center uppercase">{r.page}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    r.status === 'published'
                      ? 'bg-green-600 text-white'
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <a
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    className="text-blue-400 hover:underline"
                  >
                    {locale === 'pl' ? 'Edytuj' : 'Edit'}
                  </a>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                  {locale === 'pl' ? 'Ładowanie…' : 'Loading…'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination بسيطة */}
      <div className="flex justify-center gap-2">
        <button
          disabled={pageNo <= 1 || loading}
          onClick={() => fetchPage(pageNo - 1)}
          className="px-3 py-1 rounded border disabled:opacity-40"
        >
          ‹
        </button>
        <button
          disabled={pageNo >= totalPages || loading}
          onClick={() => fetchPage(pageNo + 1)}
          className="px-3 py-1 rounded border disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
