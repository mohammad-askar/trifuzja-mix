'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/useConfirm';
import toast from 'react-hot-toast';

/* ---------- Types ---------- */
type Locale = 'en' | 'pl';

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  /** status لم تعد تُستخدم، لكن نسمح بحقل اختياري لو عندك بيانات قديمة */
  status?: 'published';
  createdAt?: string;
  updatedAt?: string;
  locale: Locale;
};

interface Props {
  initial: { result: { items: ArticleRow[] } };
}

/* ---------- Helpers ---------- */
const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const PublishedBadge = () => (
  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400">
    published
  </span>
);

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
      let errorMsg = res.statusText || 'Delete failed';
      try {
        const json = (await res.json().catch(() => null)) as unknown;
        if (
          json &&
          typeof json === 'object' &&
          'error' in json &&
          typeof (json as { error?: unknown }).error === 'string'
        ) {
          errorMsg = (json as { error: string }).error;
        }
      } catch {
        /* ignore */
      }

      if (!res.ok) throw new Error(errorMsg);

      toast.success('Article deleted');
      router.refresh();
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
                  {/* بما أنه ما عاد فيه حالات، اعرض Published دائمًا */}
                  <PublishedBadge />
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
