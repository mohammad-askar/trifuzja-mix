// components/admin/articles/DataTable.tsx
'use client';

import {
  ChevronLeft, ChevronRight,
  Pencil, Trash, RefreshCw, Eye
}                       from 'lucide-react';
import Link             from 'next/link';
import { useRouter,
         useSearchParams } from 'next/navigation';
import { useTransition,
         useMemo }      from 'react';
import clsx             from 'clsx';
import { toggleStatus,
         deleteArticle } from './actions';   // ← Server‑Actions
import type { Row }     from '@/app/[locale]/admin/articles/page';

/* --------- أنماط صغيرة مكرّرة --------- */
const badge = {
  base   : 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold',
  map    : {
    draft     : 'bg-amber-500/15 text-amber-400',
    review    : 'bg-fuchsia-500/15 text-fuchsia-400',
    scheduled : 'bg-sky-500/15 text-sky-400',
    published : 'bg-emerald-500/15 text-emerald-400',
    archived  : 'bg-zinc-500/15 text-zinc-400',
  } as const,
};

interface Props {
  locale    : 'en' | 'pl';
  rows      : Row[];
  total     : number;
  pagination: { page:number; totalPages:number; limit:number };
}

/* ========================================================================= */
export default function DataTable({ locale, rows, total, pagination }: Props) {
  const [pending,start]   = useTransition();
  const router            = useRouter();
  const params            = useSearchParams();

  /* ---------- ترجمات صغيرة ---------- */
  const tStatus = useMemo(()=>({
    draft     : locale==='pl' ? 'Szkic'      : 'Draft',
    review    : locale==='pl' ? 'Recenzja'   : 'Review',
    scheduled : locale==='pl' ? 'Zaplan.'    : 'Scheduled',
    published : locale==='pl' ? 'Opublik.'   : 'Published',
    archived  : locale==='pl' ? 'Archiw.'    : 'Archived',
  }),[locale]);

  /* ---------- أفعال ---------- */
  const onToggle = (id:string)=> start(()=> toggleStatus(id).then(()=>router.refresh()));
  const onDelete = (slug:string)=> {
    if (!confirm(locale==='pl' ? 'Usunąć artykuł?' : 'Delete article?')) return;
    start(()=> deleteArticle(slug).then(()=>router.refresh()));
  };

  /* ---------- بناء رابط الصفحات يحافظ على كل الـ query ما عدا رقم الصفحة ---------- */
  const pageHref = (p:number)=> {
    const qp = new URLSearchParams(params);
    qp.set('page',String(p));
    return `?${qp.toString()}`;
  };

  /* ---------- واجهة المستخدم ---------- */
  if (total===0)
    return <EmptyState locale={locale} />;

  return (
    <div className="relative">
      {/* طبقة تحميل نصف شفافة */}
      {pending && <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-20">
        <RefreshCw className="w-6 h-6 animate-spin text-black" />
      </div>}

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
                    year:'numeric',month:'short',day:'numeric'
                  })}
                </Td>

                <Td>
                  <div className="flex items-center justify-center gap-3 text-black">
                    <button title="Toggle status" disabled={pending}
                            onClick={()=>onToggle(r.id)}
                            className="text-emerald-800 hover:text-emerald-400 disabled:opacity-10">
                      ↕
                    </button>

                    <Link href={`/${locale}/articles/${r.slug}`} target="_blank"
                          title="Preview" className="text-sky-600 hover:text-sky-400">
                      <Eye className="w-4 h-4"/>
                    </Link>

                    <Link href={`/${locale}/admin/articles/${r.slug}/edit`}
                          title="Edit" className="text-indigo-600 hover:text-indigo-400">
                      <Pencil className="w-4 h-4"/>
                    </Link>

                    <button title="Delete" disabled={pending}
                            onClick={()=>onDelete(r.slug)}
                            className="text-red-700 hover:text-red-400 disabled:opacity-40">
                      <Trash className="w-4 h-4"/>
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* -------- ترقيم الصفحات -------- */}
        <nav
          className="flex items-center justify-between px-4 py-3 bg-gray-900/90 text-xs text-white">
          <span>
            Page&nbsp;<b>{pagination.page}</b>&nbsp;/&nbsp;<b>{pagination.totalPages}</b>
            &nbsp;–&nbsp;<b>{total.toLocaleString()}</b>&nbsp;items
          </span>

          <div className="flex gap-1">
            <PageBtn href={pageHref(pagination.page-1)} disabled={pagination.page===1}>
              <ChevronLeft className="w-4 h-4"/>
            </PageBtn>

            <PageBtn href={pageHref(pagination.page+1)}
                     disabled={pagination.page===pagination.totalPages}>
              <ChevronRight className="w-4 h-4"/>
            </PageBtn>
          </div>
        </nav>
      </div>
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
