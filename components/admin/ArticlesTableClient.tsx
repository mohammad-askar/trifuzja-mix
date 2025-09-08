'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
// أو احذف الاستيراد واستبدل التأكيد بـ window.confirm

interface Row {
  id: string;
  slug: string;
  title: string;
  page: string;
  status: 'draft' | 'published';
  createdAt: string | null;
}

interface Props {
  locale: 'en' | 'pl';
  rows: Row[];
  pageNo: number;
  totalPages: number;
  limit: number;
  total: number;
  search: string;
  pageKey: string;
  status: string;
}

export default function ArticlesTableClient({
  locale,
  rows,
  pageNo,
  totalPages,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deleting, setDeleting] = useState<string | null>(null);

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', String(p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function deleteRow(slug: string) {
    if (!confirm(locale === 'pl' ? 'Usunąć artykuł?' : 'Delete article?')) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/articles/${slug}`, { method:'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Delete failed');
        return;
      }
      // إعادة تحميل
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="overflow-auto rounded border border-zinc-300 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2">Page</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.id}
              className="border-t border-zinc-200 dark:border-zinc-700"
            >
              <td className="px-3 py-2">
                <div className="font-medium">{r.title}</div>
                <div className="text-[10px] uppercase text-zinc-500">
                  {r.slug}
                </div>
              </td>
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
                <Link
                  href={`/${locale}/admin/articles/${r.slug}/edit`}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                >
                  {locale === 'pl' ? 'Edytuj' : 'Edit'}
                </Link>
                <Link
                  href={`/${locale}/articles/${r.slug}`}
                  className="px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded text-xs"
                  target="_blank"
                >
                  {locale === 'pl' ? 'Podgląd' : 'View'}
                </Link>
                <button
                  type="button"
                  onClick={() => deleteRow(r.slug)}
                  disabled={deleting === r.slug}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
                >
                  {deleting === r.slug
                    ? (locale === 'pl' ? 'Usuwanie…' : 'Deleting…')
                    : (locale === 'pl' ? 'Usuń' : 'Delete')}
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-center text-zinc-500 text-sm"
              >
                {locale === 'pl' ? 'Brak danych' : 'No data'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setPage(pageNo - 1)}
            disabled={pageNo <= 1}
            className="px-3 py-1 text-xs rounded border disabled:opacity-40"
          >
            ‹
          </button>
            <span className="text-xs">
            {pageNo}/{totalPages}
          </span>
          <button
            onClick={() => setPage(pageNo + 1)}
            disabled={pageNo >= totalPages}
            className="px-3 py-1 text-xs rounded border disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
