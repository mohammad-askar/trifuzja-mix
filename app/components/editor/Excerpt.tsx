'use client';

import type { UseFormRegister, FieldErrors, Path } from 'react-hook-form';

type HasExcerpt = { excerpt?: string };

type ExcerptProps<T extends HasExcerpt> = {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  valueLen: number;
  placeholder: string;
  videoOnly: boolean;
  notePL: string;
  noteEN: string;
};

export default function Excerpt<T extends HasExcerpt>({
  register,
  errors,
  valueLen,
  placeholder,
  videoOnly,
  notePL,
}: ExcerptProps<T>) {
  // نضيق نوع الأخطاء إلى شكل يضمن وجود excerpt — بدون any
  const excerptError = (errors as FieldErrors<HasExcerpt>).excerpt;

  return (
    <div className="space-y-1">
      <textarea
        {...register('excerpt' as Path<T>)}
        rows={3}
        placeholder={placeholder}
        disabled={videoOnly}
        className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 resize-none
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40
                    ${
                      videoOnly
                        ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-zinc-700'
                        : excerptError
                        ? 'border-red-600'
                        : 'border-gray-300 dark:border-zinc-700'
                    }`}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        {!videoOnly && excerptError && (
          <span className="text-red-600">
            {typeof excerptError.message === 'string' ? excerptError.message : String(excerptError.message ?? '')}
          </span>
        )}
        <span>{valueLen}/400</span>
      </div>

      {videoOnly && (
        <p className="text-xs text-gray-500">
          {notePL /* أو noteEN من الأب حسب اللغة */}
        </p>
      )}
    </div>
  );
}
