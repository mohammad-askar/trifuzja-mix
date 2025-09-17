// 📁 app/components/CategoryChips.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Locale = 'en' | 'pl';

interface Category {
  _id: string;
  name: Record<Locale, string>;
}

export default function CategoryChips({
  categories,
  selected,
  locale,
}: {
  categories: Category[];
  selected: string[];
  locale: Locale;
}) {
  const search = useSearchParams();

  // نحافظ على كل البارامترات ونبدّل cat فقط
  const buildHref = (catId?: string) => {
    const params = new URLSearchParams(search.toString());
    params.delete('cat');
    if (catId) params.append('cat', catId);
    const qs = params.toString();
    return qs ? `?${qs}` : '?';
  };

  const getLabel = (cat: Category) =>
    cat.name?.[locale] || cat.name?.en || cat.name?.pl || cat._id.slice(0, 6);

  // نواة مشتركة للشيب
  const core =
    'inline-flex items-center justify-center rounded-full px-3 py-1.5 ' +
    'text-sm font-medium border transition-colors focus:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-blue-500/40';

  // الحالة غير المفعّلة
  const base =
    core +
    ' bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700 ' +
    'hover:bg-white dark:hover:bg-zinc-800 shadow-sm';

  // الحالة المفعّلة — أزرق واضح
  const active =
    core +
    ' bg-blue-600 text-white border-blue-600 hover:bg-blue-600 ' +
    'shadow ring-1 ring-blue-500/30 dark:bg-blue-500 dark:border-blue-500';

  return (
    <div className="my-6 flex flex-wrap items-center justify-center gap-2">
      {/* All */}
      <Link
        href={buildHref()}
        className={selected.length === 0 ? active : base}
        aria-current={selected.length === 0 ? 'page' : undefined}
      >
        {locale === 'pl' ? 'Wszystkie' : 'All'}
      </Link>

      {/* Categories */}
      {categories.map((cat) => {
        const isActive = selected.includes(cat._id);
        return (
          <Link
            key={cat._id}
            href={buildHref(cat._id)}
            className={isActive ? active : base}
            aria-pressed={isActive}
          >
            {getLabel(cat)}
          </Link>
        );
      })}
    </div>
  );
}
