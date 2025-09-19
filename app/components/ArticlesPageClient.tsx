// app/components/ArticlesPageClient.tsx
'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';

type Locale = 'en' | 'pl';

// الواير من الـ API (قد يكون string أو {en,pl} قديم)
type CategoryWire = {
  _id: string;
  name: unknown;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function normalizeNameToPl(input: unknown): string {
  if (typeof input === 'string') return input.trim();
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const pl = typeof obj.pl === 'string' ? obj.pl.trim() : '';
    if (pl) return pl;
    const en = typeof obj.en === 'string' ? obj.en.trim() : '';
    if (en) return en;
    const first =
      (Object.values(obj).find((v) => typeof v === 'string' && v.trim().length > 0) as
        | string
        | undefined) ?? '';
    return first.trim();
  }
  return '';
}

export default function ArticlesPageClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const selected = searchParams.getAll('cat');

  const { data } = useSWR<CategoryWire[]>('/api/categories', fetcher);

  // ← نحول الاسم إلى بولندي فقط ليتوافق مع CategoryChips (name: string)
  const categories = useMemo((): { _id: string; name: string }[] => {
    const list = Array.isArray(data) ? data : [];
    return list.map(({ _id, name }) => ({
      _id,
      name: normalizeNameToPl(name),
    }));
  }, [data]);

  return (
    <main className="min-h-screen px-4 pt-20 pb-16 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'pl' ? 'Wszystkie artykuły' : 'All Articles'}
      </h1>

      {/* لا نمرر locale لأن المكوّن يعرض البولندي دائمًا */}
      <CategoryChips categories={categories} selected={selected} />

      <ArticlesList locale={locale} catsParam={selected} />
    </main>
  );
}
