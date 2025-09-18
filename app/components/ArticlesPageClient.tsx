// app/components/ArticlesPageClient.tsx
'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';

type Locale = 'en' | 'pl';

// شكل الواير القادم من الـ API (قد يكون name: string أو name: {en,pl})
type CategoryWire = {
  _id: string;
  name: unknown;
};

type CategoryForChips = {
  _id: string;
  name: Record<Locale, string>;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

function normalizeNameToRecord(input: unknown): Record<Locale, string> {
  if (typeof input === 'string') {
    const v = input.trim();
    return { en: v, pl: v };
  }
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const en = typeof obj.en === 'string' ? obj.en.trim() : undefined;
    const pl = typeof obj.pl === 'string' ? obj.pl.trim() : undefined;
    const fallback =
      (Object.values(obj).find(v => typeof v === 'string' && v.trim()) as string | undefined) ?? '';
    return {
      en: en ?? fallback ?? '',
      pl: pl ?? en ?? fallback ?? '',
    };
  }
  return { en: '', pl: '' };
}

export default function ArticlesPageClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const selected = searchParams.getAll('cat');

  const { data } = useSWR<CategoryWire[]>('/api/categories', fetcher);

  // نطبع الفئات لشكل متوافق مع CategoryChips: name = { en, pl }
  const categories: CategoryForChips[] = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.map(({ _id, name }) => ({
      _id,
      name: normalizeNameToRecord(name),
    }));
  }, [data]);

  return (
    <main className="min-h-screen px-4 pt-20 pb-16 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'pl' ? 'Wszystkie artykuły' : 'All Articles'}
      </h1>

      <CategoryChips categories={categories} selected={selected} locale={locale} />

      {/* ✅ بدون pageKey */}
      <ArticlesList locale={locale} catsParam={selected} />
    </main>
  );
}
