// components/admin/articles/DataTable.tsx
'use client';

import {
  ChevronLeft, ChevronRight, Pencil, Trash as TrashIcon, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDelete from '@/app/components/ConfirmDelete';
import { deleteArticle as deleteArticleAction } from './actions';
import type { Row } from '@/app/[locale]/admin/articles/page';

type DeleteResult = { ok: true } | { error: string };

interface Props {
  locale: 'en' | 'pl';
  rows: Row[];
  total: number;
  pagination: { page: number; totalPages: number; limit: number };
}

const runDelete = (slug: string): Promise<DeleteResult> =>
  deleteArticleAction(slug) as Promise<DeleteResult>;

export default function DataTable({ locale, rows, total, pagination }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const params = useSearchParams();

  const t = useMemo(
    () => ({
      title: locale === 'pl' ? 'Tytuł' : 'Title',
      created: locale === 'pl' ? 'Utworzono' : 'Created',
      actions: locale === 'pl' ? 'Akcje' : 'Actions',
      pageLbl: locale === 'pl' ? 'Strona' : 'Page',
      of: locale === 'pl' ? 'z' : 'of',
      items: locale === 'pl' ? 'pozycji' : 'items',
      delOk: locale === 'pl' ? 'Usunięto artykuł.' : 'Article deleted.',
      edit: locale === 'pl' ? 'Edytuj' : 'Edit',
      del: locale === 'pl' ? 'Usuń' : 'Delete',
      noArticles: locale === 'pl' ? 'Brak artykułów.' : 'No articles.',
      prev: locale === 'pl' ? 'Poprzednia' : 'Previous',
      next: locale === 'pl' ? 'Następna' : 'Next',
    }),
    [locale],
  );

  const tConfirm = useMemo(
    () => ({
      title: locale === 'pl' ? 'Potwierdź usunięcie' : 'Confirm deletion',
      cancel: locale === 'pl' ? 'Anuluj' : 'Cancel',
      del: locale === 'pl' ? 'Usuń' : 'Delete',
      msg: (titleStr: string) =>
        locale === 'pl'
          ? `Czy na pewno chcesz usunąć artykuł: „${titleStr}”?`
          : `Are you sure you want to delete: “${titleStr}”?`,
    }),
    [locale],
  );

  const [dlgOpen, setDlgOpen] = useState(false);
  const [toDelete, setToDelete] = useState<null | { slug: string; title: string }>(null);

  const askDelete = (slug: string, title: string) => {
    setToDelete({ slug, title });
    setDlgOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    start(() => {
      runDelete(toDelete.slug)
        .then((res) => {
          if ('error' in res) {
            toast.error(res.error);
          } else {
            toast.success(t.delOk);
            router.refresh();
          }
        })
        .finally(() => setDlgOpen(false));
    });
  };

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const pageHref = (p: number) => {
    const safe = clamp(p, 1, pagination.totalPages);
    const qp = new URLSearchParams(params.toString());
    qp.set('page', String(safe));
    return `?${qp.toString()}`;
  };

  if (total === 0) return <EmptyState label={t.noArticles} />;

  const PageBtn = ({
    href,
    disabled,
    children,
    ariaLabel,
  }: {
    href: string;
    disabled: boolean;
    children: React.ReactNode;
    ariaLabel: string;
  }) => (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      aria-label={ariaLabel}
      className={clsx(
        'p-2 rounded-full border border-white/10 flex items-center justify-center text-zinc-200',
        disabled
          ? 'opacity-40 pointer-events-none'
          : 'hover:bg-white/5 active:scale-[.97] transition',
      )}
    >
      {children}
    </Link>
  );

  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-200" />
        </div>
      )}

      {/* ====== Desktop (md+) جدول ====== */}
      <div className="hidden md:block overflow-x-auto rounded-xl shadow ring-1 ring-white/10 dark:ring-zinc-800/60">
        <table className="min-w-[720px] w-full border-collapse text-sm">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <Th>{t.title}</Th>
              <Th className="w-40">{t.created}</Th>
              <Th className="w-32 text-center">{t.actions}</Th>
            </tr>
          </thead>
        <tbody className="text-zinc-900 dark:text-zinc-100">
            {rows.map((r, i) => (
              <tr key={r.id} className={clsx(i % 2 ? 'bg-zinc-900/60' : '', 'group')}>
                <Td>
                  <Link
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    prefetch={false}
                    className="font-medium hover:underline"
                  >
                    {r.title}
                  </Link>
                </Td>

                <Td className="text-xs text-zinc-600 dark:text-zinc-300">
                  {new Date(r.createdAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Td>

                <Td>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href={`/${locale}/admin/articles/${r.slug}/edit`}
                      prefetch={false}
                      title={t.edit}
                      className="text-green-500 hover:text-green-400"
                      aria-label={t.edit}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>

                    <button
                      title={t.del}
                      aria-label={t.del}
                      disabled={pending}
                      onClick={() => askDelete(r.slug, r.title)}
                      className="text-red-500 hover:text-red-400 disabled:opacity-40"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Desktop pagination */}
        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900/90 text-xs text-zinc-200">
          <span>
            {t.pageLbl}&nbsp;<b>{pagination.page}</b>&nbsp;{t.of}&nbsp;
            <b>{pagination.totalPages}</b>&nbsp;–&nbsp;<b>{total.toLocaleString()}</b>&nbsp;
            {t.items}
          </span>
          <div className="flex gap-1">
            <PageBtn
              href={pageHref(pagination.page - 1)}
              disabled={pagination.page === 1}
              ariaLabel={t.prev}
            >
              <ChevronLeft className="w-5 h-5" />
            </PageBtn>
            <PageBtn
              href={pageHref(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              ariaLabel={t.next}
            >
              <ChevronRight className="w-5 h-5" />
            </PageBtn>
          </div>
        </nav>
      </div>

      {/* ====== Mobile (أقل من md) بطاقات ====== */}
      <div className="md:hidden grid gap-3">
        {rows.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border border-zinc-800 bg-gray-900/80 p-3 text-zinc-100"
          >
            <h3 className="font-semibold leading-snug">{r.title}</h3>
            <p className="mt-1 text-[11px] text-zinc-400">
              {t.created}:{' '}
              {new Date(r.createdAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>

            <div className="mt-3 flex items-center gap-4">
              <Link
                href={`/${locale}/admin/articles/${r.slug}/edit`}
                prefetch={false}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-emerald-500"
                aria-label={t.edit}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t.edit}
              </Link>

              <button
                onClick={() => askDelete(r.slug, r.title)}
                disabled={pending}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-rose-500 disabled:opacity-40"
                aria-label={t.del}
              >
                <TrashIcon className="w-3.5 h-3.5" />
                {t.del}
              </button>
            </div>
          </article>
        ))}

        {/* Mobile pagination */}
        <nav className="mt-2 flex items-center justify-between">
          <Link
            href={pageHref(pagination.page - 1)}
            prefetch={false}
            scroll={false}
            aria-label={t.prev}
            className={clsx(
              'inline-flex items-center rounded-full border border-zinc-700 px-3 py-1.5 text-xs',
              pagination.page === 1
                ? 'opacity-40 pointer-events-none'
                : 'bg-gray-200 hover:bg-gray-100 text-zinc-900',
            )}
          >
            ‹ {locale === 'pl' ? 'Poprzednia' : 'Prev'}
          </Link>

          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-4 py-1.5 text-xs font-semibold text-white shadow">
            {pagination.page} / {pagination.totalPages}
          </span>

          <Link
            href={pageHref(pagination.page + 1)}
            prefetch={false}
            scroll={false}
            aria-label={t.next}
            className={clsx(
              'inline-flex items-center rounded-full border border-zinc-700 px-3 py-1.5 text-xs',
              pagination.page === pagination.totalPages
                ? 'opacity-40 pointer-events-none'
                : 'bg-gray-200 hover:bg-gray-100 text-zinc-900',
            )}
          >
            {locale === 'pl' ? 'Następna' : 'Next'} ›
          </Link>
        </nav>
      </div>

      <ConfirmDelete
        open={dlgOpen}
        setOpen={setDlgOpen}
        onConfirm={confirmDelete}
        title={tConfirm.title}
        message={toDelete ? tConfirm.msg(toDelete.title) : ''}
        cancelLabel={tConfirm.cancel}
        deleteLabel={tConfirm.del}
      />
    </div>
  );
}

/* Helpers */
const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={clsx('py-3 px-4 text-left', className)}>{children}</th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={clsx('py-2 px-4', className)}>{children}</td>
);

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border rounded-xl py-24 text-center text-zinc-400">
      {label}
    </div>
  );
}
