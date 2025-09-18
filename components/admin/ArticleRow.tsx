// المسار: /components/admin/ArticleRow.tsx
import Link from 'next/link';
import { Trash2, Pencil } from 'lucide-react';

type Locale = 'en' | 'pl';

interface ArticleListItem {
  _id: string;
  slug: string;
  title: string;
  /** اسم التصنيف اختياري */
  categoryName?: string;
  /** تاريخ آخر تعديل (ISO) اختياري */
  updatedAt?: string;
}

interface Props {
  item: ArticleListItem;
  locale: Locale;
  onDelete: (id: string) => void;
}

export function ArticleRow({ item, locale, onDelete }: Props) {
  const updated =
    item.updatedAt
      ? new Date(item.updatedAt).toLocaleDateString(
          locale === 'pl' ? 'pl-PL' : 'en-GB',
          { year: 'numeric', month: 'short', day: 'numeric' },
        )
      : '—';

  return (
    <tr className="border-b border-zinc-700/40">
      {/* العنوان */}
      <td className="py-2 px-3 font-medium">{item.title || '—'}</td>

      {/* التصنيف (اختياري) */}
      <td className="py-2 px-3 text-sm">{item.categoryName ?? '—'}</td>

      {/* آخر تحديث */}
      <td className="py-2 px-3 text-xs text-zinc-400">{updated}</td>

      {/* إجراءات */}
      <td className="py-2 px-3 flex gap-2">
        <Link
          href={`/${locale}/admin/articles/${item.slug}/edit`}
          className="p-1 rounded hover:bg-zinc-700"
          aria-label={locale === 'pl' ? 'Edytuj' : 'Edit'}
        >
          <Pencil className="w-4 h-4" />
        </Link>

        <button
          onClick={() => onDelete(item._id)}
          className="p-1 rounded hover:bg-zinc-700 text-red-400 hover:text-red-300"
          aria-label={locale === 'pl' ? 'Usuń' : 'Delete'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
