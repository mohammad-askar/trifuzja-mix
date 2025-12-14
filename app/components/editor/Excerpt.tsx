//E:\trifuzja-mix\app\components\editor\Excerpt.tsx
'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

type ExcerptProps = {
  /** دالة تسجّل حقل excerpt فقط */
  registerExcerpt: (name: 'excerpt') => UseFormRegisterReturn;
  /** نص رسالة الخطأ (إن وجِدت) */
  errorMessage?: string;
  /** عدّاد الأحرف المعروض */
  valueLen: number;
  /** Placeholder */
  placeholder: string;
};

export default function Excerpt({
  registerExcerpt,
  errorMessage,
  valueLen,
  placeholder,
}: ExcerptProps) {
  return (
    <div className="space-y-1">
      <textarea
        {...registerExcerpt('excerpt')}
        rows={3}
        placeholder={placeholder}
        disabled={false}
        aria-invalid={!!errorMessage || undefined}
        className={[
          'w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
          errorMessage
            ? 'border-red-600'
            : 'border-gray-300 dark:border-zinc-700',
        ].join(' ')}
      />

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        {errorMessage ? (
          <span className="text-red-600">{errorMessage}</span>
        ) : (
          <span className="opacity-0 select-none">.</span>
        )}
        <span>{valueLen}/400</span>
      </div>
    </div>
  );
}
