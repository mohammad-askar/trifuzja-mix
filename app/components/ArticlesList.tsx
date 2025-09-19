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
  locale?: Locale; // سيُتجاهَل داخليًا
  catsParam?: string[] | string | null;
}

type ApiListResponse =
  | ArticleSummary[]
  | { articles?: ArticleSummary[]; total?: number };

const EFFECTIVE_LOCALE: Locale = 'pl';

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
  signal?: AbortSignal;
}): Promise<{ list: ArticleSummary[]; total: number }> {
  const { cats, pageNo, limit, signal } = opts;

  // ✅ نُثبت البولندية في الاستعلام
  const qs = new URLSearchParams({
    pageNo: String(pageNo),
    limit: String(limit),
    locale: EFFECTIVE_LOCALE,
  });
  cats.forEach((id) => qs.append('cat', id));

  const res = await fetch(`/api/articles?${qs.toString()}`, { signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data: ApiListResponse = await res.json();
  return Array.isArray(data)
    ? { list: data, total: data.length }
    : { list: data.articles ?? [], total: data.total ?? 0 };
}

export default function ArticlesList({ catsParam }: Props) {
  // نُبقي API المكوّن كما هو، لكن نتجاهل locale ونستخدم البولندية داخليًا
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

  // تحميل الصفحة الأولى + إعادة الضبط عند تغيّر الفلاتر
  useEffect(() => {
    firstPageAbort.current?.abort();
    const controller = new AbortController();
    firstPageAbort.current = controller;

    (async () => {
      setLoad(true);
      try {
        const { list, total: t } = await fetchPage({
          cats,
          pageNo: 1,
          limit: LIMIT,
          signal: controller.signal,
        });
        setItems(list);
        setTotal(t);
        setPage(1);
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error(e);
          toast.error(getErrorMessage(e));
        }
      } finally {
        if (!controller.signal.aborted) setLoad(false);
      }
    })();

    return () => controller.abort();
    // ✅ لا نعتمد على locale هنا كي لا نعيد الجلب عند تغييره في الهيدر
  }, [cats]);

  // لانهائي: مراقبة العنصر الحارس
  const sentinel = useRef<HTMLDivElement>(null);
  const moreAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sentinel.current) return;

    const io = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const hit = entries[0]?.isIntersecting ?? false;
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
              toast.error(getErrorMessage(e));
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
  }, [items, total, loading, cats, page]);

  const Skel = () => (
    <div className="rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-pulse h-72" />
  );

  return (
    <>
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && !loading && (
          <p className="col-span-full text-center py-10 text-zinc-600 dark:text-zinc-400">
            {/* ✅ رسالة ثابتة بالبولندية */}
            {'Brak artykułów.'}
          </p>
        )}

        {items.map((a) => (
          // ✅ تمرير البولندية دائمًا للكرت
          <ArticleCard key={a._id} article={a} locale={EFFECTIVE_LOCALE} />
        ))}

        {loading &&
          Array.from({ length: LIMIT }).map((_, i) => <Skel key={i} />)}
      </section>

      <div ref={sentinel} aria-hidden="true" />
    </>
  );
}
