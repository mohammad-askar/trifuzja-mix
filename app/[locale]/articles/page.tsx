// 📁 app/[locale]/articles/page.tsx
export const dynamic = 'force-dynamic';

import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';
import clientPromise from '@/types/mongodb';
import type { ObjectId } from 'mongodb';
import type { Metadata } from 'next';
type Locale = 'en' | 'pl';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ cat?: string | string[] }>;
};

/* ----------------------------- Types ------------------------------ */
interface CategoryDbDoc {
  _id: ObjectId;
  // قد تكون string (جديدة) أو {en,pl} (قديمة)
  name: unknown;
}

interface CategoryUi {
  _id: string;
  // اسم واحد (بولندي)
  name: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titlePart = locale === 'pl' ? 'Artykuły' : 'Articles';

  return {
    title: `${titlePart} | Initiativa Autonoma`,
    description:
      locale === 'pl'
        ? 'Przeglądaj najnowsze artykuły w Initiativa Autonoma.'
        : 'Browse the latest articles on Initiativa Autonoma.',
    openGraph: {
      title: `${titlePart} | Initiativa Autonoma`,
      description:
        locale === 'pl'
          ? 'Przeglądaj najnowsze artykuły w Initiativa Autonoma.'
          : 'Browse the latest articles on Initiativa Autonoma.',
    },
    alternates: {
      languages: {
        en: '/en/articles',
        pl: '/pl/articles',
      },
    },
  };
}

/* ---------------------------- Helpers ----------------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** نستخرج البولندية ثم نFallback للإنجليزية ثم لأول قيمة نصية متاحة */
function normalizeNameToPolish(input: unknown): string {
  if (typeof input === 'string') return input.trim();

  if (isRecord(input)) {
    const pl = typeof input.pl === 'string' ? input.pl.trim() : '';
    if (pl) return pl;
    const en = typeof input.en === 'string' ? input.en.trim() : '';
    if (en) return en;

    const first = Object.values(input).find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    return (first ?? '').trim();
  }

  return '';
}

/* ----------------------------- Page ------------------------------- */
export default async function ArticlesHub({ params, searchParams }: Props) {
  // 1) فكّ الوعود
  const { locale } = await params;
  const { cat } = await searchParams;

  // 2) قراءة وسائط الفئة فقط (بدون page)
  const selectedCat: string[] = Array.isArray(cat) ? cat : cat ? [cat] : [];

  // 3) جلب التصنيفات — نتعامل مع الحالتين: string أو {en,pl}
  const db = (await clientPromise).db();
  const raw = await db
    .collection<CategoryDbDoc>('categories')
    .find({}, { projection: { name: 1 } })
    .toArray();

  // 4) تطبيع إلى اسم بولندي واحد + فرز بولندي
  const cats: CategoryUi[] = raw
    .map((d) => ({
      _id: d._id.toHexString(),
      name: normalizeNameToPolish(d.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return (
    <main className="max-w-6xl mt-3 mx-auto px-4 pt-10 pb-10">
      {/* ✅ مكوّن الشيبس يستقبل الآن name: string (بولندي فقط) */}
      <CategoryChips categories={cats} selected={selectedCat} />

      {/* ✅ ArticlesList داخليًا مجبَر على البولندية */}
      <ArticlesList
        locale={locale}
        catsParam={selectedCat.length ? selectedCat : null}
      />
    </main>
  );
}
