// 📁 app/[locale]/categories/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import clientPromise from '@/types/mongodb';
import CategoryChips from '@/app/components/CategoryChips';
import type { ObjectId } from 'mongodb';

type Locale = 'en' | 'pl';

interface CategoryUi {
  _id: string;
  name: { en: string; pl: string };
}

/* ------------------ helpers ------------------ */
function normalizeName(input: unknown): { en: string; pl: string } {
  if (typeof input === 'string') {
    const v = input.trim();
    return { en: v, pl: v };
  }
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const en = typeof obj.en === 'string' ? obj.en.trim() : '';
    const pl = typeof obj.pl === 'string' ? obj.pl.trim() : '';
    if (en && pl) return { en, pl };
    if (pl) return { en: pl, pl };
    if (en) return { en, pl: en };
    const first = Object.values(obj).find((v): v is string => typeof v === 'string') ?? '';
    const fallback = first.trim();
    return { en: fallback, pl: fallback };
  }
  return { en: '', pl: '' };
}

/* ------------------ 1) Metadata ------------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'pl' ? 'Kategorie' : 'Categories' };
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

  // جلب التصنيفات (قد تكون string أو {en,pl})
  const db = (await clientPromise).db();
  const docs = await db
    .collection<{ _id: ObjectId; name: unknown }>('categories')
    .find({}, { projection: { name: 1 } })
    .toArray();

  if (!docs.length) notFound();

  // تطبيع + ترتيب دائمًا بالبولندي
  const categories: CategoryUi[] = docs
    .map((d) => ({ _id: d._id.toHexString(), name: normalizeName(d.name) }))
    .sort((a, b) => a.name.pl.localeCompare(b.name.pl, 'pl'));

  // ← نحولت للأسماء البولندية فقط لأن CategoryChips يتوقع name:string
  const chipCats = categories.map((c) => ({ _id: c._id, name: c.name.pl }));

  // تحضير selected من query ?cat
  const raw = sp?.cat;
  const selected: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-8 text-center">
        {locale === 'pl' ? 'Kategorie' : 'Categories'}
      </h1>

      {/* لا نمرر locale هنا لأن CategoryChips يعرض البولندي دائمًا */}
      <CategoryChips categories={chipCats} selected={selected} />
    </main>
  );
}
