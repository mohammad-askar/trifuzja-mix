// app/[locale]/articles/[slug]/page.tsx
import { notFound } from 'next/navigation';
import clientPromise from '@/types/mongodb';
import type { Metadata } from 'next';
import type { PageKey } from '@/types/constants/pages';
import Image from 'next/image';
import { Facebook, Twitter, Linkedin } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { LucideIcon } from 'lucide-react';

export const revalidate = 60; // ISR خفيف لصفحات المقالات

type Locale = 'en' | 'pl';
type Status = 'draft' | 'published';

interface ArticleDoc {
  slug: string;
  page: PageKey;
  categoryId: string;
  title: Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  coverUrl?: string;
  videoUrl?: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
}

/* ----------------------- helpers ----------------------- */
function pick(field: Record<string, string> | undefined, locale: Locale): string {
  return field?.[locale] ?? field?.en ?? Object.values(field ?? {})[0] ?? '';
}

function resolveSrc(src?: string): string {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

function absoluteUrl(pathOrUrl: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? '';
  if (!base) return pathOrUrl;
  return /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

async function fetchArticle(slug: string) {
  const db = (await clientPromise).db();
  return db
    .collection<ArticleDoc>('articles')
    .findOne({ slug, status: 'published' });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function youtubeEmbed(url: string): string | null {
  const watch = url.match(/[?&]v=([^&]+)/);
  const short = url.match(/youtu\.be\/([^?&]+)/);
  const embed = url.match(/youtube\.com\/embed\/([^?&]+)/);
  const id = watch?.[1] ?? short?.[1] ?? embed?.[1] ?? null;
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/* ----------------------- Metadata ------------------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params; // 👈 لازم await
  const art = await fetchArticle(slug);

  if (!art) {
    return {
      title: 'Not Found | Initiativa Autonoma',
      description: 'Article not found',
      robots: { index: false, follow: false },
    };
  }

  const title = pick(art.title, locale);
  const excerpt = pick(art.excerpt, locale);
  const cover = art.coverUrl ? absoluteUrl(resolveSrc(art.coverUrl)) : undefined;
  const canonical = absoluteUrl(`/${locale}/articles/${slug}`);

  return {
    title: `${title} | Initiativa Autonoma`,
    description: excerpt.slice(0, 150),
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description: excerpt.slice(0, 200),
      images: cover ? [{ url: cover }] : undefined,
      locale: locale === 'pl' ? 'pl_PL' : 'en_GB',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt.slice(0, 200),
      images: cover ? [cover] : undefined,
    },
  };
}

/* ----------------------------- Page ---------------------------- */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params; // 👈 لازم await
  const art = await fetchArticle(slug);
  if (!art) notFound();

  const title = pick(art.title, locale);
  const excerpt = pick(art.excerpt, locale);
  const body = pick(art.content, locale);

  const bodySafe = body
    ? DOMPurify.sanitize(body, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['style', 'data-align', 'data-rounded', 'data-shadow'],
      })
    : '';

  const dateStr = new Date(art.createdAt).toLocaleDateString(
    locale === 'pl' ? 'pl-PL' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  const pageUrl = encodeURIComponent(
    absoluteUrl(`/${locale}/articles/${slug}`),
  );

  const SHARE_ICONS: ReadonlyArray<{
    Icon: LucideIcon;
    href: string;
    label: string;
    color: string;
  }> = [
    {
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${pageUrl}&text=${encodeURIComponent(
        title,
      )}`,
      label: 'Twitter',
      color: 'hover:bg-blue-500/20 text-blue-500',
    },
    {
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
      label: 'Facebook',
      color: 'hover:bg-[#3b5998]/20 text-[#3b5998]',
    },
    {
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`,
      label: 'LinkedIn',
      color: 'hover:bg-[#0a66c2]/20 text-[#0a66c2]',
    },
  ];

  const coverAbs = art.coverUrl
    ? absoluteUrl(resolveSrc(art.coverUrl))
    : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    image: coverAbs ? [coverAbs] : undefined,
    datePublished: new Date(art.createdAt).toISOString(),
    dateModified: new Date(art.updatedAt).toISOString(),
    inLanguage: locale,
    articleBody: stripHtml(body),
  };

  return (
    <article className="relative max-w-3xl mx-auto px-4 md:px-6 py-4">
      {/* خلفية لطيفة */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/60 via-transparent to-transparent dark:from-zinc-800/60" />

      {/* شريط مشاركة جانبي (يظهر على md+) */}
      <aside className="hidden md:block md:fixed md:top-28 md:left-[max(12px,calc((100vw-768px)/2-64px))]">
        <ul className="flex md:flex-col gap-2">
          {SHARE_ICONS.map(({ Icon, href, label, color }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${label}`}
                className={`w-9 h-9 flex items-center justify-center rounded-full bg-gray-200/70 dark:bg-zinc-700/70 backdrop-blur hover:scale-110 transition ${color}`}
              >
                <Icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* بطاقة المقال */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-100 dark:ring-zinc-800">
        {/* الغلاف */}
        {art.coverUrl && (
          <div className="relative w-full h-60 md:h-80 overflow-hidden group">
            <Image
              src={resolveSrc(art.coverUrl)}
              alt={title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* المحتوى */}
        <div className="px-6 md:px-10 py-10 prose dark:prose-invert max-w-none">
          <header className="mb-8">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <time>{dateStr}</time>
              <span className="uppercase font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">
                {art.page}
              </span>
              {art.readingTime && <span className="italic">{art.readingTime}</span>}
            </div>
          </header>

          {excerpt && (
            <blockquote className="border-l-4 border-blue-500 pl-5 italic text-gray-700 dark:text-gray-300 bg-blue-50/40 dark:bg-blue-900/40 p-4 rounded-md shadow-sm">
              {excerpt}
            </blockquote>
          )}

          {/* فيديو (YouTube أو ملف) */}
          {art.videoUrl && (
            <div className="my-10 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-gray-100 dark:ring-zinc-800">
              {youtubeEmbed(art.videoUrl) ? (
                <iframe
                  src={youtubeEmbed(art.videoUrl) as string}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title="Embedded Video"
                />
              ) : (
                <video
                  controls
                  src={art.videoUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              )}
            </div>
          )}

          {/* متن المقال (مُعقَّم) */}
          {bodySafe ? (
            <section
              className="prose-headings:scroll-mt-24"
              dangerouslySetInnerHTML={{ __html: bodySafe }}
            />
          ) : (
            <p className="mt-8 italic text-center text-gray-500 dark:text-gray-400">
              No content.
            </p>
          )}
        </div>
      </div>

      {/* شريط مشاركة سفلي (للموبايل) */}
      <footer className="max-w-3xl mx-auto mt-12 mb-4 flex md:hidden justify-center gap-6">
        {SHARE_ICONS.map(({ Icon, href, label, color }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${label}`}
            className={`w-9 h-9 flex items-center justify-center rounded-full bg-gray-200/70 dark:bg-zinc-700/70 backdrop-blur hover:scale-110 transition ${color}`}
          >
            <Icon className="size-4" />
          </a>
        ))}
      </footer>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
