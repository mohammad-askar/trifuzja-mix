//E:\trifuzja-mix\app\components\video\VideoEmbed.tsx
'use client';

import clsx from 'clsx';
import { getYouTubeId } from '@/utils/youtube';

type VideoEmbedProps = {
  url: string;
  title?: string;
  /** استخدم نطاق youtube-nocookie.com */
  noCookie?: boolean;
  /** تمكين/تعطيل autoplay عند التضمين */
  autoPlay?: boolean;
  /** تمـرير كلاس للتنسيق */
  className?: string;
};

export default function VideoEmbed({
  url,
  title = 'Embedded Video',
  noCookie = false,
  autoPlay = false,
  className,
}: VideoEmbedProps) {
  const id = getYouTubeId(url);

  if (id) {
    const host = noCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    const base = `https://${host}/embed/${id}`;
    const src = autoPlay ? `${base}?autoplay=1&modestbranding=1` : base;

    return (
      <iframe
        src={src}
        title={title}
        className={clsx('w-full h-full', className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  // fallback لأي رابط فيديو مباشر غير يوتيوب
  return (
    <video
      controls
      src={url}
      className={clsx('w-full h-full', className)}
      preload="metadata"
      title={title}
    />
  );
}
