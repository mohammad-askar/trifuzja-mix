// 📁 app/components/LatestArticlesSlider.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { getYouTubeThumb } from '@/utils/youtube'; // ✅ جديد

type Locale = 'en' | 'pl';

type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

interface ArticleMini {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  videoUrl?: string; // ✅ جديد
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
  isVideoOnly?: boolean;
}

/* Helpers */
const PLACEHOLDER = '/images/placeholder.png';

function normalizeSrc(src?: string): string {
  if (!src || src.length < 5) return PLACEHOLDER;
  if (/^https?:\/\//i.test(src)) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

function toObjectPosition(pos?: LegacyCoverPos | CoverPosition): string {
  if (!pos) return '50% 50%';
  if (typeof pos === 'string') {
    if (pos === 'top') return '50% 0%';
    if (pos === 'bottom') return '50% 100%';
    return '50% 50%';
  }
  const x = Math.max(0, Math.min(100, pos.x));
  const y = Math.max(0, Math.min(100, pos.y));
  return `${x}% ${y}%`;
}

export default function LatestArticlesSlider({
  locale,
  articles,
  heading,
  emptyText,
}: {
  locale: Locale;
  articles: ArticleMini[];
  heading: string;
  emptyText: string;
}) {
  if (!articles.length) {
    return (
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <p className="text-gray-400 mt-2">{emptyText}</p>
      </section>
    );
  }

  const CARD_H = 340;

  return (
    <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">{heading}</h2>

      <Swiper
        modules={[Pagination, Autoplay]}
        slidesPerView={1}
        spaceBetween={20}
        pagination={{ clickable: true }}
        autoplay={articles.length > 1 ? { delay: 5000, disableOnInteraction: false } : false}
        breakpoints={{
          640: { slidesPerView: 1.2 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
      >
        {articles.map((a, idx) => {
          // ✅ استخدم thumbnail يوتيوب أولاً إن وُجد videoUrl
          const ytThumb = a.videoUrl ? getYouTubeThumb(a.videoUrl) : null;
          const img = ytThumb ?? normalizeSrc(a.coverUrl);
          const objectPosition = toObjectPosition(a.meta?.coverPosition);

          return (
            <SwiperSlide key={a._id}>
              <Link
                href={`/${locale}/articles/${a.slug}`}
                className="block bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ height: CARD_H }}
              >
                <article className="h-full flex flex-col">
                  {/* صورة الغلاف بنسبة 16:9 */}
                  <div className="relative w-full overflow-hidden aspect-video">
                    <Image
                      src={img}
                      alt={a.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={idx === 0}
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ objectPosition }}
                    />

                    {/* شارة الفيديو */}
                    {(a.isVideoOnly || a.videoUrl) && (
                      <span
                        className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow ring-1 ring-white/15"
                        aria-label={locale === 'pl' ? 'Wideo' : 'Video'}
                      >
                        {locale === 'pl' ? 'Wideo' : 'Video'}
                      </span>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </div>

                  {/* جسم البطاقة */}
                  <div className="flex-1 p-4 space-y-2 min-h-[112px]">
                    <h3 className="text-lg font-semibold text-white line-clamp-2">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="text-gray-300 text-sm line-clamp-2">{a.excerpt}</p>
                    )}
                  </div>
                </article>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
