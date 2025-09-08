// المسار: /app/components/ArticleCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';

type Locale = 'en' | 'pl';

interface Article {
  _id: string;
  slug: string;
  title: string | Record<Locale, string>;
  excerpt?: string | Record<Locale, string>;
  coverUrl?: string;
  readingTime?: string;
}

interface Props {
  article: Article;
  locale: Locale;
  /** نجعل الأولويات قابلة للاختيار (مثلاً أول 3 بطاقات) */
  priority?: boolean;
}

/* 🔧 دالة استخراج نص اللغة */
const pickText = (
  field: string | Record<Locale, string> | undefined,
  locale: Locale
): string =>
  !field
    ? ''
    : typeof field === 'string'
    ? field
    : field[locale] ?? Object.values(field)[0] ?? '';

/* 🔧 دالة لضمان مسار صورة صالح */
const safeImageSrc = (src?: string): string => {
  if (!src) return '/images/placeholder.png';
  // لو رابط قصير أو ليس صورة – fallback
  if (src.length < 5) return '/images/placeholder.png';
  return src;
};

export default function ArticleCard({ article, locale, priority = false }: Props) {
  const title   = pickText(article.title, locale);
  const excerpt = pickText(article.excerpt, locale);
  const initialSrc = safeImageSrc(article.coverUrl);

  // 🧪 حالة fallback عند فشل التحميل
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const onImgError = useCallback(() => {
    // لا تكرّر التعيين لو هو بالفعل placeholder
    if (!imgSrc.includes('/images/placeholder.png')) {
      setImgSrc('/images/placeholder.png');
    }
  }, [imgSrc]);

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
          // يمكنك إضافة blurDataURL مخصص لاحقاً
          placeholder={imgSrc.includes('/placeholder') ? 'empty' : 'empty'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
        <h3
          className="absolute bottom-3 left-4 right-4 text-base sm:text-lg font-semibold
                     text-white leading-snug line-clamp-2 drop-shadow"
        >
          {title || '—'}
        </h3>

        {/* شارة وقت القراءة أعلى اليسار (اختيارية) */}
        {article.readingTime && (
          <span
            className="absolute top-2 left-2 bg-black/60 text-white text-xs
                       px-2 py-1 rounded-full backdrop-blur-sm"
          >
            {article.readingTime}
          </span>
        )}
      </div>

      {/* النص السفلي */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
          {excerpt || '—'}
        </p>

        {/* CTA خفيف – يمكن إزالته لو تحب البساطة */}
        <span
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium
                     text-blue-600 dark:text-blue-400 group-hover:underline"
        >
          {locale === 'pl' ? 'Czytaj dalej' : 'Read more'}
          <svg
            className="w-3 h-3"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12.293 5.293a1 1 0 011.414 0L18 9.586l-4.293 4.293a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 110-2h10.586l-2.293-2.293a1 1 0 010-1.414z"
            />
          </svg>
        </span>
      </div>

      {/* طبقة تركيز (focus) إضافية للمستخدمين بالكيبورد */}
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl ring-0
                   group-focus-visible:ring-2 ring-blue-500/50 transition"
      />
    </Link>
  );
}
