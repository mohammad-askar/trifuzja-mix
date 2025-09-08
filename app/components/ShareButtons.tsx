//E:\trifuzja-mix\app\components\ShareButtons.tsx
'use client';

import { FaFacebookF, FaTwitter, FaWhatsapp } from 'react-icons/fa';

type ShareButtonsProps = {
  url: string;
  title: string;
  locale: 'en' | 'pl';
  className?: string;
};

const labels: Record<'en' | 'pl', string> = {
  en: 'Share:',
  pl: 'Udostępnij:',
};

export default function ShareButtons({ url, title, locale, className = '' }: ShareButtonsProps) {
  const t = labels[locale] || labels.en;

  return (
    <div className={`flex items-center gap-4 flex-wrap mb-6 ${className}`}>
      <span className="text-sm text-gray-800 font-semibold">{t}</span>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition text-sm"
      >
        <FaFacebookF /> Facebook
      </a>

      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-sky-500 text-white px-3 py-1.5 rounded hover:bg-sky-600 transition text-sm"
      >
        <FaTwitter /> Twitter
      </a>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition text-sm"
      >
        <FaWhatsapp /> WhatsApp
      </a>
    </div>
  );
}
