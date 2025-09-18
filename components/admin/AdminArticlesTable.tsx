'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/useConfirm';
import toast from 'react-hot-toast';

/* ---------- Types ---------- */
type Locale = 'en' | 'pl';

/** لو عندك مقالات قديمة بحالات مختلفة، نسمح بها للقراءة فقط */
type ArticleStatus = 'published' | 'draft' | 'archived' | 'review' | 'scheduled';

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;   // عمليًا عندك الآن "published" فقط
  createdAt?: string;
  updatedAt?: string;
  locale: Locale;          // كان string — ضبطناه
};

interface Props {
  initial: { result: { items: ArticleRow[] } };
}

/* ---------- Helpers ---------- */
const formatDate = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const statusBadgeClass = (status: ArticleStatus): string => {
  const base = 'inline-block px-2 py-0.5 rounded text-xs font-semibold';
  switch (status) {
    case 'published':
      return `${base} bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400`;
    case 'draft':
      return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-700/20 dark:text-yellow-300`;
    case 'review':
      return `${base} bg-purple-100 text-purple-700 dark:bg-purple-700/20 dark:text-purple-400`;
    case 'scheduled':
      return `${base} bg-blue-100 text-blue-700 dark:bg-blue-700/20 dark:text-blue-400`;
    case 'archived':
      return `${base} bg-gray-200 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400`;
    default:
      return base;
  }
};

/* ---------- Component ---------- */
export default function AdminArticlesTable({ initial }: Props) {
  const router = useRouter();
  const { confirm, ConfirmModal } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deleteArticle(id: string, slug: string): Promise<void> {
    const ok = await confirm({
      title: 'Delete article',
      message: `Do you really want to delete “${slug}”?`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      setBusyId(id);
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });

      // حاول قراءة رسالة واضحة من الـ API
      let errorMsg = res.statusText;
      try {
        const json: unknown = await res.json();
        if (
          json &&
          typeof json === 'object' &&
          'error' in json &&
          typeof (json as { error?: unknown }).error === 'string'
        ) {
          errorMsg = (json as { error: string }).error;
        }
      } catch {
        /* تجاهل فشل JSON — نستعمل statusText بدلًا منه */
      }

      if (!res.ok) throw new Error(errorMsg || 'Delete failed');

      toast.success('Article deleted');
      router.refresh(); // re-fetch server data
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const rows = initial.result.items;

  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500 py-8">
        No articles found.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border ring-1 ring-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-200">
            <tr>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left w-44">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-4 py-2 font-medium">{row.title}</td>
                <td className="px-4 py-2">
                  <span className={statusBadgeClass(row.status)}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2">{formatDate(row.createdAt)}</td>

                <td className="px-4 py-2 flex flex-wrap gap-2">
                  <Link
                    href={`/${row.locale}/admin/articles/${row.slug}/edit`}
                    className="text-blue-500 hover:underline whitespace-nowrap"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/${row.locale}/articles/${row.slug}`}
                    target="_blank"
                    className="text-zinc-400 hover:underline whitespace-nowrap"
                  >
                    Preview ↗
                  </Link>

                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={busyId === row.id}
                    onClick={() => void deleteArticle(row.id, row.slug)}
                  >
                    {busyId === row.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ConfirmModal}
    </>
  );
}
