'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/useConfirm';

type Locale = 'en' | 'pl';

interface ArticleRowActionsProps {
  slug: string;
  locale: Locale;
}

export default function ArticleRowActions({ slug, locale }: ArticleRowActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  async function handleDelete(): Promise<void> {
    if (deleting) return;

    const ok = await confirm({
      title: locale === 'pl' ? 'Usuń artykuł' : 'Delete article',
      message:
        locale === 'pl'
          ? 'Czy na pewno chcesz trwale usunąć ten artykuł? Operacji nie można cofnąć.'
          : 'Are you sure you want to permanently delete this article? This action cannot be undone.',
      confirmText: locale === 'pl' ? 'Usuń' : 'Delete',
      cancelText: locale === 'pl' ? 'Anuluj' : 'Cancel',
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}`, { method: 'DELETE' });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(out.error || 'Delete failed');
      toast.success(locale === 'pl' ? 'Usunięto' : 'Deleted');
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : locale === 'pl' ? 'Błąd usuwania' : 'Delete error',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link
          href={`/${locale}/admin/articles/${slug}/edit`}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
        >
          {locale === 'pl' ? 'Edytuj' : 'Edit'}
        </Link>

        <Link
          href={`/${locale}/articles/${slug}`}
          className="px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded text-xs"
          target="_blank"
          rel="noopener noreferrer"
        >
          {locale === 'pl' ? 'Podgląd' : 'View'}
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-50"
        >
          {deleting ? '…' : locale === 'pl' ? 'Usuń' : 'Delete'}
        </button>
      </div>
      {ConfirmModal}
    </>
  );
}
