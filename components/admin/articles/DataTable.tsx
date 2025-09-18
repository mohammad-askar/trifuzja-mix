// components/admin/articles/DataTable.tsx
'use client';

import {
  ChevronLeft, ChevronRight,
  Pencil, Trash, RefreshCw, Eye
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
  locale    : 'en' | 'pl';
  rows      : Row[];
  total     : number;
  pagination: { page:number; totalPages:number; limit:number };
}

const runDelete = (slug: string): Promise<DeleteResult> =>
  deleteArticleAction(slug) as Promise<DeleteResult>;

export default function DataTable({ locale, rows, total, pagination }: Props) {
  const [pending, start] = useTransition();
  const router  = useRouter();
  const params  = useSearchParams();

  const t = useMemo(() => ({
    title:   locale === 'pl' ? 'Tytuł'     : 'Title',
    created: locale === 'pl' ? 'Utworzono' : 'Created',
    actions: locale === 'pl' ? 'Akcje'     : 'Actions',
    pageLbl: locale === 'pl' ? 'Strona'    : 'Page',
    of:      locale === 'pl' ? 'z'         : 'of',
    items:   locale === 'pl' ? 'pozycji'   : 'items',
    delOk:   locale === 'pl' ? 'Usunięto artykuł.' : 'Article deleted.',
  }), [locale]);

  const tConfirm = useMemo(() => ({
    title  : locale==='pl' ? 'Potwierdź usunięcie' : 'Confirm deletion',
    cancel : locale==='pl' ? 'Anuluj'              : 'Cancel',
    del    : locale==='pl' ? 'Usuń'                : 'Delete',
    msg: (titleStr:string) =>
      locale==='pl'
        ? `Czy na pewno chcesz usunąć artykuł: „${titleStr}”?`
        : `Are you sure you want to delete: “${titleStr}”?`,
  }), [locale]);

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

  const pageHref = (p:number) => {
    const qp = new URLSearchParams(params);
    qp.set('page', String(p));
    return `?${qp.toString()}`;
  };

  if (total === 0) return <EmptyState locale={locale} />;

  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-200" />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl shadow ring-1 ring-white/10 dark:ring-zinc-800/60">
        <table className="min-w-[700px] w-full border-collapse text-sm">
          <thead className="bg-gray-900/90 text-zinc-200 text-sm">
            <tr>
              <Th>{t.title}</Th>
              <Th className="w-40">{t.created}</Th>
              <Th className="w-32 text-center">{t.actions}</Th>
            </tr>
          </thead>

          <tbody className="text-black-200">
            {rows.map((r,i)=>(
              <tr key={r.id} className={clsx(i%2 === 1 && 'bg-zinc-500/60','group')}>
                <Td>
                  <Link
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    className="font-medium text-black-100 hover:underline"
                  >
                    {r.title}
                  </Link>
                </Td>

                <Td className="text-xs text-b-300">
                  {new Date(r.createdAt).toLocaleDateString(locale, {
                    year:'numeric', month:'short', day:'numeric'
                  })}
                </Td>

                <Td>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href={`/${locale}/articles/${r.slug}`} target="_blank"
                      title="Preview" className="text-sky-700 hover:text-sky-400"
                    >
                      <Eye className="w-4 h-4"/>
                    </Link>

                    <Link
                      href={`/${locale}/admin/articles/${r.slug}/edit`}
                      title="Edit" className="text-green-700 hover:text-green-400"
                    >
                      <Pencil className="w-4 h-4"/>
                    </Link>

                    <button
                      title="Delete"
                      disabled={pending}
                      onClick={()=>askDelete(r.slug, r.title)}
                      className="text-red-700 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash className="w-4 h-4"/>
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900/90 text-xs text-zinc-200">
          <span>
            {t.pageLbl}&nbsp;<b>{pagination.page}</b>&nbsp;{t.of}&nbsp;<b>{pagination.totalPages}</b>
            &nbsp;–&nbsp;<b>{total.toLocaleString()}</b>&nbsp;{t.items}
          </span>
          <div className="flex gap-1">
            <PageBtn href={pageHref(pagination.page-1)} disabled={pagination.page===1}>
              <ChevronLeft className="w-4 h-4"/>
            </PageBtn>
            <PageBtn href={pageHref(pagination.page+1)} disabled={pagination.page===pagination.totalPages}>
              <ChevronRight className="w-4 h-4"/>
            </PageBtn>
          </div>
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
const Th = ({children,className}:{children:React.ReactNode;className?:string}) =>
  <th className={clsx('py-3 px-4 text-left',className)}>{children}</th>;

const Td = ({children,className}:{children:React.ReactNode;className?:string}) =>
  <td className={clsx('py-2 px-4',className)}>{children}</td>;

const PageBtn = ({
  href, disabled, children,
}: { href:string; disabled:boolean; children:React.ReactNode }) =>
  <Link href={href} scroll={false}
        className={clsx(
          'p-1.5 rounded border border-white/10 flex items-center justify-center text-zinc-200',
          disabled ? 'opacity-40 pointer-events-none'
                   : 'hover:bg-white/5 active:scale-[.97] transition'
        )}>
    {children}
  </Link>;

function EmptyState({ locale }:{locale:'en'|'pl'}) {
  return (
    <div className="border rounded-xl py-24 text-center text-zinc-400">
      {locale==='pl' ? 'Brak artykułów.' : 'No articles.'}
    </div>
  );
}
