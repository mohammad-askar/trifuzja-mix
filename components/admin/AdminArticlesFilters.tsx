'use client';

import { useState, useEffect, useDeferredValue, useCallback } from 'react';
import { useUpdateQuery }                 from './articles/useUpdateQuery';
import type { PageKey, ArticleStatus }    from '@/types/core/article';
import type { Locale }                    from '@/types/core/article';

/* ---------- Props & Dict ---------- */
interface Props {
  locale : Locale;
  query  : {
    search? : string;
    pageKey?: PageKey;
    status? : ArticleStatus;
  };
}

const DICT = {
  en: {
    search: 'Search',
    page: 'Page',
    status: 'Status',
    all: 'All',
    reset: 'Reset',
    ph: 'Title or slug…',
    draft: 'Draft',
    pub: 'Published',
  },
  pl: {
    search: 'Szukaj',
    page: 'Strona',
    status: 'Status',
    all: 'Wszystko',
    reset: 'Reset',
    ph: 'Tytuł lub slug…',
    draft: 'Szkic',
    pub: 'Opublik.',
  },
} as const;

/* ---------- Component ---------- */
export default function AdminArticlesFilters({ locale, query }: Props) {
  const t             = DICT[locale];
  const updateQuery   = useUpdateQuery();

  /* local state -------------------------------------------------------- */
  const [search,  setSearch]  = useState(query.search  ?? '');
  const [pageKey, setPageKey] = useState<PageKey | ''>(query.pageKey ?? '');
  const [status,  setStatus]  = useState<ArticleStatus | ''>(query.status ?? '');

  /* debounced search --------------------------------------------------- */
  const deferredSearch = useDeferredValue(search);
  useEffect(() => {
    updateQuery({ search: deferredSearch || undefined });
  }, [deferredSearch, updateQuery]);

  /* immediate filters -------------------------------------------------- */
  useEffect(() => {
    updateQuery({
      pageKey: pageKey || undefined,
      status : status  || undefined,
    });
  }, [pageKey, status, updateQuery]);

  /* reset -------------------------------------------------------------- */
  const reset = useCallback(() => {
    setSearch('');  setPageKey('');  setStatus('');
    updateQuery({ search: undefined, pageKey: undefined, status: undefined });
  }, [updateQuery]);

  /* UI ----------------------------------------------------------------- */
  return (
    <fieldset className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
      {/* search ------------------------------------------------------- */}
      <TextInput
        id="f-search"
        label={t.search}
        value={search}
        onChange={setSearch}
        placeholder={t.ph}
      />

      {/* page ---------------------------------------------------------- */}
      <Select
        id="f-page"
        label={t.page}
        value={pageKey}
        onChange={v => setPageKey(v as PageKey | '')}
        options={[
          { v: '',       lbl: t.all   },
          { v: 'multi',  lbl: 'multi' },
          { v: 'terra',  lbl: 'terra' },
          { v: 'daily',  lbl: 'daily' },
        ]}
      />

      {/* status -------------------------------------------------------- */}
      <Select
        id="f-stat"
        label={t.status}
        value={status}
        onChange={v => setStatus(v as ArticleStatus | '')}
        options={[
          { v: '',          lbl: t.all     },
          { v: 'draft',     lbl: t.draft   },
          { v: 'published', lbl: t.pub     },
        ]}
      />

      <button
        type="button"
        onClick={reset}
        className="h-10 px-4 rounded-md border text-sm
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
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
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

interface SelectOpt { v: string; lbl: string }
interface SelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOpt[];
}
function Select({
  id, label, value, onChange, options,
}: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => (
          <option key={o.v} value={o.v}>
            {o.lbl}
          </option>
        ))}
      </select>
    </div>
  );
}
