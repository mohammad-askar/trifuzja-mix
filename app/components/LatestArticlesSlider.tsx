// 📁 app/components/LatestArticlesSlider.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/pagination';
import { getYouTubeThumb } from '@/utils/youtube';

type Locale = 'en' | 'pl';
type LegacyCoverPos = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

interface ArticleMini {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  videoUrl?: string;
  meta?: { coverPosition?: LegacyCoverPos | CoverPosition };
  isVideoOnly?: boolean;
}

const PLACEHOLDER = '/images/placeholder.png';
const normalizeSrc = (src?: string) =>
  !src || src.length < 5 ? PLACEHOLDER : /^https?:\/\//i.test(src) ? src : (src.startsWith('/') ? src : `/${src}`);

const toObjectPosition = (pos?: LegacyCoverPos | CoverPosition) => {
  if (!pos) return '50% 50%';
  if (typeof pos === 'string') return pos === 'top' ? '50% 0%' : pos === 'bottom' ? '50% 100%' : '50% 50%';
  const x = Math.max(0, Math.min(100, pos.x));
  const y = Math.max(0, Math.min(100, pos.y));
  return `${x}% ${y}%`;
};

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
  const CARD_H = 340;

  // Loop whenever there’s more than 1 slide
  const enableLoop = articles.length > 1;
  const enableAutoplay = articles.length > 1;

  const sectionRef = useRef<HTMLElement | null>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);

  // Intersection-controlled pause/resume (never fully stop)
  useEffect(() => {
    const el = sectionRef.current;
    const swiper = swiperRef.current;
    if (!el || !swiper || !swiper.autoplay) return;

    const setPlaying = (play: boolean) => {
      if (!swiper.autoplay) return;
      // resume() / pause() are more robust than start()/stop() for gating
      if (play) swiper.autoplay.resume();
      else swiper.autoplay.pause();
    };

    // If already on screen, ensure it’s playing
    const rect = el.getBoundingClientRect();
    const onScreen =
      rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.15;
    if (onScreen && enableAutoplay) setPlaying(true);

    const obs = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((e) => e.isIntersecting);
        setPlaying(isVisible && enableAutoplay);
      },
      {
        // Consider it visible as soon as it peeks into viewport a bit
        root: null,
        threshold: 0.01,
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [articles.length, enableAutoplay]);

  // Pause when tab hidden; resume when visible (if enough slides)
  useEffect(() => {
    const handler = () => {
      const s = swiperRef.current;
      if (!s || !s.autoplay) return;
      if (document.hidden) s.autoplay.pause();
      else if (enableAutoplay) s.autoplay.resume();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [enableAutoplay]);

  if (!articles.length) {
    return (
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <p className="text-gray-400 mt-2">{emptyText}</p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="max-w-6xl mx-auto px-4 pt-6 pb-6">
      <h2 className="text-2xl font-bold text-white mb-6">{heading}</h2>

      <Swiper
        modules={[Pagination, Autoplay]}
        slidesPerView={1}
        spaceBetween={20}
        pagination={{ clickable: true }}
        autoplay={
          enableAutoplay
            ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }
            : false
        }
        loop={enableLoop}
        loopAdditionalSlides={3}
        allowTouchMove={articles.length > 1}
        grabCursor={articles.length > 1}
        onSwiper={(s) => {
          swiperRef.current = s;
          // Let autoplay be managed by IntersectionObserver & visibility
          // (don’t call stop() here)
        }}
        breakpoints={{
          640: { slidesPerView: 1.2 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
      >
        {articles.map((a, idx) => {
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
                    {(a.isVideoOnly || a.videoUrl) && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow ring-1 ring-white/15">
                        {locale === 'pl' ? 'Wideo' : 'Video'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </div>

                  <div className="flex-1 p-4 space-y-2 min-h-[112px]">
                    <h3 className="text-lg font-semibold text-white line-clamp-2">{a.title}</h3>
                    {a.excerpt && <p className="text-gray-300 text-sm line-clamp-2">{a.excerpt}</p>}
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
