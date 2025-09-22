//E:\trifuzja-mix\app\components\editor\EditorBox.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TipTap = dynamic(() => import('@/app/components/TipTapEditor'), {
  ssr: false,
  loading: () => <div className="h-40 rounded border animate-pulse" />,
});

type Setter = React.Dispatch<React.SetStateAction<string>>;
type StringSetter = (value: string) => void;
type SetContentProp = Setter | StringSetter;

function normalizeSetter(setter: SetContentProp, current: string): Setter {
  return (value) => {
    if (typeof value === 'function') {
      // لدينا updater: احسب القيمة التالية من الحالة الحالية الممرّرة من الأعلى
      const next = (value as (prev: string) => string)(current);
      (setter as StringSetter)(next);
    } else {
      (setter as StringSetter)(value);
    }
  };
}

export default function EditorBox({
  content,
  setContent,
  stats,
}: {
  content: string;
  setContent: SetContentProp; // ⟵ يقبل الشكلين
  stats: string; // "123 words • 3 min read"
}) {
  const compatibleSetter = normalizeSetter(setContent, content);

  return (
    <div className="space-y-1 rounded-lg border border-gray-200 dark:border-zinc-700 p-3">
      <TipTap content={content} setContent={compatibleSetter} />
      <div className="flex justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{stats}</span>
      </div>
    </div>
  );
}
