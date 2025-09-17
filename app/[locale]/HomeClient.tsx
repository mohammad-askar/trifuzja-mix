// app/[locale]/HomeClient.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';

type Locale = 'en' | 'pl';

/* ندعم meta.coverPosition من الـ API */
type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

interface ApiArticle {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  createdAt?: string;
  // 👇 لو الـ API يرجّع موضع القصّ
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
}

interface ArticlesApiResponse {
  articles: ApiArticle[];
  total?: number;
  pageNo?: number;
  limit?: number;
  pages?: number;
  error?: string;
}

interface LocaleTexts {
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  latest: string;
  empty: string;
  error: string;
  retry: string;
}

const TEXTS: Record<Locale, LocaleTexts> = {
  en: {
    heroTitle: 'Welcome to Initiativa Autonoma',
    heroSubtitle:
      'Articles that educate, inspire, and engage – in English and Polish.',
    cta: 'Start Reading',
    latest: 'Latest Articles',
    empty: 'No articles yet.',
    error: 'Failed to load articles.',
    retry: 'Retry',
  },
  pl: {
    heroTitle: 'Witamy w Initiativa Autonoma',
    heroSubtitle:
      'Artykuły, które edukują, inspirują i angażują – po angielsku i po polsku.',
    cta: 'Czytaj teraz',
    latest: 'Najnowsze artykuły',
    empty: 'Brak artykułów.',
    error: 'Nie udało się pobrać artykułów.',
    retry: 'Spróbuj ponownie',
  },
};

/* -------- Helpers -------- */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/* موحّد لاستخدام صورة بديلة عند الحاجة */
const PLACEHOLDER_IMG = '/images/placeholder.png';
const safeImage = (src?: string) =>
  src && src.length > 4 ? src : PLACEHOLDER_IMG;

/* تحويل coverPosition إلى CSS object-position */
function toObjectPosition(pos?: LegacyCoverPos | CoverPosition): string {
  if (!pos) return '50% 50%';
  if (typeof pos === 'string') {
    if (pos === 'top') return '50% 0%';
    if (pos === 'bottom') return '50% 100%';
    return '50% 50%';
  }
  const x = Math.max(0, Math.min(100, pos.x));
  const y = Math.max(0, Math.min(100, pos.y));
  return `${x}% ${y}%`;
}

const FETCH_LIMIT = 8;

/* ------------------------------------ */
export default function HomeClient() {
  const params = useParams();
  const rawLocale = params?.locale as string | undefined;
  const locale: Locale = rawLocale === 'pl' ? 'pl' : 'en';
  const t = TEXTS[locale];

  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const hasMultiple = articles.length > 1;

  const buildArticleHref = useCallback(
    (slug: string) => `/${locale}/articles/${slug}`,
    [locale],
  );

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    try {
      const qs = new URLSearchParams({
        pageNo: '1',
        limit: String(FETCH_LIMIT),
        locale,
      });
      const res = await fetch(`/api/articles?${qs.toString()}`, {
        cache: 'no-store',
      });

      let data: ArticlesApiResponse;
      try {
        data = (await res.json()) as ArticlesApiResponse;
      } catch {
        throw new Error('Invalid JSON response');
      }

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!Array.isArray(data.articles))
        throw new Error('Malformed API payload');

      if (!cancelled) setArticles(data.articles);
    } catch (err: unknown) {
      if (!cancelled) {
        setError(extractErrorMessage(err));
        setArticles([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    (async () => {
      await fetchArticles();
    })();
  }, [fetchArticles]);

  /* شرائح السلايدر — ارتفاع موحّد للبطاقة + قص صورة 16:9 مع object-position */
  const CARD_HEIGHT = 340; // يمكنك تغييره لـ 320/360 حسب ذوقك

  const sliderSlides = useMemo(
    () =>
      articles.map((a) => {
        const objectPosition = toObjectPosition(a.meta?.coverPosition);
        const imgSrc = safeImage(a.coverUrl);

        return (
          <SwiperSlide key={a._id} className={`h-[${CARD_HEIGHT}px]`}>
            <Link href={buildArticleHref(a.slug)} className="block h-full">
              <article className="h-full flex flex-col rounded-xl overflow-hidden bg-gray-800 shadow hover:shadow-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-500">
                {/* صورة الغلاف بنسبة ثابتة */}
                <div className="relative w-full overflow-hidden aspect-video">
                  <Image
                    src={imgSrc}
                    alt={a.title || 'article'}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ objectPosition }}
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>

                {/* نص البطاقة — سطرين عنوان + سطرين ملخّص لتوحيد الارتفاع */}
                <div className="flex-1 p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-white line-clamp-2">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="text-gray-300 text-sm line-clamp-2">
                      {a.excerpt}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          </SwiperSlide>
        );
      }),
    [articles, buildArticleHref],
  );

  return (
    <main className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Hero (بدون تغيير ألوان) */}
      <section className="relative text-center bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col justify-center px-4 py-28">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8">
            {t.heroSubtitle}
          </p>
          <Link
            href={`/${locale}/articles`}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Latest Articles */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t.latest}</h2>
          {!loading && !error && articles.length > 0 && (
            <Link
              href={`/${locale}/articles`}
              className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              {locale === 'pl' ? 'Wszystkie »' : 'View all »'}
            </Link>
          )}
        </div>

        {/* Loading Skeleton (بنفس ارتفاع الكارت) */}
        {loading && (
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-live="polite"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-xl overflow-hidden bg-gray-800 animate-pulse h-[${CARD_HEIGHT}px]`}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="space-y-3" aria-live="assertive">
            <p className="text-red-400 text-sm">{t.error}</p>
            <button
              type="button"
              onClick={fetchArticles}
              className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-medium"
            >
              {t.retry}
            </button>
            <p className="text-xs text-zinc-500 break-words">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && articles.length === 0 && (
          <p className="text-gray-400">{t.empty}</p>
        )}

        {/* Slider */}
        {!loading && !error && articles.length > 0 && (
          <Swiper
            modules={[Pagination, Autoplay]}
            slidesPerView={1}
            spaceBetween={20}
            pagination={{ clickable: true }}
            autoplay={
              hasMultiple ? { delay: 5000, disableOnInteraction: false } : false
            }
            breakpoints={{
              640: { slidesPerView: 1.2 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
          >
            {sliderSlides}
          </Swiper>
        )}
      </section>
    </main>
  );
}
