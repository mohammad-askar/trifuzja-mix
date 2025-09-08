// components/admin/articles/useUpdateQuery.ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useRef } from 'react';

/** يبنى Query String جديد ويحقنه فى الـ URL دون إعادة تحميل */
export function useUpdateQuery() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const lastQS       = useRef<string>('');

  const update = useCallback((patch: Record<string, string | undefined>) => {
    /* 1. بنى نسخة قابلة للتعديل */
    const params = new URLSearchParams(searchParams?.toString() || '');

    /* 2. عدّل القيم */
    Object.entries(patch).forEach(([k, v]) => {
      if (v && v.trim()) params.set(k, v.trim());
      else                params.delete(k);
    });
    params.delete('page');            // إعادة الضبط لرقم الصفحة

    const qs = params.toString();
    if (qs === lastQS.current) return; // لا حاجة لإعادة التوجيه
    lastQS.current = qs;

    /* 3. ادفع التغيّـر بدون حجب الـ UI */
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  return update;
}
