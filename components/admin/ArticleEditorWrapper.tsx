//E:\trifuzja-mix\components\admin\ArticleEditorWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/* UI locales only */
type Locale = 'en' | 'pl';

/* Data consumed by ArticleEditor (no page/status, no video) */
type ArticleEditorData = {
  slug?: string;
  title?: Record<Locale, string>;
  excerpt?: Record<Locale, string>;
  content?: Record<Locale, string>;
  categoryId?: string;
  coverUrl?: string;
  meta?: Record<string, unknown>;
};

export interface ArticleEditorWrapperProps {
  mode: 'create' | 'edit';
  locale: Locale;
  defaultData?: ArticleEditorData;
  onSaved?: (slug: string) => void;
}

function EditorLoader() {
  return (
    <div
      className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/60 p-6
                 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading editor…</span>
    </div>
  );
}

/* Dynamic import to avoid SSR editor issues */
const ArticleEditor = dynamic(() => import('@/app/components/ArticleEditor'), {
  ssr: false,
  loading: () => <EditorLoader />,
});

export default function ArticleEditorWrapper({
  mode,
  locale,
  defaultData,
  onSaved,
}: ArticleEditorWrapperProps) {
  return (
    <ArticleEditor
      mode={mode}
      locale={locale}
      defaultData={defaultData}
      onSaved={onSaved}
    />
  );
}
