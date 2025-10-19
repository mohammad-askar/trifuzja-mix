// E:\trifuzja-mix\components\admin\ArticlesTableClient.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';

/* ---------- Types ---------- */
type Locale = 'en' | 'pl';

interface Row {
  id: string;
  slug: string;
  title: string;
  createdAt: string | null;
}

interface Props {
  locale: Locale;
  rows: Row[];
  pageNo: number;
  totalPages: number;
}

/* ---------- Helpers ---------- */
function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function PublishedBadge() {
  return (
    <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
      published
    </span>
  );
}

/* ---------- Component ---------- */
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
    // clamp within [1, totalPages]
    const next = Math.min(Math.max(1, p), Math.max(1, totalPages));
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', String(next));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function deleteRow(slug: string) {
    const msg = locale === 'pl' ? 'Usunąć artykuł?' : 'Delete article?';
    if (!window.confirm(msg)) return;

    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // حاول قراءة JSON أولاً، وإلا fallback للنص الخام
        let errorText = '';
        try {
          const j = (await res.json().catch(() => null)) as { error?: unknown } | null;
          if (j && typeof j === 'object' && typeof j.error === 'string') {
            errorText = j.error;
          }
        } catch {
          /* ignore */
        }
        if (!errorText) {
          try {
            errorText = await res.text();
          } catch {
            /* ignore */
          }
        }
        alert(errorText || (locale === 'pl' ? 'Nie udało się usunąć' : 'Delete failed'));
        return;
      }

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
            <th className="px-3 py-2 text-center">Status</th>
            <th className="px-3 py-2 text-center">Created</th>
            <th className="px-3 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-zinc-200 dark:border-zinc-700"
            >
              <td className="px-3 py-2">
                <div className="font-medium">{r.title}</div>
                <div className="text-[10px] uppercase text-zinc-500">{r.slug}</div>
              </td>

              <td className="px-3 py-2 text-center">
                <PublishedBadge />
              </td>

              <td className="px-3 py-2 text-center">
                {formatDate(r.createdAt)}
              </td>

              <td className="px-3 py-2">
                <div className="flex gap-2 justify-center">
                  <Link
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                    aria-label={locale === 'pl' ? 'Edytuj artykuł' : 'Edit article'}
                  >
                    {locale === 'pl' ? 'Edytuj' : 'Edit'}
                  </Link>

                  <Link
                    href={`/${locale}/articles/${r.slug}`}
                    className="px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded text-xs"
                    target="_blank"
                    aria-label={locale === 'pl' ? 'Podgląd artykułu' : 'View article'}
                  >
                    {locale === 'pl' ? 'Podgląd' : 'View'}
                  </Link>

                  <button
                    type="button"
                    onClick={() => void deleteRow(r.slug)}
                    disabled={deleting === r.slug}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
                    aria-busy={deleting === r.slug}
                  >
                    {deleting === r.slug
                      ? (locale === 'pl' ? 'Usuwanie…' : 'Deleting…')
                      : (locale === 'pl' ? 'Usuń' : 'Delete')}
                  </button>
                </div>
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
            aria-label={locale === 'pl' ? 'Poprzednia strona' : 'Previous page'}
          >
            ‹
          </button>
          <span className="text-xs" aria-live="polite">
            {pageNo}/{totalPages}
          </span>
          <button
            onClick={() => setPage(pageNo + 1)}
            disabled={pageNo >= totalPages}
            className="px-3 py-1 text-xs rounded border disabled:opacity-40"
            aria-label={locale === 'pl' ? 'Następna strona' : 'Next page'}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
