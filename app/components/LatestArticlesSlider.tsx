// المسار: /app/components/LatestArticlesSlider.tsx
'use client';

import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

type Locale = 'en' | 'pl';

interface ArticleMini {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
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

  return (
    <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">{heading}</h2>
      <Swiper
        modules={[Pagination, Autoplay]}
        slidesPerView={1}
        spaceBetween={20}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        breakpoints={{
          640: { slidesPerView: 1.2 },
            768: { slidesPerView: 2 },
           1024: { slidesPerView: 3 },
        }}
      >
        {articles.map(a => (
          <SwiperSlide key={a._id}>
            <Link
              href={`/${locale}/articles/${a.slug}`}
              className="block bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-lg transition group"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={a.coverUrl || '/images/placeholder.png'}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-semibold text-white line-clamp-2">{a.title}</h3>
                {a.excerpt && (
                  <p className="text-gray-300 text-sm line-clamp-2">{a.excerpt}</p>
                )}
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
