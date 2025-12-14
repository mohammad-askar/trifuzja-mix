// E:\trifuzja-mix\app\components\ArticlesList.tsx
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ArticleCard from '@/app/components/ArticleCard';
import toast from 'react-hot-toast';

type Locale = 'en' | 'pl';
type CoverPos = { x: number; y: number } | 'top' | 'center' | 'bottom';

interface ArticleSummary {
  _id: string;
  slug: string;
  title: string | Record<Locale, string>;
  excerpt: string | Record<Locale, string>;
  coverUrl?: string;
  readingTime?: string;
  meta?: { coverPosition?: CoverPos };
}

interface Props {
  locale?: Locale;
  catsParam?: string[] | string | null;
}

type ApiListResponse =
  | ArticleSummary[]
  | { articles?: ArticleSummary[]; total?: number };

/* Settings */
const DEFAULT_LOCALE: Locale = 'pl';
const LIMIT = 9;

/* ------------ Helpers ------------ */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function fetchPage(opts: {
  cats: string[];
  pageNo: number;
  limit: number;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<{ list: ArticleSummary[]; total: number }> {
  const { cats, pageNo, limit, locale, signal } = opts;

  const qs = new URLSearchParams({
    pageNo: String(pageNo),
    limit: String(limit),
    locale,
  });
  cats.forEach((id) => qs.append('cat', id));

  const res = await fetch(`/api/articles?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: ApiListResponse = await res.json();

  return Array.isArray(data)
    ? { list: data, total: data.length }
    : { list: data.articles ?? [], total: data.total ?? 0 };
}

/** Builds a pagination window like: 1 … 3 4 [5] 6 7 … 20 */
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

  pages.push(1);
  if (start > 2) add('…');
  for (let p = start; p <= end; p++) add(p);
  if (end < totalPages - 1) add('…');
  if (totalPages > 1) add(totalPages);

  return pages;
}

/* ------------ Component ------------ */
export default function ArticlesList({ catsParam, locale }: Props) {
  const effectiveLocale: Locale = locale ?? DEFAULT_LOCALE;

  const cats = useMemo<string[]>(
    () => (catsParam == null ? [] : Array.isArray(catsParam) ? catsParam : [catsParam]),
    [catsParam],
  );

  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Reference to scroll/focus at the top of the grid
  const topRef = useRef<HTMLDivElement>(null);

  // Initial load (or when categories change)
  const firstAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    firstAbort.current?.abort();
    const controller = new AbortController();
    firstAbort.current = controller;

    (async () => {
      setLoading(true);
      try {
        const { list, total: t } = await fetchPage({
          cats,
          pageNo: 1,
          limit: LIMIT,
          locale: effectiveLocale,
          signal: controller.signal,
        });
        setItems(list);
        setTotal(t);
        setPage(1);
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error(getErrorMessage(e));
          setItems([]);
          setTotal(0);
          setPage(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [cats, effectiveLocale]);

  // Change page + smooth scroll to top (account for fixed header)
  const changePage = useCallback(
    async (target: number) => {
      if (target < 1 || target > totalPages || target === page) return;

      const controller = new AbortController();
      try {
        setLoading(true);
        const { list } = await fetchPage({
          cats,
          pageNo: target,
          limit: LIMIT,
          locale: effectiveLocale,
          signal: controller.signal,
        });
        setItems(list);
        setPage(target);

        if (typeof window !== 'undefined') {
          const HEADER_OFFSET = 88; // adjust to your header height
          const topY =
            (topRef.current?.getBoundingClientRect().top ?? 0) +
            window.scrollY -
            HEADER_OFFSET;

          window.scrollTo({ top: Math.max(0, topY), behavior: 'smooth' });
          setTimeout(() => topRef.current?.focus({ preventScroll: true }), 350);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error(getErrorMessage(e));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [cats, effectiveLocale, page, totalPages],
  );

  /* ------ UI ------ */
  const Skel = () => (
    <div
      className="rounded-xl border border-zinc-200 bg-white/60 p-3 shadow-sm animate-pulse h-[260px]
                 dark:border-zinc-800 dark:bg-gray-900/70"
    />
  );

  const t = {
    prev: effectiveLocale === 'pl' ? 'Poprzednia' : 'Prev',
    next: effectiveLocale === 'pl' ? 'Następna' : 'Next',
    first: effectiveLocale === 'pl' ? 'Pierwsza' : 'First',
    last: effectiveLocale === 'pl' ? 'Ostatnia' : 'Last',
    page: effectiveLocale === 'pl' ? 'Strona' : 'Page',
    showing: effectiveLocale === 'pl' ? 'Wyświetlanie' : 'Showing',
    of: effectiveLocale === 'pl' ? 'z' : 'of',
    articles: effectiveLocale === 'pl' ? 'artykułów' : 'articles',
  };

  const rangeLabel = (() => {
    if (total <= 0) return '';
    const start = (page - 1) * LIMIT + 1;
    const end = Math.min(page * LIMIT, total);
    return `${t.showing} ${start}–${end} ${t.of} ${total} ${t.articles}`;
  })();

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

  return (
    <>
      <div ref={topRef} tabIndex={-1} aria-hidden className="h-0" />

      <div className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">{rangeLabel}</div>

      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <ArticleCard key={a._id} article={a} locale={effectiveLocale} />
        ))}

        {loading &&
          items.length === 0 &&
          Array.from({ length: LIMIT }).map((_, i) => <Skel key={`init-${i}`} />)}

        {!loading && items.length === 0 && (
          <p className="col-span-full text-center py-10 text-zinc-600 dark:text-zinc-400">
            {effectiveLocale === 'pl' ? 'Brak artykułów.' : 'No articles.'}
          </p>
        )}
      </section>

      {totalPages > 1 && (
        <>
          {/* Mobile */}
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
              {page} / {totalPages}
            </span>

            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages || loading}
              className={`${ghostBtn} h-11 min-w-[44px] px-4 text-sm`}
              aria-label={t.next}
            >
              {t.next} ›
            </button>
          </nav>

          {/* Desktop */}
          <nav
            className="mt-8 hidden md:flex items-center justify-center flex-wrap gap-2"
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

            {buildPageWindow(page, totalPages, 2).map((p, idx) =>
              p === '…' ? (
                <span key={`dots-${idx}`} className="px-2 text-zinc-500 select-none" aria-hidden>
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
              disabled={page >= totalPages || loading}
              className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
              aria-label={t.next}
            >
              {t.next} ›
            </button>

            <button
              onClick={() => changePage(totalPages)}
              disabled={page >= totalPages || loading}
              className={`${ghostBtn} h-10 min-w-[44px] px-3 text-sm`}
              aria-label={t.last}
            >
              {t.last} »
            </button>
          </nav>
        </>
      )}
    </>
  );
}
