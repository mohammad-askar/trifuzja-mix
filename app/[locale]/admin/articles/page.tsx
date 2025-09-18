/* ── app/[locale]/admin/articles/page.tsx ─────────────────────────────── */
import { redirect }                  from 'next/navigation';
import { getServerSession }          from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise                 from '@/types/mongodb';

import { PAGES, type PageKey }       from '@/types/constants/pages';
import {
  ArticleStatus,
  isArticleStatus,
}                                    from '@/types/core/article';

import AdminArticlesFilters          from '@/components/admin/AdminArticlesFilters';
import DataTable                     from '@/components/admin/articles/DataTable';
import CreateButton                  from '@/components/admin/articles/CreateButton';

import type { ObjectId, WithId, Filter } from 'mongodb';

/* ------------------------------------------------------------------ */
/* 🗂️ أنواع محليّة */
/* ------------------------------------------------------------------ */
type Locale = 'en' | 'pl';

interface RawRow {
  _id      : ObjectId;
  slug     : string;
  title    : Record<string, string> | string;
  page     : PageKey;
  status   : ArticleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Row {
  id       : string;
  slug     : string;
  title    : string;
  page     : PageKey;
  status   : ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 🛠️ مساعدات */
/* ------------------------------------------------------------------ */
const pickTitle = (t: RawRow['title'], l: Locale) =>
  typeof t === 'string' ? t : t[l] ?? t.en ?? Object.values(t)[0] ?? '—';

const VALID_PAGES = new Set(PAGES.map(p => p.key));

function buildFilter(q: string, pageKey?: string, status?: string): Filter<RawRow> {
  const f: Filter<RawRow> = {};

  if (pageKey && VALID_PAGES.has(pageKey as PageKey)) f.page = pageKey as PageKey;
  if (status  && isArticleStatus(status))            f.status = status as ArticleStatus;

  if (q.trim()) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // بدون any:
    (f as Filter<RawRow> & { $or?: Filter<RawRow>[] }).$or = [
      { slug: rx },
      { ['title.en']: rx } as unknown as Filter<RawRow>,
      { ['title.pl']: rx } as unknown as Filter<RawRow>,
    ];
  }
  return f;
}


function mapRows(raw: WithId<RawRow>[], locale: Locale): Row[] {
  return raw.map(r => ({
    id        : r._id.toString(),
    slug      : r.slug,
    title     : pickTitle(r.title, locale),
    page      : r.page,
    status    : r.status,
    createdAt : r.createdAt?.toISOString() ?? '',
    updatedAt : r.updatedAt?.toISOString() ?? '',
  }));
}

/* ------------------------------------------------------------------ */
/* 📄 Page Component */
/* ------------------------------------------------------------------ */
export default async function AdminArticlesPage({
  params,        // ← Promise
  searchParams,  // ← Promise
}: {
  params       : Promise<{ locale: Locale }>;
  searchParams : Promise<{
    q?      : string;
    pageKey?: string;
    status? : string;
    limit?  : string;
    page?   : string;
  }>;
}) {
  /* 1️⃣ المصادقة */
  const session = await getServerSession(authOptions);
  const { locale } = await params;          // ⬅️  await !
  if (!session) redirect(`/${locale}/login`);

  /* 2️⃣ استخراج الـ query بعد await */
  const sp              = await searchParams;  // ⬅️  await !
  const q               = sp.q ?? '';
  const pageKeyParam    = sp.pageKey;
  const statusParam     = sp.status;
  const limit           = Math.min(100, Math.max(5, Number(sp.limit) || 20));
  const pageNo          = Math.max(1,   Number(sp.page)  || 1);
  const skip            = (pageNo - 1) * limit;

  /* 3️⃣ الفلتر + البيانات */
  const filter = buildFilter(q, pageKeyParam, statusParam);
  const db     = (await clientPromise).db();
  const coll   = db.collection<RawRow>('articles');

  const [rawRows, total] = await Promise.all([
    coll.find(filter,{ projection:{ content:0 }})
        .sort({ createdAt:-1 })
        .skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);

  const rows        = mapRows(rawRows, locale);
  const totalPages  = Math.max(1, Math.ceil(total / limit));

  /* 4️⃣ UI */
  return (
    <main className="max-w-7xl mx-auto px-4 pt-12 pb-20 space-y-8">
      {/* Header + New‑button */}
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <CreateButton locale={locale}/>
      </header>

      {/* Filters */}
      <AdminArticlesFilters
        locale={locale}
        query={{ search:q }}
      />

      {/* Data table */}
      <DataTable
        locale={locale}
        rows={rows}
        total={total}
        pagination={{ page:pageNo, totalPages, limit }}
      />
    </main>
  );
}
