// 📁 E:\trifuzja-mix\app\[locale]\categories\page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import clientPromise from '@/types/mongodb';
import CategoryChips from '@/app/components/CategoryChips';
import type { ObjectId } from 'mongodb';

type Locale = 'en' | 'pl';

interface Category {
  _id:  string;
  name: { en: string; pl: string };
}

/* ------------------ 1) Metadata ------------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'pl' ? 'Kategorie' : 'Categories',
  };
}

/* ------------------ 2) Page ------------------ */
export default async function PublicCatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  /* ---------- جلب التصنيفات من MongoDB ---------- */
  const client = await clientPromise;
  const db = client.db();

  const docs = await db
    .collection<{ _id: ObjectId; name: { en: string; pl: string } }>('categories')
    .find()
    .sort({ 'name.en': 1 })
    .toArray();

  if (!docs.length) notFound();

  const categories: Category[] = docs.map(d => ({
    _id: d._id.toHexString(),
    name: d.name,
  }));

  /* ---------- تجهيز الفئات المختارة من ?cat= ---------- */
  const raw = sp?.cat;
  const selected: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-8 text-center">
        {locale === 'pl' ? 'Kategorie' : 'Categories'}
      </h1>

      <CategoryChips categories={categories} selected={selected} locale={locale} />
    </main>
  );
}
