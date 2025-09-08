'use client';

/**
 * 🧩 مكوّن وسيط (Client) لتحميل ArticleEditor ديناميكيًا
 * يمنع مشاكل SSR للمحرر (TipTap) ويضمن أن الأنواع آمنة.
 */

import dynamic from 'next/dynamic';
import { useState } from 'react';

const ArticleEditor = dynamic(
  () => import('@/app/components/ArticleEditor'),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-zinc-500">
        Loading editor…
      </p>
    ),
  },
);

// ❗️نوع مطابق تمامًا لما يحتاجه ArticleEditor
type ArticleEditorData = {
  slug?: string;
  title?: Record<'en' | 'pl', string>;
  excerpt?: Record<'en' | 'pl', string>;
  content?: Record<'en' | 'pl', string>;
  page?: 'multi' | 'terra' | 'daily';
  categoryId?: string;
  coverUrl?: string;
  videoUrl?: string;
  status?: 'draft' | 'published';
};

/* ---------- Props ---------- */
interface ArticleEditorWrapperProps {
  mode: 'create' | 'edit';
  locale: 'en' | 'pl';
  defaultData?: ArticleEditorData;
  onSaved?: (slug: string) => void;
}

/* ---------- Component ---------- */
export default function ArticleEditorWrapper({
  mode,
  locale,
  defaultData,
  onSaved,
}: ArticleEditorWrapperProps) {
  const [initial] = useState<ArticleEditorData | undefined>(defaultData);

  return (
    <ArticleEditor
      mode={mode}
      locale={locale}
      defaultData={initial}
      onSaved={onSaved}
    />
  );
}
