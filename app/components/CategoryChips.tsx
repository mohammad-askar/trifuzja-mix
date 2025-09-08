// 📁 app/components/CategoryChips.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Locale = 'en' | 'pl';

interface Category {
  _id:  string;
  name: Record<Locale, string>; // قد تحتوي فقط على en أو pl
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
  /* قراءه بارامترات الرابط الحالي كي لا نفقد الصفحة أو أي فلاتر أخرى */
  const search = useSearchParams();

  /** أداة مساعدة لإعادة بناء روابط الفلاتر */
  const buildHref = (catId?: string) => {
    const params = new URLSearchParams(search.toString());

    // نحذف بارامتر cat ثم نضيفه إن لزم
    params.delete('cat');
    if (catId) params.append('cat', catId);

    // نحافظ على باقي البارامترات كما هي
    return `?${params.toString()}`;
  };

  /** دالة لعرض اسم التصنيف مع توليد Fallback آمن */
  const getLabel = (cat: Category) =>
    cat.name?.[locale] ||
    cat.name?.en ||
    cat.name?.pl ||
    cat._id.substring(0, 6); // احتياطي أخير

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* زر “الكل” */}
      <Link href={buildHref()}>
        <button
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected.length === 0
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {locale === 'pl' ? 'Wszystkie' : 'All'}
        </button>
      </Link>

      {/* رقاقات الفئات */}
      {categories.map((cat) => {
        const isActive = selected.includes(cat._id);
        return (
          <Link key={cat._id} href={buildHref(cat._id)}>
            <button
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {getLabel(cat)}
            </button>
          </Link>
        );
      })}
    </div>
  );
}
