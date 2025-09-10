// 📁 app/[locale]/categories/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import clientPromise from '@/types/mongodb';
import type { ObjectId } from 'mongodb';   // ⬅️ أضِف هذا

import CategoryChips from '@/app/components/CategoryChips';

type Locale = 'en' | 'pl';

interface Category {
  _id:  string;
  name: { en: string; pl: string };
}

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return { title: params.locale === 'pl' ? 'Kategorie' : 'Categories' };
}

export default async function PublicCatsPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { locale } = params;

  let categories: Category[] = [];
  try {
    const client = await clientPromise;
    const db = client.db();

    // ✅ عرّف _id كـ ObjectId
    const docs = await db
      .collection<{ _id: ObjectId; name: { en: string; pl: string } }>('categories')
      .find()
      .sort({ 'name.en': 1 })
      .toArray();

    if (!docs.length) notFound();

    categories = docs.map(d => ({
      _id: d._id.toHexString(), // ✅ بدّل toString() إلى toHexString()
      name: d.name,
    }));
  } catch (e) {
    console.error('⚠️  MongoDB error (categories page):', e);
    notFound();
  }

  const raw = searchParams?.cat;
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
