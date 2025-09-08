'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/useConfirm';
import toast from 'react-hot-toast';

/* ---------- Types ---------- */
type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived' | 'review' | 'scheduled';
  createdAt?: string;
  updatedAt?: string;
  locale: string;
};

interface Props {
  initial: { result: { items: ArticleRow[] } };
}

/* ---------- Helpers ---------- */
const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const statusBadge = (status: ArticleRow['status']) => {
  const base = 'inline-block px-2 py-0.5 rounded text-xs font-semibold';
  switch (status) {
    case 'published':  return `${base} bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400`;
    case 'draft':      return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-700/20 dark:text-yellow-300`;
    case 'review':     return `${base} bg-purple-100 text-purple-700 dark:bg-purple-700/20 dark:text-purple-400`;
    case 'scheduled':  return `${base} bg-blue-100 text-blue-700 dark:bg-blue-700/20 dark:text-blue-400`;
    case 'archived':   return `${base} bg-gray-200 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400`;
    default:           return base;
  }
};

/* ---------- Component ---------- */
export default function AdminArticlesTable({ initial }: Props) {
  const router = useRouter();
  const { confirm, ConfirmModal } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  const deleteArticle = async (id: string, slug: string) => {
    const ok = await confirm({
      title: 'Delete article',
      message: `Do you really want to delete “${slug}”?`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      setBusyId(id);
      const res = await fetch(`/api/admin/articles/${slug}`, { method: 'DELETE' });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error);
      }

      toast.success('Article deleted');
      router.refresh();           // re‑fetch server data
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const rows = initial.result.items;
  if (rows.length === 0)
    return <p className="text-center text-sm text-zinc-500 py-8">No articles found.</p>;

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
            {rows.map(row => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-4 py-2 font-medium">{row.title}</td>
                <td className="px-4 py-2">
                  <span className={statusBadge(row.status)}>{row.status}</span>
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
                    onClick={() => deleteArticle(row.id, row.slug)}
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
