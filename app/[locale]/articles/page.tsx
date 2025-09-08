// 📁 E:\trifuzja-mix\app\[locale]\articles\page.tsx
export const dynamic = 'force-dynamic';

import PageChips      from '@/app/components/PageChips';
import CategoryChips  from '@/app/components/CategoryChips';
import ArticlesList   from '@/app/components/ArticlesList';
import clientPromise  from '@/types/mongodb';
import { PAGES, PageKey } from '@/types/constants/pages';
import { notFound }   from 'next/navigation';

type Locale = 'en' | 'pl';

export default async function ArticlesHub(props: {
  params: { locale: Locale };
  searchParams: { page?: string; cat?: string | string[] };
}) {
  /* 🔹 1 — Await كل الكائن ثم فكّ الخصائص */
  const { locale }      = await Promise.resolve(props.params);
  const { page, cat }   = await Promise.resolve(props.searchParams);

  /* 🔹 2 — القيم المحليّة الآمنة */
  const pageKey: PageKey = (page as PageKey | undefined) ?? 'multi';
  if (!PAGES.find(p => p.key === pageKey)) notFound();

  const selectedCat: string[] = cat
    ? Array.isArray(cat) ? cat : [cat]
    : [];

  /* 🔹 3 — بقية العمل بعد ذلك */
  const db   = (await clientPromise).db();
  const cats = await db.collection('categories')
    .find({ page: pageKey })
    .sort({ 'name.en': 1 })
    .map(d => ({ _id: d._id.toString(), name: d.name }))
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
