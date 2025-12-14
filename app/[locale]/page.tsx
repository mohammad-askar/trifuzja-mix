// E:\trifuzja-mix\app\[locale]\page.tsx
import clientPromise from '@/types/mongodb';
import type { Metadata } from 'next';
import type { ObjectId } from 'mongodb';
import LatestArticlesSlider from '@/app/components/LatestArticlesSlider';

type Locale = 'en' | 'pl';

interface HomeTexts {
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  latestArticles: string;
  emptyArticles: string;
}

const TEXTS: Record<Locale, HomeTexts> = {
  en: {
    heroTitle: 'MENSITIVA',
    heroSubtitle:
      'An independent publishing initiative founded on creativity, openness, and reliability. The name derives from the Latin Mens Inquisitiva („inquisitive mind”) and reflects the portal’s philosophy: curiosity, insight, and the relentless pursuit of knowledge.',
    cta: 'Start Reading',
    latestArticles: 'Latest Articles',
    emptyArticles: 'No articles yet.',
  },
  pl: {
    heroTitle: 'MENSITIVA',
    heroSubtitle:
      'Niezależna inicjatywa publikacyjna oparta na kreatywności, otwartości i rzetelności. Nazwa wywodzi się od łacińskiego określenia Mens Inquisitiva („umysł dociekliwy”) i oddaje filozofię portalu: ciekawość, wnikliwość oraz nieustanne poszukiwanie wiedzy.',
    cta: 'Czytaj teraz',
    latestArticles: 'Najnowsze artykuły',
    emptyArticles: 'Brak artykułów.',
  },
};

type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };
type MaybeI18n = string | Record<string, string> | undefined;

interface RawArticle {
  _id: ObjectId;
  slug: string;
  title: MaybeI18n;
  excerpt?: MaybeI18n;
  coverUrl?: string;
  createdAt?: Date;
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
}

/** type that matches what we actually project/return from Mongo */
type RawArticleProjected = Pick<
  RawArticle,
  '_id' | 'slug' | 'title' | 'excerpt' | 'coverUrl' | 'createdAt' | 'meta'
>;

interface ArticleCard {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl?: string;
  createdAt?: string;
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
}

function pick(field: MaybeI18n, locale: Locale): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] ?? field.en ?? String(Object.values(field)[0] ?? '');
}

/* ------------ Metadata (await params) ------------ */
export async function generateMetadata(
  { params }: { params: Promise<{ locale: Locale }> }
): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = locale === 'pl' ? 'pl' : 'en';
  return {
    title: loc === 'pl' ? 'Strona główna | MENSITIVA' : 'Home | MENSITIVA',
    description:
      loc === 'pl'
        ? 'Najnowsze artykuły po polsku i angielsku.'
        : 'Latest articles in English and Polish.',
    alternates: { languages: { en: '/en', pl: '/pl' } },
  };
}

/* ------------------------- Page (await params) ------------------------- */
export default async function LocaleHome(
  { params }: { params: Promise<{ locale: Locale }> }
) {
  const { locale } = await params;
  const loc: Locale = locale === 'pl' ? 'pl' : 'en';
  const t = TEXTS[loc];

  const db = (await clientPromise).db();

  const articlesDocs = await db
    .collection<RawArticle>('articles')
    .find({})
    .sort({ createdAt: -1 })
    .limit(12)
    .project<RawArticleProjected>({
      _id: 1,
      slug: 1,
      title: 1,
      excerpt: 1,
      coverUrl: 1,
      createdAt: 1,
      meta: 1,
    })
    .toArray();

  const toCard = (d: RawArticleProjected): ArticleCard => {
    return {
      _id: d._id.toString(),
      slug: d.slug,
      title: pick(d.title, loc),
      excerpt: pick(d.excerpt, loc),
      coverUrl: d.coverUrl,
      createdAt: d.createdAt ? d.createdAt.toISOString() : undefined,
      meta: d.meta ? { coverPosition: d.meta.coverPosition } : undefined,
    };
  };

  const articlesOnly = articlesDocs.map(toCard);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <section className="relative text-center mt-15 py-32 px-4 bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8">
            {t.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Articles slider */}
      <LatestArticlesSlider
        locale={loc}
        articles={articlesOnly}
        heading={t.latestArticles}
        emptyText={t.emptyArticles}
      />
    </main>
  );
}
