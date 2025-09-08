// المسار: /app/components/PageChips.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PAGES } from '@/types/constants/pages';

export default function PageChips({ locale }: { locale: 'en' | 'pl' }) {
  const router = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const currentPage   = searchParams.get('page') ?? 'multi';

  const toggle = (key: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', key);
    sp.delete('cat');              // إعادة ضبط التصنيف عند تغيير الصفحة
    router.push(`${pathname}?${sp}`);
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {PAGES.map((p) => (
        <button
          key={p.key}
          onClick={() => toggle(p.key)}
          className={`px-4 py-1 rounded-full text-sm ${
            currentPage === p.key
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          {p[`label${locale === 'pl' ? 'Pl' : 'En'}`]}
        </button>
      ))}
    </div>
  );
}
