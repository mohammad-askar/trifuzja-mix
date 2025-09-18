// app/components/ArticlesList.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

async function fetchPage(opts: {
  locale: Locale;
  cats: string[];
  pageNo: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<{ list: ArticleSummary[]; total: number }> {
  const { locale, cats, pageNo, limit, signal } = opts;

  const qs = new URLSearchParams({
    pageNo: String(pageNo),
    limit: String(limit),
    locale, // ✅ مهم لانتقاء النص باللّغة الصحيحة في الـ API
  });
  cats.forEach((id) => qs.append('cat', id));

  const res = await fetch(`/api/articles?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data: ApiListResponse = await res.json();
  return Array.isArray(data)
    ? { list: data, total: data.length }
    : { list: data.articles ?? [], total: data.total ?? 0 };
}

export default function ArticlesList({ locale = 'en', catsParam }: Props) {
  const cats = useMemo<string[]>(
    () =>
      catsParam == null ? [] : Array.isArray(catsParam) ? catsParam : [catsParam],
    [catsParam],
  );

  const LIMIT = 9;
  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoad] = useState(true);

  // هنستخدم نفس الـ controller لأول صفحة
  const firstPageAbort = useRef<AbortController | null>(null);

  // تحميل الصفحة الأولى + إعادة الضبط عند تغيّر الفلاتر/اللغة
  useEffect(() => {
    firstPageAbort.current?.abort();
    const controller = new AbortController();
    firstPageAbort.current = controller;

    (async () => {
      setLoad(true);
      try {
        const { list, total } = await fetchPage({
          locale,
          cats,
          pageNo: 1,
          limit: LIMIT,
          signal: controller.signal,
        });
        setItems(list);
        setTotal(total);
        setPage(1);
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error((e as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) setLoad(false);
      }
    })();

    return () => controller.abort();
  }, [locale, cats]);

  // لانهائي: مراقبة العنصر الحارس
  const sentinel = useRef<HTMLDivElement>(null);
  const moreAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sentinel.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (!hit || loading) return;
        if (items.length >= total) return;

        // إلغاء أي طلب قديم قبل التالي
        moreAbort.current?.abort();
        const controller = new AbortController();
        moreAbort.current = controller;

        (async () => {
          setLoad(true);
          try {
            const next = page + 1;
            const { list } = await fetchPage({
              locale,
              cats,
              pageNo: next,
              limit: LIMIT,
              signal: controller.signal,
            });
            setItems((prev) => [...prev, ...list]);
            setPage(next);
          } catch (e) {
            if (!controller.signal.aborted) {
              console.error(e);
              toast.error((e as Error).message);
            }
          } finally {
            if (!controller.signal.aborted) setLoad(false);
          }
        })();
      },
      { rootMargin: '200px' },
    );

    io.observe(sentinel.current);
    return () => {
      io.disconnect();
      moreAbort.current?.abort();
    };
  }, [items, total, loading, locale, cats, page]);

  const Skel = () => (
    <div className="rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-pulse h-72" />
  );

  return (
    <>
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && !loading && (
          <p className="col-span-full text-center py-10 text-zinc-600 dark:text-zinc-400">
            {locale === 'pl' ? 'Brak artykułów.' : 'No articles.'}
          </p>
        )}

        {items.map((a) => (
          <ArticleCard key={a._id} article={a} locale={locale} />
        ))}

        {loading &&
          Array.from({ length: LIMIT }).map((_, i) => <Skel key={i} />)}
      </section>

      <div ref={sentinel} aria-hidden="true" />
    </>
  );
}
