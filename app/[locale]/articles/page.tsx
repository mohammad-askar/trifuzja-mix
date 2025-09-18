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

/** 🔧 تطبيع الاسم:
 * - لو كان string نرجّعه كـ {en,pl} بنفس القيمة.
 * - لو كان object نضمن وجود en/pl ونملأ المفقود من الآخر أو من أول قيمة متاحة.
 */
function normalizeName(
  input: unknown,
): { en: string; pl: string } {
  if (typeof input === 'string') {
    const v = input.trim();
    return { en: v, pl: v };
  }
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const en = typeof obj.en === 'string' ? obj.en.trim() : '';
    const pl = typeof obj.pl === 'string' ? obj.pl.trim() : '';
    if (en && pl) return { en, pl };
    if (pl && !en) return { en: pl, pl };
    if (en && !pl) return { en, pl: en };
    // محاولة أخذ أول قيمة نصية لو موجودة
    const first = Object.values(obj).find((v) => typeof v === 'string') as string | undefined;
    const fallback = (first ?? '').trim();
    return { en: fallback, pl: fallback };
  }
  return { en: '', pl: '' };
}

/** 🔧 اختيار نص اللغة للترتيب */
function pickByLocale(n: { en: string; pl: string }, locale: Locale): string {
  return (locale === 'pl' ? n.pl : n.en) || n.en || n.pl || '';
}

export default async function ArticlesHub({ params, searchParams }: Props) {
  // 1) فكّ الوعود
  const { locale } = await params;
  const { cat } = await searchParams;

  // 2) قراءة وسائط الفئة فقط (بدون page)
  const selectedCat: string[] = Array.isArray(cat) ? cat : cat ? [cat] : [];

  // 3) جلب التصنيفات — نتعامل مع الحالتين: {en,pl} أو string
  const db = (await clientPromise).db();
  const raw = await db
    .collection<{ _id: ObjectId; name: unknown }>('categories')
    .find({}, { projection: { name: 1 } })
    // مابنقدرش نضمن sort على name.en إذا كان فيه قيَم string؛ نرتّب بعد التطبيع بالـ JS
    .toArray();

  // 4) تطبيع + ترتيب حسب اللغة المختارة
  const cats = raw
    .map((d) => {
      const n = normalizeName(d.name);
      return {
        _id: d._id.toHexString(),
        name: n, // ⟵ يحتفظ بشكل { en, pl } ليتوافق مع CategoryChips الحالي
      };
    })
    .sort((a, b) =>
      pickByLocale(a.name, locale).localeCompare(pickByLocale(b.name, locale), locale),
    );

  return (
    <main className="max-w-6xl mx-auto px-4 pt-10 pb-10">
      {/* نمرّر الأسماء كـ {en,pl} ليظلّ CategoryChips سعيدًا سواء المصدر كان string أو object */}
      <CategoryChips categories={cats} selected={selectedCat} locale={locale} />

      {/* نمرّر فقط locale و catsParam؛ بدون pageKey */}
      <ArticlesList
        locale={locale}
        catsParam={selectedCat.length ? selectedCat : null}
      />
    </main>
  );
}
