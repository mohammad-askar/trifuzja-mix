//E:\trifuzja-mix\app\components\editor\CoverPreview.tsx
'use client';

import Image from 'next/image';
import React, { useCallback, useRef } from 'react';

type CoverPosition = { x: number; y: number };

type Props = {
  cover: string;
  coverPosition: CoverPosition;
  setCover: (v: string) => void;
  setCoverPosition: (p: CoverPosition) => void;
  coverContainerRef: React.RefObject<HTMLDivElement | null>;
};

export default function CoverPreview({
  cover,
  coverPosition,
  setCover,
  setCoverPosition,
  coverContainerRef,
}: Props) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const src = cover.startsWith('http') || cover.startsWith('/') ? cover : `/${cover}`;

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const el = coverContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setCoverPosition({ x: nx, y: ny });
    },
    [coverContainerRef, setCoverPosition],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = coverContainerRef.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    e.preventDefault(); // يمنع تمرير الصفحة على الموبايل
    moveTo(e.clientX, e.clientY);
  }, [coverContainerRef, moveTo]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    e.preventDefault(); // تأكيد منع السحب العمومي
    moveTo(e.clientX, e.clientY);
  }, [moveTo]);

  const endDrag = useCallback(() => {
    const el = coverContainerRef.current;
    if (el && pointerIdRef.current != null) {
      el.releasePointerCapture?.(pointerIdRef.current);
    }
    pointerIdRef.current = null;
    draggingRef.current = false;
  }, [coverContainerRef]);

  return (
    <div
      ref={coverContainerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      // touch-none = touch-action: none (Tailwind) لمنع تمرير الصفحة أثناء السحب
      className="relative h-44 mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800
                 cursor-grab active:cursor-grabbing touch-none select-none"
      title="Drag to set the focal point"
    >
      <Image
        src={src}
        alt="cover"
        fill
        className="object-cover pointer-events-none"
        style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
        priority
      />

      <button
        type="button"
        onClick={() => setCover('')}
        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg leading-none z-10"
        aria-label="Remove cover"
        title="Remove cover"
      >
        ×
      </button>

      {/* مؤشر نقطة البؤرة */}
      <div
        className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-white/30 rounded-full pointer-events-none z-10"
        style={{ left: `${coverPosition.x}%`, top: `${coverPosition.y}%` }}
      />
    </div>
  );
}
