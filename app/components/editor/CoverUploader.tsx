'use client';

import { useRef } from 'react';
import CoverPreview from './CoverPreview';
import type { CoverPosition } from './article.types';
import { useUpload } from './hooks';

export default function CoverUploader({
  locale,
  cover,
  setCover,
  coverPosition,
  setCoverPosition,
  label,
}: {
  locale: 'en' | 'pl';
  cover: string;
  setCover: (v: string) => void;
  coverPosition: CoverPosition;
  setCoverPosition: (pos: CoverPosition) => void;
  label: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useUpload(locale, setCover);
  const coverContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div
        {...getRootProps()}
        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition
                   hover:border-blue-500 dark:border-zinc-700"
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isDragActive
            ? locale === 'pl'
              ? 'Upuść, aby przesłać'
              : 'Drop to upload'
            : locale === 'pl'
              ? 'Przeciągnij lub kliknij, aby przesłać'
              : 'Drag & drop or click to upload'}
        </p>
      </div>

      {cover && (
        <CoverPreview
          cover={cover}
          coverPosition={coverPosition}
          setCover={setCover}
          setCoverPosition={setCoverPosition}
          coverContainerRef={coverContainerRef}
        />
      )}
    </div>
  );
}
