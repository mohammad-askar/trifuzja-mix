//E:\trifuzja-mix\app\components\editor\CategorySelect.tsx
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { CategoryFromApi, CategoryUI } from './article.types';
import { toPolishName } from './helpers';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ArticleFormValues } from './article.schema';

type Props = {
  label: string;
  register: UseFormRegister<ArticleFormValues>;
  errors: FieldErrors<ArticleFormValues>;
  disabled: boolean;
};

export default function CategorySelect({ label, register, errors, disabled }: Props) {
  const [cats, setCats] = useState<CategoryUI[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      try {
        const r = await fetch(`/api/categories`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data: CategoryFromApi[] = await r.json();

        const normalized: CategoryUI[] = data
          .map((c) => ({ _id: c._id, name: toPolishName(c.name) }))
          .filter((c) => c.name.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        if (mounted) setCats(normalized);
      } catch {
        toast.error('Failed to load categories');
      } finally {
        if (mounted) setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasError = Boolean(errors.categoryId);

  return (
    <div>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>

      {loadingCats ? (
        <div className="h-[38px] rounded-lg bg-gray-100 dark:bg-zinc-800 animate-pulse" />
      ) : (
        <select
          {...register('categoryId')}
          disabled={disabled}
          className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900
            ${hasError ? 'border-red-600' : 'border-gray-300 dark:border-zinc-700'}
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <option value="">{label}</option>
          {cats.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
