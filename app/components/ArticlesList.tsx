// app/components/ArticlesList.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ArticleCard from '@/app/components/ArticleCard';
import toast from 'react-hot-toast';
import { PageKey } from '@/types/constants/pages';

type Locale = 'en' | 'pl';

interface ArticleSummary {
  _id: string;
  slug: string;
  title:   string | Record<Locale, string>;
  excerpt: string | Record<Locale, string>;
  coverUrl?: string;
  readingTime?: string;
}

interface Props {
  locale?: Locale;
  pageKey: PageKey;
  catsParam?: string[] | string | null;
}

async function fetchPage(opts: {
  locale: Locale;
  pageKey: PageKey;
  cats: string[];
  pageNo: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<{ list: ArticleSummary[]; total: number }> {
  const { pageKey, cats, pageNo, limit, signal } = opts;
  const qs = new URLSearchParams({
    pageNo: String(pageNo),
    limit:  String(limit),
    page:   pageKey,
  });
  cats.forEach(id => qs.append('cat', id));

  const res = await fetch(`/api/articles?${qs}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return Array.isArray(data)
    ? { list: data, total: data.length }
    : { list: data.articles ?? [], total: data.total ?? 0 };
}

export default function ArticlesList({
  locale = 'en',
  pageKey,
  catsParam,
}: Props) {
  const cats = useMemo<string[]>(
    () => catsParam == null
      ? []
      : Array.isArray(catsParam)
        ? catsParam
        : [catsParam],
    [catsParam]
  );

  const LIMIT = 9;
  const [items, setItems]  = useState<ArticleSummary[]>([]);
  const [page,  setPage]   = useState(1);
  const [total, setTotal]  = useState(0);
  const [loading, setLoad] = useState(true);
  const abortRef           = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoad(true);
      try {
        const { list, total } = await fetchPage({
          locale, pageKey, cats, pageNo: 1, limit: LIMIT, signal: controller.signal,
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
        setLoad(false);
      }
    })();

    return () => controller.abort();
  }, [locale, pageKey, cats]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || loading) return;
      if (items.length >= total) return;

      (async () => {
        setLoad(true);
        try {
          const next = page + 1;
          const { list } = await fetchPage({
            locale, pageKey, cats, pageNo: next, limit: LIMIT,
          });
          setItems(prev => [...prev, ...list]);
          setPage(next);
        } catch (e) {
          console.error(e);
          toast.error((e as Error).message);
        } finally {
          setLoad(false);
        }
      })();
    }, { rootMargin: '200px' });

    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [items, total, loading, locale, pageKey, cats, page]);

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

        {items.map(a =>
          <ArticleCard key={a._id} article={a} locale={locale} />
        )}

        {loading && Array.from({ length: LIMIT }).map((_, i) =>
          <Skel key={i} />
        )}
      </section>

      <div ref={sentinel} aria-hidden="true" />
    </>
  );
}
