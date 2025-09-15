// app/components/ConsentEmbed.tsx
'use client';

import { useState } from 'react';

export default function ConsentEmbed({ title, embedUrl }: { title: string; embedUrl: string }) {
  const [ok, setOk] = useState(false);
  return ok ? (
    <iframe
      src={embedUrl}
      title={title}
      className="w-full h-full"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  ) : (
    <button
      type="button"
      onClick={() => setOk(true)}
      className="w-full aspect-video rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800"
      aria-label="Load video"
    >
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Click to load video
      </span>
    </button>
  );
}
