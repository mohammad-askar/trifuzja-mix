//E:\trifuzja-mix\app\[locale]\admin\articles\[slug]\Toc.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function Toc({ html }: { html: string }) {
  /* -------- تحليل HTML مرة واحدة -------- */
  const items = useMemo<TocItem[]>(() => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h2, h3')) as HTMLElement[];

    return headings.map((el, idx) => {
      let id = el.id;
      if (!id) {
        id =
          el.textContent!
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') || `heading-${idx}`;
        el.id = id;
      }
      return {
        id,
        text: el.textContent || '',
        level: el.tagName === 'H2' ? 2 : 3,
      };
    });
  }, [html]);

  /* -------- رابط نشط عند التمرير -------- */
  const [active, setActive] = useState<string>('');

  /* قيمة ابتدائية null لتجنّب تحذير TS */
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const callback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    };

    /* إنشاء المراقب وتخزينه في الـ ref */
    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '-40% 0px -55% 0px',
    });

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items]);

  if (!items.length) return null;

  /* -------- UI -------- */
  return (
    <aside className="hidden xl:block sticky top-24 w-56 max-h-[80vh] overflow-y-auto pl-6 border-l border-zinc-300 dark:border-zinc-700 text-sm">
      <ul className="space-y-1">
        {items.map(({ id, text, level }) => (
          <li key={id} className={level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${id}`}
              className={`block truncate rounded px-2 py-1 
                          ${
                            active === id
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
