// 📁 app/[locale]/videos/VideosClient.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getYouTubeThumb } from '@/utils/youtube';

/* ====== Types ====== */
export type Locale = 'en' | 'pl';

export type VideoItem = {
  _id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  videoUrl?: string;
  createdAt: string | Date;
  isVideoOnly?: boolean;
  categoryId?: string; // optional, if you need it later
};

type ApiVideosResponse = {
  articles: VideoItem[];
  total: number;
  pageNo: number;
  limit: number;
  pages: number;
};

type Props = {
  locale: Locale;
  initialPage: number;
  pages: number;
  limit: number;
  total: number;
  initialItems: VideoItem[];
  /** currently selected categories from URL (if any) */
  catsParam?: string[] | null;
};

/* ====== Helpers ====== */
async function fetchVideosPage(opts: {
  pageNo: number;
  limit: number;
  cats?: string[] | null;
}): Promise<ApiVideosResponse | null> {
  const { pageNo, limit, cats } = opts;
  const qs = new URLSearchParams();
  if (pageNo) qs.set('pageNo', String(pageNo));
  if (limit) qs.set('limit', String(limit));
  if (cats && cats.length) {
    for (const c of cats) {
      qs.append('cat', c);
    }
  }

  const res = await fetch(`/api/videos?${qs.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()) as ApiVideosResponse;
}

function buildPageWindow(
  current: number,
  totalPages: number,
  windowSize = 2,
): (number | '…')[] {
  const pages: (number | '…')[] = [];
  const add = (p: number | '…') => {
    if (pages[pages.length - 1] !== p) pages.push(p);
  };

  const start = Math.max(2, current - windowSize);
  const end = Math.min(totalPages - 1, current + windowSize);

  add(1);
  if (start > 2) add('…');
  for (let p = start; p <= end; p++) add(p);
  if (end < totalPages - 1) add('…');
  if (totalPages > 1) add(totalPages);

  return pages;
}

/* ====== Empty state ====== */
function EmptyState({ locale }: { locale: Locale }) {
  const title = locale === 'pl' ? 'Brak wideo' : 'No videos yet';
  const subtitle =
    locale === 'pl'
      ? 'Wróć wkrótce — szykujemy coś ciekawego.'
      : 'Check back soon — we’re preparing something new.';

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white/70 p-6 text-center shadow-md dark:border-zinc-800 dark:bg-gray-900/80">
      <svg aria-hidden viewBox="0 0 200 120" className="mx-auto mb-6 h-24 w-40 opacity-90">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="160" height="80" rx="12" fill="url(#g)" opacity="0.15" />
        <rect
          x="45"
          y="40"
          width="110"
          height="60"
          rx="8"
          className="text-zinc-300 dark:text-zinc-800"
          fill="currentColor"
        />
        <polygon points="85,55 120,70 85,85" fill="#60a5fa" />
      </svg>

      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-gray-100">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>

      <div className="mt-6">
        <Link
          href={`/${locale}/articles`}
          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          {locale === 'pl' ? 'Zobacz artykuły' : 'Browse articles'}
          <span aria-hidden>↗</span>
        </Link>
      </div>
    </section>
  );
}

/* ====== Component (Client) ====== */
export default function VideosClient({
  locale,
  initialPage,
  pages: pagesFromServer,
  limit,
  total: totalFromServer,
  initialItems,
  catsParam = null,
}: Props) {
  const [items, setItems] = useState<VideoItem[]>(initialItems);
  const [page, setPage] = useState<number>(initialPage);
  const [pages, setPages] = useState<number>(pagesFromServer);
  const [total, setTotal] = useState<number>(totalFromServer);
  const [loading, setLoading] = useState<boolean>(false);

  const topRef = useRef<HTMLDivElement>(null);

  // Sync when server-side navigation changes
  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setPages(pagesFromServer);
    setTotal(totalFromServer);
  }, [initialItems, initialPage, pagesFromServer, totalFromServer]);

  const changePage = useCallback(
    async (target: number) => {
      if (target < 1 || target > pages || target === page) return;

      setLoading(true);
      const data = await fetchVideosPage({
        pageNo: target,
        limit,
        cats: catsParam && catsParam.length ? catsParam : null,
      });
      setLoading(false);

      if (!data) return;

      const filtered = (data.articles || []).filter((a) => !!a.videoUrl);
      setItems(filtered);
      setPages(data.pages);
      setTotal(data.total);
      setPage(data.pageNo);

      const HEADER_OFFSET = 88;
      const topY =
        (topRef.current?.getBoundingClientRect().top ?? 0) +
        window.scrollY -
        HEADER_OFFSET;

      window.scrollTo({ top: Math.max(0, topY), behavior: 'smooth' });
      setTimeout(() => topRef.current?.focus({ preventScroll: true }), 300);
    },
    [page, pages, limit, catsParam],
  );

  const Skel = () => (
    <div className="h-[260px] animate-pulse rounded-xl border border-zinc-200 bg-white/60 p-3 shadow-sm dark:border-zinc-800 dark:bg-gray-900/70" />
  );

  const t = useMemo(
    () => ({
      prev: locale === 'pl' ? 'Poprzednia' : 'Prev',
      next: locale === 'pl' ? 'Następna' : 'Next',
      first: locale === 'pl' ? 'Pierwsza' : 'First',
      last: locale === 'pl' ? 'Ostatnia' : 'Last',
      page: locale === 'pl' ? 'Strona' : 'Page',
      showing: locale === 'pl' ? 'Wyświetlanie' : 'Showing',
      of: locale === 'pl' ? 'z' : 'of',
      videos: locale === 'pl' ? 'wideo' : 'videos',
    }),
    [locale],
  );

  const rangeLabel = useMemo(() => {
    if (total <= 0) return '';
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `${t.showing} ${start}–${end} ${t.of} ${total} ${t.videos}`;
  }, [page, limit, total, t]);

  /* ========= Pagination button styles ========= */
  const baseBtn =
    'inline-flex items-center justify-center rounded-full transition select-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
    'dark:focus-visible:ring-offset-zinc-900 disabled:opacity-40 disabled:pointer-events-none';

  const ghostBtn =
    baseBtn +
    ' border text-zinc-800 border-zinc-300 bg-white hover:bg-zinc-100 ' +
    'dark:text-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800';

  const activeBtn =
    baseBtn +
    ' text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 shadow-lg shadow-indigo-500/25';

  /* ========= Render ========= */
  return (
    <>
      <div ref={topRef} tabIndex={-1} aria-hidden className="h-0" />

      <div className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
        {rangeLabel}
      </div>

      {items.length === 0 && !loading ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              items.length === 0 &&
              Array.from({ length: limit }).map((_, i) => <Skel key={`s-${i}`} />)}

            {!loading &&
              items.map((a) => {
                const href = `/${locale}/articles/${a.slug}`;
                const ytThumb = a.videoUrl ? getYouTubeThumb(a.videoUrl) : null;
                const cover = ytThumb || a.coverUrl || '';

                return (
                  <article
                    key={a._id ?? a.slug}
                    className="group relative rounded-xl border border-zinc-200 bg-white/80 p-3 shadow-sm transition hover:border-zinc-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-500/40 dark:border-zinc-800 dark:bg-gray-900/90 dark:hover:border-zinc-700"
                  >
                    <Link
                      href={href}
                      className="absolute inset-0 z-10 rounded-xl"
                      aria-label={a.title}
                      tabIndex={0}
                    />

                    <div className="relative mb-3 overflow-hidden rounded-lg ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800">
                      <div className="relative aspect-video">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={a.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                            {locale === 'pl' ? 'Brak podglądu' : 'No preview'}
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-black/40 p-3 backdrop-blur-md ring-1 ring-white/20 transition group-hover:bg-black/50">
                            <svg
                              width="28"
                              height="28"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="11"
                                stroke="white"
                                strokeOpacity="0.25"
                              />
                              <polygon points="10,8 17,12 10,16" fill="white" />
                            </svg>
                          </div>
                        </div>

                        <span
                          className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow ring-1 ring-white/15"
                          aria-label={locale === 'pl' ? 'Wideo' : 'Video'}
                        >
                          {locale === 'pl' ? 'Wideo' : 'Video'}
                        </span>
                      </div>
                    </div>

                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900 dark:text-gray-100">
                      {a.title}
                    </h2>
                    {a.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {a.excerpt}
                      </p>
                    )}

                    <div className="mt-3">
                      <Link
                        href={href}
                        className="relative z-20 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      >
                        {locale === 'pl' ? 'Otwórz' : 'Open'}
                        <span aria-hidden>↗</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
          </section>

          {/* Pagination */}
          {pages > 1 && (
            <>
              {/* Mobile simple pagination */}
              <nav
                className="mt-8 flex items-center justify-between gap-3 md:hidden"
                role="navigation"
                aria-label="Pagination"
              >
                <button
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1 || loading}
                  className={`${ghostBtn} h-11 min-w-[44px] px-4 text-sm`}
                  aria-label={t.prev}
                >
                  ‹ {t.prev}
                </button>

                <span
                  className={`${activeBtn} h-11 min-w-[44px] px-5 text-sm`}
                  aria-current="page"
                >
                  {page} / {pages}
                </span>

                <button
                  onClick={() => changePage(page + 1)}
                  disabled={page >= pages || loading}
                  className={`${ghostBtn} h-11 min-w-[44px] px-4 text-sm`}
                  aria-label={t.next}
                >
                  {t.next} ›
                </button>
              </nav>

              {/* Desktop/full pagination */}
              <nav
                className="mt-8 hidden flex-wrap items-center justify-center gap-2 md:flex"
                role="navigation"
                aria-label="Pagination"
              >
                <button
                  onClick={() => changePage(1)}
                  disabled={page <= 1 || loading}
                  className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
                  aria-label={t.first}
                >
                  « {t.first}
                </button>

                <button
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1 || loading}
                  className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
                  aria-label={t.prev}
                >
                  ‹ {t.prev}
                </button>

                {buildPageWindow(page, pages, 2).map((p, idx) =>
                  p === '…' ? (
                    <span
                      key={`dots-${idx}`}
                      className="select-none px-2 text-zinc-500"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => changePage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      aria-label={`${t.page} ${p}`}
                      className={
                        p === page
                          ? `${activeBtn} h-10 px-4 text-sm`
                          : `${ghostBtn} h-10 px-4 text-sm`
                      }
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  onClick={() => changePage(page + 1)}
                  disabled={page >= pages || loading}
                  className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
                  aria-label={t.next}
                >
                  {t.next} ›
                </button>

                <button
                  onClick={() => changePage(pages)}
                  disabled={page >= pages || loading}
                  className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
                  aria-label={t.last}
                >
                  {t.last} »
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </>
  );
}
