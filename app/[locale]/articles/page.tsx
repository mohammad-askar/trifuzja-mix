// 📁 app/[locale]/articles/page.tsx
export const dynamic = 'force-dynamic';

import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';
import clientPromise from '@/types/mongodb';
import type { ObjectId } from 'mongodb';

type Locale = 'en' | 'pl';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ cat?: string | string[] }>;
};

export default async function ArticlesHub({ params, searchParams }: Props) {
  // 1) فكّ الوعود
  const { locale } = await params;
  const { cat } = await searchParams;

  // 2) قراءة وسائط الفئة فقط (بدون page)
  const selectedCat: string[] = Array.isArray(cat) ? cat : cat ? [cat] : [];

  // 3) جلب التصنيفات — بدون أي فلترة بالصفحة
  const db = (await clientPromise).db();
  const cats = await db
    .collection<{
      _id: ObjectId;
      name: { en: string; pl: string };
    }>('categories')
    .find({}, { projection: { name: 1 } })
    .sort({ 'name.en': 1 })
    .map(d => ({ _id: d._id.toHexString(), name: d.name }))
    .toArray();

  return (
    <main className="max-w-6xl mx-auto px-4 pt-10 pb-10">
      {/* ح chips للصفحات تم حذفها */}
      <CategoryChips categories={cats} selected={selectedCat} locale={locale} />
      {/* نمرّر فقط locale و catsParam؛ بدون pageKey */}
      <ArticlesList
        locale={locale}
        catsParam={selectedCat.length ? selectedCat : null}
      />
    </main>
  );
}
