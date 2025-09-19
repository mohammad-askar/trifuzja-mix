'use client';
import Image from 'next/image';
import React from 'react';

type CoverPosition = { x: number; y: number };

type Props = {
  cover: string;
  coverPosition: CoverPosition;
  setCover: (v: string) => void;
  // نسمح به في النوع لكن لا نفككه لتفادي التحذير
  setCoverPosition: (p: CoverPosition) => void;
  // ✅ يقبل null ليتوافق مع useRef<HTMLDivElement | null>(null)
  coverContainerRef: React.RefObject<HTMLDivElement | null>;
  onMouseDownGlobal: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => void;
};

export default function CoverPreview(props: Props) {
  const {
    cover,
    coverPosition,
    setCover,
    coverContainerRef,
    onMouseDownGlobal,
  } = props;

  const src =
    cover.startsWith('http') || cover.startsWith('/') ? cover : `/${cover}`;

  return (
    <div
      ref={coverContainerRef}
      onMouseDown={onMouseDownGlobal}
      onTouchStart={onMouseDownGlobal}
      className="relative h-44 mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 cursor-grab active:cursor-grabbing"
      title="Click and drag to set the focal point"
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

      <div
        className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-white/30 rounded-full pointer-events-none z-10"
        style={{ left: `${coverPosition.x}%`, top: `${coverPosition.y}%` }}
      />
    </div>
  );
}
