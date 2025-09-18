'use client';

import dynamic from 'next/dynamic';

/* لغات الواجهة فقط */
type Locale = 'en' | 'pl';

/* بيانات يستهلكها ArticleEditor بدون page/status */
type ArticleEditorData = {
  slug?: string;
  title?: Record<Locale, string>;
  excerpt?: Record<Locale, string>;
  content?: Record<Locale, string>;
  categoryId?: string;
  coverUrl?: string;
  videoUrl?: string;
  meta?: Record<string, unknown>;
};

export interface ArticleEditorWrapperProps {
  mode: 'create' | 'edit';
  locale: Locale;
  defaultData?: ArticleEditorData;
  onSaved?: (slug: string) => void;
}

/* تحميل ديناميكي للمحرّر لمنع مشاكل SSR */
const ArticleEditor = dynamic(
  () => import('@/app/components/ArticleEditor'),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-zinc-500">Loading editor…</p>
    ),
  },
);

export default function ArticleEditorWrapper({
  mode,
  locale,
  defaultData,
  onSaved = () => {},
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
