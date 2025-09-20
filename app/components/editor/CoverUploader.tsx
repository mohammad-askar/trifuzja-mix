'use client';

import { useCallback, useRef } from 'react';
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
  const coverContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleFocalMove = useCallback((x: number, y: number) => {
    if (!coverContainerRef.current) return;
    const rect = coverContainerRef.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    const ny = Math.max(0, Math.min(100, ((y - rect.top) / rect.height) * 100));
    setCoverPosition({ x: nx, y: ny });
  }, [setCoverPosition]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingRef.current) handleFocalMove(e.clientX, e.clientY);
    },
    [handleFocalMove],
  );
  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) handleFocalMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    [handleFocalMove],
  );

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
          {isDragActive ? (locale === 'pl' ? 'Upuść, aby przesłać' : 'Drop to upload')
                        : (locale === 'pl' ? 'Przeciągnij lub kliknij, aby przesłać'
                                           : 'Drag & drop or click to upload')}
        </p>
      </div>

      {cover && (
        <CoverPreview
          cover={cover}
          coverPosition={coverPosition}
          setCover={setCover}
          setCoverPosition={setCoverPosition}
          coverContainerRef={coverContainerRef}
          onMouseDownGlobal={(e) => {
            e.preventDefault();
            isDraggingRef.current = true;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', () => {
              isDraggingRef.current = false;
              window.removeEventListener('mousemove', onMouseMove);
            });
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', () => {
              isDraggingRef.current = false;
              window.removeEventListener('touchmove', onTouchMove);
            });
          }}
        />
      )}
    </div>
  );
}
