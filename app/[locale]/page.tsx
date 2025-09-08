//E:\trifuzja-mix\app\[locale]\page.tsx
import clientPromise from '@/types/mongodb';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ObjectId } from 'mongodb';
import LatestArticlesSlider from '@/app/components/LatestArticlesSlider';
type Locale = 'en' | 'pl';

interface HomeTexts {
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  latest: string;
  empty: string;
}

const TEXTS: Record<Locale, HomeTexts> = {
  en: {
    heroTitle: 'Welcome to Trifuzja Mix',
    heroSubtitle: 'Articles that educate, inspire, and engage – in English and Polish.',
    cta: 'Start Reading',
    latest: 'Latest Articles',
    empty: 'No articles yet.',
  },
  pl: {
    heroTitle: 'Witamy w Trifuzja Mix',
    heroSubtitle: 'Artykuły, które edukują, inspirują i angażują – po angielsku i po polsku.',
    cta: 'Czytaj teraz',
    latest: 'Najnowsze artykuły',
    empty: 'Brak artykułów.',
  },
};

interface RawArticle {
  _id: ObjectId;
  slug: string;
  title: Record<string,string>;
  excerpt?: Record<string,string>;
  coverUrl?: string;
  status: 'draft' | 'published';
  createdAt?: Date;
}

interface ArticleCard {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl?: string;
  createdAt?: string;
}

function pick(obj: Record<string,string> | undefined, locale: Locale): string {
  return obj?.[locale] ?? obj?.en ?? (obj ? Object.values(obj)[0] : '') ?? '';
}

/* ✅ generateMetadata بتوقيع Promise للـ params */
export async function generateMetadata(
  { params }: { params: Promise<{ locale: Locale }> }
): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = locale === 'pl' ? 'pl' : 'en';
  return {
    title: loc === 'pl' ? 'Strona główna | Trifuzja Mix' : 'Home | Trifuzja Mix',
    description: loc === 'pl'
      ? 'Najnowsze artykuły po polsku i angielsku.'
      : 'Latest articles in English and Polish.',
    alternates: {
      languages: {
        en: '/en',
        pl: '/pl',
      },
    },
  };
}

/* ✅ الصفحة نفسها بنفس أسلوب انتظار params */
export default async function LocaleHome(
  { params }: { params: Promise<{ locale: Locale }> }
) {
  const { locale } = await params;
  const loc: Locale = locale === 'pl' ? 'pl' : 'en';
  const t = TEXTS[loc];

  const db = (await clientPromise).db();
  const docs = await db
    .collection<RawArticle>('articles')
    .find({ status: 'published' })
    .sort({ createdAt: -1 })
    .limit(8)
    .project({ content: 0 })
    .toArray();

  const articles: ArticleCard[] = docs.map(d => ({
    _id: d._id.toString(),
    slug: d.slug,
    title: pick(d.title, loc),
    excerpt: pick(d.excerpt, loc),
    coverUrl: d.coverUrl,
    createdAt: d.createdAt ? d.createdAt.toISOString() : undefined,
  }));

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <section className="relative text-center py-28 px-4 bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-900 overflow-hidden">
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
          <Link
            href={`/${loc}/articles`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span>{t.cta}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <LatestArticlesSlider
        locale={loc}
        articles={articles}
        heading={t.latest}
        emptyText={t.empty}
      />
    </main>
  );
}
