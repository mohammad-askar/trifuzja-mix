// app/[locale]/admin/articles/page.tsx
export const dynamic = 'force-dynamic';

import { redirect }                  from 'next/navigation';
import { getServerSession }          from 'next-auth';
import { authOptions }               from '@/lib/authOptions';
import clientPromise                 from '@/types/mongodb';

import { PAGES, type PageKey }       from '@/types/constants/pages';
import {
  type ArticleStatus,
  isArticleStatus,
}                                    from '@/types/core/article';

import AdminArticlesFilters          from '@/components/admin/AdminArticlesFilters';
import DataTable                     from '@/components/admin/articles/DataTable';
import CreateButton                  from '@/components/admin/articles/CreateButton';

import type { ObjectId, WithId, Filter } from 'mongodb';

/* ------------------------------------------------------------------ */
/* 🗂️ الأنواع */
/* ------------------------------------------------------------------ */
type Locale = 'en' | 'pl';

interface RawRow {
  _id       : ObjectId;
  slug      : string;
  title     : Record<string, string> | string;
  page      : PageKey;
  status    : ArticleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Row {
  id        : string;
  slug      : string;
  title     : string;
  page      : PageKey;
  status    : ArticleStatus;
  createdAt : string;
  updatedAt : string;
}

/* ------------------------------------------------------------------ */
/* 🛠️ مساعدات */
/* ------------------------------------------------------------------ */
const pickTitle = (t: RawRow['title'], l: Locale) =>
  typeof t === 'string' ? t : t[l] ?? t.en ?? Object.values(t)[0] ?? '—';

const VALID_PAGES = new Set(PAGES.map(p => p.key));

/** نبني فلتر Mongo للبحث */
function buildFilterRaw(
  q: string,
  pageKey?: string,
  status?: string,
): Record<string, unknown> {
  const f: Record<string, unknown> = {};

  if (pageKey && VALID_PAGES.has(pageKey as PageKey)) {
    f.page = pageKey as PageKey;
  }
  if (status && isArticleStatus(status)) {
    f.status = status as ArticleStatus;
  }

  const trimmed = q.trim();
  if (trimmed) {
    const rx = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [
      { slug: rx },
      { 'title.en': rx },
      { 'title.pl': rx },
      { title: rx }, // توافق مع سجلات قديمة
    ];
  }

  return f;
}

function mapRows(raw: WithId<RawRow>[], locale: Locale): Row[] {
  return raw.map(r => ({
    id       : r._id.toString(),
    slug     : r.slug,
    title    : pickTitle(r.title, locale),
    page     : r.page,
    status   : r.status,
    createdAt: r.createdAt?.toISOString() ?? '',
    updatedAt: r.updatedAt?.toISOString() ?? '',
  }));
}

/* ------------------------------------------------------------------ */
/* 🌐 ترجمات رأس الصفحة */
/* ------------------------------------------------------------------ */
const HEADINGS: Record<Locale, { title: string }> = {
  en: { title: 'Articles' },
  pl: { title: 'Artykuły' },
};

/* ------------------------------------------------------------------ */
/* 📄 Page Component */
/* ------------------------------------------------------------------ */
export default async function AdminArticlesPage({
  params,        // ← Promise
  searchParams,  // ← Promise
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    search?: string;  // ✅ المفتاح الجديد القادم من المكوّن
    q?: string;       // ✅ دعم رجعي
    pageKey?: string;
    status?: string;
    limit?: string;
    page?: string;
  }>;
}) {
  /* 1) المصادقة */
  const session = await getServerSession(authOptions);
  const { locale } = await params; // مهم: await
  if (!session) redirect(`/${locale}/login`);

  /* 2) قراءة استعلامات البحث */
  const sp           = await searchParams; // مهم: await
  const q            = (sp.search ?? sp.q ?? '').trim(); // ✅ الأهم
  const pageKeyParam = sp.pageKey;
  const statusParam  = sp.status;
  const limit        = Math.min(100, Math.max(5, Number(sp.limit) || 20));
  const pageNo       = Math.max(1, Number(sp.page) || 1);
  const skip         = (pageNo - 1) * limit;

  /* 3) الفلتر + الجلب */
  const filter = buildFilterRaw(q, pageKeyParam, statusParam) as Filter<RawRow>;

  const db   = (await clientPromise).db();
  const coll = db.collection<RawRow>('articles');

  const [rawRows, total] = await Promise.all([
    coll
      .find(filter, {
        projection: { content: 0 }, // تخفيف النقل
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    coll.countDocuments(filter),
  ]);

  const rows       = mapRows(rawRows, locale);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* 4) الواجهة */
  const heading = HEADINGS[locale]?.title ?? HEADINGS.en.title;

  return (
    <main className="max-w-7xl mx-auto px-4 pt-20 pb-20 space-y-8">
      {/* العنوان + زر إنشاء */}
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        <CreateButton locale={locale} />
      </header>

      {/* المرشّحات (تكتب ?search= في العنوان) */}
      <AdminArticlesFilters locale={locale} query={{ search: q }} />

      {/* الجدول */}
      <DataTable
        locale={locale}
        rows={rows}
        total={total}
        pagination={{ page: pageNo, totalPages, limit }}
      />
    </main>
  );
}
