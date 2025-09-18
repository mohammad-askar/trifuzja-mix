// E:\trifuzja-mix\components\admin\AdminArticlesFilters.tsx
'use client';

import { useState, useEffect, useDeferredValue, useCallback } from 'react';
import { useUpdateQuery } from './articles/useUpdateQuery';
import type { Locale } from '@/types/core/article';

/* ---------- Props & Dict ---------- */
interface Props {
  locale: Locale;
  query: {
    search?: string; // فقط البحث الآن
  };
}

const DICT = {
  en: {
    search: 'Search',
    reset: 'Reset',
    ph: 'Title or slug…',
  },
  pl: {
    search: 'Szukaj',
    reset: 'Reset',
    ph: 'Tytuł lub slug…',
  },
} as const;

/* ---------- Component ---------- */
export default function AdminArticlesFilters({ locale, query }: Props) {
  const t = DICT[locale];
  const updateQuery = useUpdateQuery();

  // فقط البحث
  const [search, setSearch] = useState(query.search ?? '');
  const deferredSearch = useDeferredValue(search);

  // عند تغيّر البحث المؤجَّل، حدّث query (وأفترض أن useUpdateQuery تُرجع page=1)
  useEffect(() => {
    // لو القيمة المؤجلة هي نفسها الموجودة في البداية، لا تحدث أي شيء
    if ((query.search ?? '') === (deferredSearch ?? '')) return;

    updateQuery({ search: deferredSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, updateQuery]);

  // reset: امسح البحث وارجع للـ query النظيفة
  const reset = useCallback(() => {
    setSearch('');
    updateQuery({ search: undefined });
  }, [updateQuery]);

  /* UI ----------------------------------------------------------------- */
  return (
    <fieldset className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
      <TextInput
        id="f-search"
        label={t.search}
        value={search}
        onChange={setSearch}
        placeholder={t.ph}
      />

      <button
        type="button"
        onClick={reset}
        disabled={search.length === 0}
        className="h-10 px-4 rounded-md border text-sm
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                   disabled:opacity-50
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {t.reset}
      </button>
    </fieldset>
  );
}

/* ---------- Small helper components ----------------------------------- */
interface TextInputProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}
function TextInput({
  id, label, value, onChange, placeholder,
}: TextInputProps) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="block text-xs font-semibold mb-1">
        {label}
      </label>
      <input
        id={id}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
