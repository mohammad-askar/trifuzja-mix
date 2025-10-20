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

type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

interface ApiArticle {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  videoUrl?: string;
  isVideoOnly?: boolean; // ← if your API sends it, we use it
  createdAt?: string;
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
  latestArticles: string;
  latestVideos: string;
  emptyArticles: string;
  emptyVideos: string;
  error: string;
  retry: string;
  viewAll: string;
}

const TEXTS: Record<Locale, LocaleTexts> = {
  en: {
    heroTitle: 'Initiativa Autonoma',
    heroSubtitle:
      'An independent publishing initiative outside the traditional editorial structure — creativity, openness and integrity.',
    cta: 'Start Reading',
    latestArticles: 'Latest Articles',
    latestVideos: 'Latest Videos',
    emptyArticles: 'No articles yet.',
    emptyVideos: 'No videos yet.',
    error: 'Failed to load content.',
    retry: 'Retry',
    viewAll: 'View all »',
  },
  pl: {
    heroTitle: 'Initiativa Autonoma',
    heroSubtitle:
      'Niezależna inicjatywa publikacyjna poza klasyczną strukturą redakcyjną — kreatywność, otwartość i rzetelność.',
    cta: 'Czytaj teraz',
    latestArticles: 'Najnowsze artykuły',
    latestVideos: 'Najnowsze wideo',
    emptyArticles: 'Brak artykułów.',
    emptyVideos: 'Brak wideo.',
    error: 'Nie udało się pobrać treści.',
    retry: 'Spróbuj ponownie',
    viewAll: 'Wszystkie »',
  },
};

/* -------- Helpers -------- */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

const PLACEHOLDER_IMG = '/images/placeholder.png';
const safeImage = (src?: string) => (src && src.length > 4 ? src : PLACEHOLDER_IMG);

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

const FETCH_LIMIT = 12;       // fetch enough to have items for both sliders
const CARD_HEIGHT = 340;

/* A small “play” corner badge for videos */
function PlayBadge() {
  return (
    <span
      className="absolute right-2 top-2 z-10 rounded-full bg-black/70 text-white text-[10px] px-2 py-1
                 border border-white/10 shadow"
      aria-hidden="true"
    >
      ▶︎ Video
    </span>
  );
}

export default function HomeClient() {
  const params = useParams();
  const rawLocale = params?.locale as string | undefined;
  const locale: Locale = rawLocale === 'pl' ? 'pl' : 'en';
  const t = TEXTS[locale];

  const [items, setItems] = useState<ApiArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const buildHref = useCallback(
    (slug: string) => `/${locale}/articles/${slug}`,
    [locale],
  );

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        pageNo: '1',
        limit: String(FETCH_LIMIT),
        locale,
      });
      const res = await fetch(`/api/articles?${qs.toString()}`, {
        cache: 'no-store',
        signal,
      });
      const data = (await res.json()) as ArticlesApiResponse;
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!Array.isArray(data.articles)) throw new Error('Malformed API payload');
      setItems(data.articles);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(extractErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const c = new AbortController();
    fetchAll(c.signal);
    return () => c.abort();
  }, [fetchAll]);

  /* Split into Articles vs Videos.
     Prefer explicit isVideoOnly, fallback to presence of videoUrl. */
  const { articlesOnly, videosOnly } = useMemo(() => {
    const vids: ApiArticle[] = [];
    const arts: ApiArticle[] = [];
    for (const it of items) {
      const isVideo = it.isVideoOnly === true || (!!it.videoUrl && !it.excerpt && !it.coverUrl);
      (isVideo ? vids : arts).push(it);
    }
    return {
      articlesOnly: arts,
      videosOnly: vids,
    };
  }, [items]);

  const hasMultiArticles = articlesOnly.length > 1;
  const hasMultiVideos = videosOnly.length > 1;

  /* Card -> shared */
  const renderCard = useCallback(
    (a: ApiArticle, kind: 'article' | 'video') => {
      const objectPosition = toObjectPosition(a.meta?.coverPosition);
      const imgSrc = safeImage(a.coverUrl);

      return (
        <Link href={buildHref(a.slug)} className="block" key={a._id}>
          <article
            className="flex flex-col rounded-xl overflow-hidden bg-gray-800 shadow hover:shadow-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ height: CARD_HEIGHT }}
          >
            <div className="relative w-full overflow-hidden aspect-video">
              {kind === 'video' && <PlayBadge />}
              <Image
                src={imgSrc}
                alt={a.title || (kind === 'video' ? 'video' : 'article')}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition }}
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>

            <div className="flex-1 p-4 space-y-2">
              <h3 className="text-lg font-semibold text-white line-clamp-2">
                {a.title}
              </h3>
              {a.excerpt && kind === 'article' && (
                <p className="text-gray-300 text-sm line-clamp-2">
                  {a.excerpt}
                </p>
              )}
            </div>
          </article>
        </Link>
      );
    },
    [buildHref],
  );

  return (
    <main className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Hero */}
      <section className="relative mt-150 text-center bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-900 overflow-hidden">
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20 space-y-14">
        {/* Loading */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden bg-gray-800 animate-pulse"
                style={{ height: CARD_HEIGHT }}
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
              onClick={() => {
                const controller = new AbortController();
                fetchAll(controller.signal).catch(() => {});
              }}
              className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-medium"
            >
              {t.retry}
            </button>
            <p className="text-xs text-zinc-500 break-words">{error}</p>
          </div>
        )}

        {/* Articles slider */}
        {!loading && !error && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t.latestArticles}</h2>
              {articlesOnly.length > 0 && (
                <Link
                  href={`/${locale}/articles`}
                  className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  {t.viewAll}
                </Link>
              )}
            </div>

            {articlesOnly.length === 0 ? (
              <p className="text-gray-400">{t.emptyArticles}</p>
            ) : (
              <Swiper
                modules={[Pagination, Autoplay]}
                slidesPerView={1}
                spaceBetween={20}
                pagination={{ clickable: true }}
                autoplay={hasMultiArticles ? { delay: 5000, disableOnInteraction: false } : false}
                breakpoints={{
                  640: { slidesPerView: 1.2 },
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
              >
                {articlesOnly.map((a) => (
                  <SwiperSlide key={a._id}>{renderCard(a, 'article')}</SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        )}

        {/* Videos slider */}
        {!loading && !error && (
          <div>
            <div className="mb-6 mt-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t.latestVideos}</h2>
              {/* if you add a /videos page, link to it here */}
            </div>

            {videosOnly.length === 0 ? (
              <p className="text-gray-400">{t.emptyVideos}</p>
            ) : (
              <Swiper
                modules={[Pagination, Autoplay]}
                slidesPerView={1}
                spaceBetween={20}
                pagination={{ clickable: true }}
                autoplay={hasMultiVideos ? { delay: 5000, disableOnInteraction: false } : false}
                breakpoints={{
                  640: { slidesPerView: 1.2 },
                  768: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
              >
                {videosOnly.map((v) => (
                  <SwiperSlide key={v._id}>{renderCard(v, 'video')}</SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
