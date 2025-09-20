'use client';

import type {
  UseFormRegister,
  FieldErrors,
  Path,
  FieldError,
} from 'react-hook-form';

/** يضمن وجود حقل عنوان في الفورم (حتى لو كان اختياري) */
export type HasTitle = {
  title?: string;
};

export interface TitleSlugProps<TFormValues extends HasTitle> {
  register: UseFormRegister<TFormValues>;
  errors: FieldErrors<TFormValues>;
  /** طول العنوان الحالي (محسوب خارجيًا) */
  titleLen: number;
  /** السِّلَج المُعرَض */
  slug: string;
  /** Placeholder لحقل العنوان */
  placeholder: string;
  /** اسم الحقل داخل الفورم (افتراضي: "title") */
  titleField?: Path<TFormValues>;
}

export default function TitleSlug<TFormValues extends HasTitle>({
  register,
  errors,
  titleLen,
  slug,
  placeholder,
  titleField,
}: TitleSlugProps<TFormValues>) {
  const field = (titleField ?? ('title' as Path<TFormValues>));

  // استخراج رسالة الخطأ بأمان
  const err = errors as FieldErrors<TFormValues>;
  const fieldErr = err[field] as FieldError | undefined;
  const errorMsg = fieldErr?.message;

  return (
    <div className="space-y-2">
      <input
        {...register(field)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-lg font-medium
                   bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700
                   focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />

      <div className="flex flex-wrap items-center gap-2 justify-between text-xs text-gray-500 dark:text-gray-400">
        {errorMsg ? (
          <span className="text-red-600">{String(errorMsg)}</span>
        ) : (
          <span>Ctrl/Cmd + S to save</span>
        )}
        <span>{titleLen}/140</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-all">
        <span className="rounded bg-gray-100 dark:bg-zinc-800 px-2 py-0.5">
          /{slug}
        </span>
      </div>
    </div>
  );
}
