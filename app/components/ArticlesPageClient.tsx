// app/components/ArticlesPageClient.tsx
'use client';

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import CategoryChips from '@/app/components/CategoryChips';
import ArticlesList from '@/app/components/ArticlesList';

type Locale = 'en' | 'pl';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ArticlesPageClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const selected = searchParams.getAll('cat');

  const { data: categories = [] } = useSWR<
    { _id: string; name: Record<Locale, string> }[]
  >('/api/categories', fetcher);

  // هنا اختر مفتاح الصفحة المناسب (مثلاً 'multi')
  const pageKey = 'multi' as const;

  return (
    <main className="min-h-screen px-4 pt-20 pb-16 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'pl' ? 'Wszystkie artykuły' : 'All Articles'}
      </h1>

      <CategoryChips
        categories={categories}
        selected={selected}
        locale={locale}
      />

      {/* مرّر selected كسلسلة في الخاصية catsParam */}
      <ArticlesList
        locale={locale}
        pageKey={pageKey}
        catsParam={selected}
      />
    </main>
  );
}
