'use client';

import VideoOnlyToggle from './VideoOnlyToggle';
import type { UseFormRegister, Path } from 'react-hook-form';

/** يجب أن يحتوي النموذج على videoUrl (حتى لو كانت اختيارية) */
export type HasVideoUrl = {
  videoUrl?: string;
};

export interface VideoSectionProps<TFormValues extends HasVideoUrl> {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  hint: string;
  urlLabel: string;
  register: UseFormRegister<TFormValues>;
  /** اسم الحقل داخل النموذج (افتراضي: 'videoUrl') */
  videoField?: Path<TFormValues>;
}

export default function VideoSection<TFormValues extends HasVideoUrl>({
  checked,
  onToggle,
  label,
  hint,
  urlLabel,
  register,
  videoField,
}: VideoSectionProps<TFormValues>) {
  const field = (videoField ?? ('videoUrl' as Path<TFormValues>));

  return (
    <>
      <VideoOnlyToggle checked={checked} onChange={onToggle} label={label} hint={hint} />
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="video-url">
          {urlLabel}
        </label>
        <input
          id="video-url"
          {...register(field)}
          placeholder="https://…"
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900
                     border-gray-300 dark:border-zinc-700 focus:outline-none
                     focus:ring-2 focus:ring-blue-500/40"
        />
      </div>
    </>
  );
}
