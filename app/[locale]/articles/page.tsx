// 📁 app/[locale]/articles/page.tsx
export const dynamic = 'force-dynamic';

import PageChips from '@/app/components/PageChips';
import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';
import clientPromise from '@/types/mongodb';
import { PAGES, type PageKey } from '@/types/constants/pages';
import { notFound } from 'next/navigation';
import type { ObjectId } from 'mongodb';

type Locale = 'en' | 'pl';

export default async function ArticlesHub({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ page?: string; cat?: string | string[] }>;
}) {
  /* 1) فكّ الوعود */
  const { locale } = await params;
  const { page, cat } = await searchParams;

  /* 2) القيم المحليّة الآمنة */
  const pageKey: PageKey = (page as PageKey | undefined) ?? 'multi';
  if (!PAGES.find(p => p.key === pageKey)) notFound();

  const selectedCat: string[] = cat ? (Array.isArray(cat) ? cat : [cat]) : [];

  /* 3) جلب التصنيفات (Typing أدقّ + toHexString) */
  const db = (await clientPromise).db();
  const cats = await db
    .collection<{ _id: ObjectId; name: { en: string; pl: string }; page?: PageKey; pageKey?: PageKey }>('categories')
    .find({ $or: [{ page: pageKey }, { pageKey: pageKey }] }) // دعم الحقلين لو عندك قديم/جديد
    .sort({ 'name.en': 1 })
    .map(d => ({ _id: d._id.toHexString(), name: d.name }))
    .toArray();

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
      <PageChips locale={locale} />
      <CategoryChips categories={cats} selected={selectedCat} locale={locale} />
      <ArticlesList
        locale={locale}
        pageKey={pageKey}
        catsParam={selectedCat.length ? selectedCat : null}
      />
    </main>
  );
}
