// 📁 app/components/LatestArticlesSlider.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

type Locale = 'en' | 'pl';

/* دعم موضع القص القادم من الـ API (اختياري) */
type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

interface ArticleMini {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  // 👇 اختياري: لو مرّرت meta.coverPosition من الصفحة
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
}

/* Helpers */
const PLACEHOLDER = '/images/placeholder.png';
const safeSrc = (src?: string) => (src && src.length > 4 ? src : PLACEHOLDER);

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
        <h2 className="text-2xl font-bold mb-6">{heading}</h2>
        <p className="text-gray-400">{emptyText}</p>
      </section>
    );
  }

  // ارتفاع موحّد للبطاقة داخل السلايدر
  const CARD_H = 340; // غيّره لـ 320/360 حسب الحاجة

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
          const img = safeSrc(a.coverUrl);
          const objectPosition = toObjectPosition(a.meta?.coverPosition);

          return (
            <SwiperSlide key={a._id} className={`h-[${CARD_H}px]`}>
              <Link
                href={`/${locale}/articles/${a.slug}`}
                className="block h-full bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <article className="h-full flex flex-col">
                  {/* صورة الغلاف بنسبة 16:9 مع object-position */}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </div>

                  {/* جسم البطاقة بارتفاع متّسق: عنوان (سطرين) + ملخص (سطرين) */}
                  <div className="flex-1 p-4 space-y-2 min-h-[112px]">
                    <h3 className="text-lg font-semibold text-white line-clamp-2">{a.title}</h3>
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
