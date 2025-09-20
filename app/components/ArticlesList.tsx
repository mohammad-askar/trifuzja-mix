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
  isVideoOnly?: boolean;
}

interface Props {
  locale?: Locale;
  catsParam?: string[] | string | null;
}

type ApiListResponse =
  | ArticleSummary[]
  | { articles?: ArticleSummary[]; total?: number };

const EFFECTIVE_LOCALE: Locale = 'pl';
const LIMIT = 9;
const MAX_AUTO_PAGES = 1;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

async function fetchPage(opts: {
  cats: string[];
  pageNo: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<{ list: ArticleSummary[]; total: number }> {
  const { cats, pageNo, limit, signal } = opts;
  const qs = new URLSearchParams({
    pageNo: String(pageNo),
    limit: String(limit),
    locale: EFFECTIVE_LOCALE,
  });
  cats.forEach((id) => qs.append('cat', id));

  const res = await fetch(`/api/articles?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: ApiListResponse = await res.json();
  return Array.isArray(data)
    ? { list: data, total: data.length }
    : { list: data.articles ?? [], total: data.total ?? 0 };
}

export default function ArticlesList({ catsParam }: Props) {
  const cats = useMemo<string[]>(
    () => (catsParam == null ? [] : Array.isArray(catsParam) ? catsParam : [catsParam]),
    [catsParam],
  );

  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoPages, setAutoPages] = useState(1);
  const hasMore = items.length < total;

  // الصفحة الأولى
  const firstAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    firstAbort.current?.abort();
    const controller = new AbortController();
    firstAbort.current = controller;

    (async () => {
      setLoading(true);
      try {
        const { list, total: t } = await fetchPage({
          cats, pageNo: 1, limit: LIMIT, signal: controller.signal,
        });
        setItems(list);
        setTotal(t);
        setPage(1);
        setAutoPages(1);
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error(getErrorMessage(e));
          setItems([]);
          setTotal(0);
          setPage(1);
          setAutoPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [cats]);

  // --- ⬇️ لفّ دالة التحميل بـ useCallback وأدرجها في deps ---
  const moreAbort = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  const loadNextPage = useCallback(
    async (opts?: { manual?: boolean }) => {
      const manual = !!opts?.manual;
      if (!hasMore) return;
      if (!manual && autoPages >= MAX_AUTO_PAGES) return;

      moreAbort.current?.abort();
      const controller = new AbortController();
      moreAbort.current = controller;

      try {
        loadingMoreRef.current = true;
        setLoading(true);
        const next = page + 1;
        const { list } = await fetchPage({
          cats, pageNo: next, limit: LIMIT, signal: controller.signal,
        });

        if (list.length === 0) {
          setTotal((prev) => Math.max(prev, items.length));
          return;
        }

        setItems((prev) => [...prev, ...list]);
        setPage(next);
        if (!manual) setAutoPages((p) => p + 1);
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error(getErrorMessage(e));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        loadingMoreRef.current = false;
      }
    },
    [cats, page, hasMore, autoPages, items.length], // ← اعتمادات صحيحة
  );
  // --- ⬆️ ---

  // المراقب (تمرير تلقائي) — الآن نُضمِّن loadNextPage في deps
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    if (!hasMore) return;
    if (autoPages >= MAX_AUTO_PAGES) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting ?? false;
        if (!hit) return;
        if (loadingMoreRef.current) return;
        void loadNextPage(); // تلقائي
      },
      { rootMargin: '300px', threshold: 0.1 },
    );

    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, autoPages, loadNextPage]); // ✅ التحذير انتهى

  const Skel = () => (
    <div className="rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-pulse h-72" />
  );

  return (
    <>
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <ArticleCard key={a._id} article={a} locale={EFFECTIVE_LOCALE} />
        ))}

        {loading && page === 1 &&
          Array.from({ length: LIMIT }).map((_, i) => <Skel key={`init-${i}`} />)}

        {loading && page > 1 && hasMore && autoPages < MAX_AUTO_PAGES &&
          Array.from({ length: 3 }).map((_, i) => <Skel key={`more-${i}`} />)}

        {!loading && items.length === 0 && (
          <p className="col-span-full text-center py-10 text-zinc-600 dark:text-zinc-400">
            Brak artykułów.
          </p>
        )}

        {hasMore && autoPages >= MAX_AUTO_PAGES && (
          <div className="col-span-full flex justify-center mt-2">
            <button
              onClick={() => loadNextPage({ manual: true })}
              disabled={loading}
              aria-busy={loading || undefined}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3
                         bg-gradient-to-r from-rose-600 to-red-600 text-white font-medium
                         shadow-lg shadow-red-500/20 hover:from-rose-500 hover:to-red-500
                         active:scale-[.98] transition focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  <span>Ładowanie…</span>
                </>
              ) : (
                <>
                  <span>Pokaż więcej</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />
    </>
  );
}
