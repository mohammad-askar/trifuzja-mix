// 📁 app/components/ArticleCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';

type Locale = 'en' | 'pl';

type CoverPos = { x: number; y: number } | 'top' | 'center' | 'bottom';

interface ArticleMeta {
  coverPosition?: CoverPos;
  [key: string]: unknown;
}

interface Article {
  _id: string;
  slug: string;
  title: string | Record<Locale, string>;
  excerpt?: string | Record<Locale, string>;
  coverUrl?: string;
  readingTime?: string;
  meta?: ArticleMeta;
}

interface Props {
  article: Article;
  locale: Locale;
  priority?: boolean;
}

/* نص حسب اللغة (يدعم string أو Record) */
const pickText = (
  field: string | Record<Locale, string> | undefined,
  locale: Locale,
): string =>
  !field
    ? ''
    : typeof field === 'string'
    ? field
    : field[locale] ?? Object.values(field)[0] ?? '';

/* src آمن (يدعم مطلق/نسبي) + Placeholder */
const PLACEHOLDER = '/images/placeholder.png';
function normalizeImageSrc(src?: string): string {
  if (!src || src.length < 5) return PLACEHOLDER;
  if (/^https?:\/\//i.test(src)) return src; // absolute http/https
  return src.startsWith('/') ? src : `/${src}`; // relative -> absolute path
}

/* object-position من coverPosition */
function resolveObjectPosition(pos?: CoverPos): string {
  if (!pos) return '50% 50%';
  if (typeof pos === 'string') {
    if (pos === 'top') return '50% 0%';
    if (pos === 'bottom') return '50% 100%';
    return '50% 50%';
  }
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return `${clamp(pos.x)}% ${clamp(pos.y)}%`;
}

export default function ArticleCard({ article, locale, priority = false }: Props) {
  const title = pickText(article.title, locale);
  const excerpt = pickText(article.excerpt, locale);

  const initialSrc = normalizeImageSrc(article.coverUrl);
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const onImgError = useCallback(() => {
    if (imgSrc !== PLACEHOLDER) setImgSrc(PLACEHOLDER);
  }, [imgSrc]);

  const objectPosition = resolveObjectPosition(article.meta?.coverPosition);

  return (
    <Link
      href={`/${locale}/articles/${article.slug}`}
      aria-label={title ? `Read article: ${title}` : 'Read article'}
      className="group relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900
                 border border-zinc-200 dark:border-zinc-700 shadow-sm
                 hover:shadow-lg transition-shadow focus:outline-none focus:ring
                 focus:ring-blue-500/40"
    >
      {/* الغلاف */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={imgSrc}
          alt={title ? `${title} cover image` : 'Article cover'}
          fill
          sizes="(max-width: 640px) 100vw,
                 (max-width: 1024px) 50vw,
                 33vw"
          priority={priority}
          onError={onImgError}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ objectPosition }}
        />

        {/* شريط تدرّج خفيف + العنوان */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
        <h3 className="absolute bottom-3 left-4 right-4 text-base sm:text-lg font-semibold text-white leading-snug line-clamp-2 drop-shadow">
          {title || '—'}
        </h3>
      </div>

      {/* النص السفلي */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
          {excerpt || '—'}
        </p>

        <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium
                         text-blue-600 dark:text-blue-400 group-hover:underline">
          {locale === 'pl' ? 'Czytaj dalej' : 'Read more'}
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M12.293 5.293a1 1 0 011.414 0L18 9.586l-4.293 4.293a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 110-2h10.586l-2.293-2.293a1 1 0 010-1.414z" />
          </svg>
        </span>
      </div>

      {/* طبقة تركيز */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-focus-visible:ring-2 ring-blue-500/50 transition" />
    </Link>
  );
}
