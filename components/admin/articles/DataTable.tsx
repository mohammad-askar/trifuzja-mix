//E:\trifuzja-mix\components\admin\articles\DataTable.tsx
'use client';

import {
  ChevronLeft, ChevronRight,
  Pencil, Trash, RefreshCw, Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useMemo, useState } from 'react';
import clsx from 'clsx';
import { toggleStatus } from './actions'; // ← Server-Actions
import type { Row } from '@/app/[locale]/admin/articles/page';
import ConfirmDelete from '@/app/components/ConfirmDelete';
import toast from 'react-hot-toast';
import { deleteArticle as deleteArticleAction } from './actions';
/* --------- شارات الحالة --------- */
const badge = {
  base: 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold',
  map: {
    draft     : 'bg-amber-500/15 text-amber-400',
    review    : 'bg-fuchsia-500/15 text-fuchsia-400',
    scheduled : 'bg-sky-500/15 text-sky-400',
    published : 'bg-emerald-500/15 text-emerald-400',
    archived  : 'bg-zinc-500/15 text-zinc-400',
  } as const,
};
type DeleteResult = { ok: true } | { error: string };
interface Props {
  locale    : 'en' | 'pl';
  rows      : Row[];
  total     : number;
  pagination: { page:number; totalPages:number; limit:number };
}
const runDelete = (slug: string): Promise<DeleteResult> =>
  deleteArticleAction(slug) as Promise<DeleteResult>;
/* ========================================================================= */
export default function DataTable({ locale, rows, total, pagination }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const params = useSearchParams();

  /* ---------- ترجمات ---------- */
  const tStatus = useMemo(() => ({
    draft     : locale==='pl' ? 'Szkic'      : 'Draft',
    review    : locale==='pl' ? 'Recenzja'   : 'Review',
    scheduled : locale==='pl' ? 'Zaplan.'    : 'Scheduled',
    published : locale==='pl' ? 'Opublik.'   : 'Published',
    archived  : locale==='pl' ? 'Archiw.'    : 'Archived',
  }), [locale]);

  const tConfirm = useMemo(() => ({
    title      : locale==='pl' ? 'Potwierdź usunięcie' : 'Confirm deletion',
    cancel     : locale==='pl' ? 'Anuluj'              : 'Cancel',
    del        : locale==='pl' ? 'Usuń'                : 'Delete',
    msg: (title:string) =>
      locale==='pl'
        ? `Czy na pewno chcesz usunąć artykuł: „${title}”?`
        : `Are you sure you want to delete: “${title}”?`,
  }), [locale]);

  /* ---------- حالة الديالوج ---------- */
const [dlgOpen, setDlgOpen] = useState(false);
const [toDelete, setToDelete] = useState<null | { slug: string; title: string }>(null);


  /* ---------- أفعال ---------- */
  const onToggle = (id:string) =>
    start(() => toggleStatus(id).then(() => router.refresh()));

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
          toast.success(locale === 'pl' ? 'Usunięto artykuł.' : 'Article deleted.');
          router.refresh();
        }
      })
      .finally(() => setDlgOpen(false));
  });
};

  /* ---------- بناء روابط الصفحات ---------- */
  const pageHref = (p:number) => {
    const qp = new URLSearchParams(params);
    qp.set('page', String(p));
    return `?${qp.toString()}`;
  };

  /* ---------- لا توجد بيانات ---------- */
  if (total === 0) return <EmptyState locale={locale} />;

  /* ---------- JSX ---------- */
  return (
    <div className="relative">
      {/* طبقة تحميل نصف شفافة */}
      {pending && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-white/10 shadow-lg">
        <table className="min-w-[900px] w-full border-collapse text-sm">
          <thead className="bg-gray-900/90 text-black uppercase text-xs tracking-wide">
            <tr>
              <Th>Title</Th>
              <Th className="w-28">Page</Th>
              <Th className="w-32">Status</Th>
              <Th className="w-40">Created</Th>
              <Th className="w-32 text-center">Actions</Th>
            </tr>
          </thead>

        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.id} className={clsx(i%2 && 'bg-gray-400/90','group')}>
              <Td>
                <Link
                  href={`/${locale}/admin/articles/${r.slug}/edit`}
                  className="font-medium text-black group-hover:underline"
                >
                  {r.title}
                </Link>
              </Td>

              <Td className="uppercase font-mono">{r.page}</Td>

              <Td>
                <span className={clsx(badge.base, badge.map[r.status])}>
                  {tStatus[r.status]}
                </span>
              </Td>

              <Td className="text-xs text-black">
                {new Date(r.createdAt).toLocaleDateString(locale,{
                  year:'numeric', month:'short', day:'numeric'
                })}
              </Td>

              <Td>
                <div className="flex items-center justify-center gap-3 text-black">
                  <button
                    title="Toggle status"
                    disabled={pending}
                    onClick={()=>onToggle(r.id)}
                    className="text-emerald-800 hover:text-emerald-400 disabled:opacity-10"
                  >
                    ↕
                  </button>

                  <Link
                    href={`/${locale}/articles/${r.slug}`} target="_blank"
                    title="Preview" className="text-sky-600 hover:text-sky-400"
                  >
                    <Eye className="w-4 h-4"/>
                  </Link>

                  <Link
                    href={`/${locale}/admin/articles/${r.slug}/edit`}
                    title="Edit" className="text-indigo-600 hover:text-indigo-400"
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

        {/* -------- ترقيم الصفحات -------- */}
        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900/90 text-xs text-white">
          <span>
            Page&nbsp;<b>{pagination.page}</b>&nbsp;/&nbsp;<b>{pagination.totalPages}</b>
            &nbsp;–&nbsp;<b>{total.toLocaleString()}</b>&nbsp;items
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

      {/* ---- ConfirmDelete Dialog ---- */}
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

/* ------------------------------------------------------------------ */
/* عناصر مساعدة صغيرة                                                 */
/* ------------------------------------------------------------------ */
const Th = ({children,className}:{children:React.ReactNode;className?:string}) =>
  <th className={clsx('py-3 px-4 text-left',className)}>{children}</th>;

const Td = ({children,className}:{children:React.ReactNode;className?:string}) =>
  <td className={clsx('py-2 px-4',className)}>{children}</td>;

const PageBtn = ({
  href, disabled, children,
}: { href:string; disabled:boolean; children:React.ReactNode }) =>
  <Link href={href} scroll={false}
        className={clsx(
          'p-1.5 rounded border border-white/10 flex items-center justify-center',
          disabled ? 'opacity-40 pointer-events-none'
                   : 'hover:bg-white/5 active:scale-[.97] transition'
        )}>
    {children}
  </Link>;

function EmptyState({ locale }:{locale:'en'|'pl'}) {
  return (
    <div className="border rounded-xl py-24 text-center text-white">
      {locale==='pl' ? 'Brak artykułów.' : 'No articles.'}
    </div>
  );
}
