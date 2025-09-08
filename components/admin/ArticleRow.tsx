// المسار: /components/admin/ArticleRow.tsx
import Link from 'next/link';
import { Trash2, Pencil } from 'lucide-react';
import type { PageKey } from '@/types/constants/pages';

interface ArticleListItem {
  _id: string;
  slug: string;
  title: string;
  page: PageKey;
  categoryName?: string;
  status: 'draft' | 'published';
  updatedAt?: string;
}

interface Props {
  item: ArticleListItem;
  locale: 'en' | 'pl';
  onDelete: (id: string) => void;
}

export function ArticleRow({ item, locale, onDelete }: Props) {
  return (
    <tr className="border-b border-zinc-700/40">
      <td className="py-2 px-3 font-medium">{item.title || '—'}</td>
      <td className="py-2 px-3 uppercase text-xs tracking-wide">{item.page}</td>
      <td className="py-2 px-3 text-sm">{item.categoryName ?? '—'}</td>
      <td className="py-2 px-3">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold
          ${item.status === 'published'
              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
              : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'}`}>
          {item.status === 'published'
            ? (locale === 'pl' ? 'Opublikowany' : 'Published')
            : (locale === 'pl' ? 'Szkic' : 'Draft')}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-zinc-400">
        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString(locale) : '—'}
      </td>
      <td className="py-2 px-3 flex gap-2">
        <Link
          href={`/${locale}/admin/articles/${item.slug}`}
          className="p-1 rounded hover:bg-zinc-700"
          aria-label="Edit"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <button
          onClick={() => onDelete(item._id)}
          className="p-1 rounded hover:bg-zinc-700 text-red-400 hover:text-red-300"
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
