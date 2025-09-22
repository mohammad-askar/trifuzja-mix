// components/admin/AdminArticlesFilters.tsx
'use client';

import { useState, useEffect, useDeferredValue, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Locale } from '@/types/core/article';

interface Props {
  locale: Locale;
  query: {
    search?: string;
  };
}

const DICT = {
  en: { search: 'Search', reset: 'Reset', ph: 'Title or slug…' },
  pl: { search: 'Szukaj', reset: 'Reset', ph: 'Tytuł lub slug…' },
} as const;

export default function AdminArticlesFilters({ locale, query }: Props) {
  const t = DICT[locale];

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // حالة الإدخال + قيمة مؤجّلة لتقليل تغييرات URL
  const [search, setSearch] = useState(query.search ?? '');
  const deferredSearch = useDeferredValue(search);

  // آخر قيمة طُبّقت فعليًا على عنوان الصفحة
  const lastAppliedRef = useRef<string>((query.search ?? '').trim());

  // عندما تتغير القيمة المؤجلة — ادفعها للعنوان (بدون زر)
  useEffect(() => {
    const next = (deferredSearch ?? '').trim();
    if (next === lastAppliedRef.current) return;

    // حدّث المرجع قبل استبدال العنوان لتجنّب سباق القيم
    lastAppliedRef.current = next;

    const qp = new URLSearchParams(params.toString());
    // امسح page عند كل بحث جديد
    qp.delete('page');

    if (next) qp.set('search', next);
    else qp.delete('search');

    router.replace(`${pathname}?${qp.toString()}`, { scroll: false });
  }, [deferredSearch, params, pathname, router]);

  // لو تغيّر العنوان (رجوع/تقدم أو تغييرات خارجية)، وافق الحقل بشرط اختلاف حقيقي
  useEffect(() => {
    const incoming = (params.get('search') ?? '').trim();

    // لا تلمس الحالة لو العنوان يساوي آخر قيمة طبّقناها أو يساوي قيمة الحقل
    if (incoming === lastAppliedRef.current || incoming === search.trim()) return;

    lastAppliedRef.current = incoming;
    setSearch(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Reset
  const reset = useCallback(() => {
    const cleared = '';
    setSearch(cleared);
    lastAppliedRef.current = cleared;

    const qp = new URLSearchParams(params.toString());
    qp.delete('search');
    qp.delete('page');
    router.replace(`${pathname}?${qp.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  return (
    <fieldset className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4" role="search">
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
        disabled={search.trim().length === 0}
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

/* ---------- Small helper components ---------- */
interface TextInputProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}
function TextInput({ id, label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div className="flex-1 min-w-[220px]">
      <label htmlFor={id} className="block text-xs font-semibold mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2 pr-9 text-sm
                     bg-white dark:bg-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2
                       text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
