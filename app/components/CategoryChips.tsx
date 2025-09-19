// 📁 app/components/CategoryChips.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
  _id: string;
  name: string; // ✅ اسم واحد (بولندي)
}

export default function CategoryChips({
  categories,
  selected,
}: {
  categories: Category[];
  selected: string[];
}) {
  const search = useSearchParams();

  // نحافظ على كل البارامترات ونبدّل cat فقط (اختيار مفرد)
  const buildHref = (catId?: string): string => {
    const params = new URLSearchParams(search.toString());
    params.delete('cat');
    if (catId) params.append('cat', catId);
    const qs = params.toString();
    return qs ? `?${qs}` : '?';
  };

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

  // الحالة المفعّلة
  const active =
    core +
    ' bg-blue-600 text-white border-blue-600 hover:bg-blue-600 ' +
    'shadow ring-1 ring-blue-500/30 dark:bg-blue-500 dark:border-blue-500';

  return (
    <div className="my-6 flex flex-wrap items-center justify-center gap-2">
      {/* All - ثابتة بولندي */}
      <Link
        href={buildHref()}
        className={selected.length === 0 ? active : base}
        aria-current={selected.length === 0 ? 'page' : undefined}
      >
        {'Wszystkie'}
      </Link>

      {/* Categories */}
      {categories.map((cat) => {
        const isActive = selected.includes(cat._id);
        const label = cat.name?.trim() || cat._id.slice(0, 6); // ✅ اسم بولندي فقط
        return (
          <Link
            key={cat._id}
            href={buildHref(cat._id)}
            className={isActive ? active : base}
            aria-pressed={isActive}
            aria-label={isActive ? `${label} (active)` : label}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
