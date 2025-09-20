// app/[locale]/articles/[slug]/page.tsx
import { notFound } from 'next/navigation';
import clientPromise from '@/types/mongodb';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Facebook, Twitter, Linkedin } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

export const revalidate = 0;

type Locale = 'en' | 'pl';
type Status = 'draft' | 'published';
type LegacyCover = 'top' | 'center' | 'bottom';
type CoverPosition = { x: number; y: number };

// 👇 ندعم الشكلين: string (الجديد) أو record (القديم)
type MaybeI18n = string | Record<string, string> | undefined;

interface ArticleDoc {
  slug: string;
  categoryId: string;
  title: MaybeI18n;
  excerpt?: MaybeI18n;
  content?: MaybeI18n;
  coverUrl?: string;
  videoUrl?: string;
  status?: Status;                // قد تكون غير موجودة في بعض الوثائق القديمة
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: {
    coverPosition?: CoverPosition | LegacyCover;
    [key: string]: unknown;
  };
}

/* ----------------------- helpers ----------------------- */
// تلتقط من string مباشرة، وإن كان Record تختار حسب اللغة ثم أي قيمة متاحة
function pick(field: MaybeI18n, locale: Locale): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? '';
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
  // ندعم القديم الذي لا يملك status (نعتبره منشورًا)
  return db
    .collection<ArticleDoc>('articles')
    .findOne({ slug, $or: [{ status: 'published' }, { status: { $exists: false } }] });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// احتفظنا بها لو أردت لاحقًا تعديل عرض الصور داخل المحتوى
function normalizeImageWidths(html: string): string {
  return html;
}

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:[?&]v=|\/embed\/|youtu\.be\/)([^?&]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function toCoverXY(pos?: CoverPosition | LegacyCover): CoverPosition {
  if (!pos) return { x: 50, y: 50 };
  if (typeof pos === 'string') {
    if (pos === 'top') return { x: 50, y: 0 };
    if (pos === 'bottom') return { x: 50, y: 100 };
    return { x: 50, y: 50 }; // center
  }
  return {
    x: Math.max(0, Math.min(100, pos.x)),
    y: Math.max(0, Math.min(100, pos.y)),
  };
}

/* ----------------------- Metadata ------------------------ */
export async function generateMetadata(
  { params }: { params: Promise<{ locale: Locale; slug: string }> }
): Promise<Metadata> {
  const { slug, locale } = await params;
  const art = await fetchArticle(slug);

  if (!art) {
    return { title: 'Not Found', robots: { index: false } };
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
      images: cover ? [{ url: cover }] : [],
      locale: locale === 'pl' ? 'pl_PL' : 'en_GB',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt.slice(0, 200),
      images: cover ? [cover] : [],
    },
  };
}

/* ----------------------------- Page ---------------------------- */
export default async function ArticlePage(
  { params }: { params: Promise<{ locale: Locale; slug: string }> }
) {
  const { locale, slug } = await params;
  const art = await fetchArticle(slug);
  if (!art) notFound();

  const title = pick(art.title, locale);
  const excerpt = pick(art.excerpt, locale);
  const rawBody = pick(art.content, locale);

  const preSanitized = rawBody ? normalizeImageWidths(rawBody) : '';
  const bodySafe = preSanitized
    ? DOMPurify.sanitize(preSanitized, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['style', 'class'],
        ADD_TAGS: ['figure'],
      })
    : '';

  const dateStr = new Date(art.createdAt).toLocaleDateString(
    locale === 'pl' ? 'pl-PL' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  const pageUrl = encodeURIComponent(absoluteUrl(`/${locale}/articles/${slug}`));
  const coverPos = toCoverXY(art.meta?.coverPosition);

  const SHARE_ICONS = [
    {
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${pageUrl}&text=${encodeURIComponent(title)}`,
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

  const coverAbs = art.coverUrl ? absoluteUrl(resolveSrc(art.coverUrl)) : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    image: coverAbs ? [coverAbs] : undefined,
    datePublished: new Date(art.createdAt).toISOString(),
    dateModified: new Date(art.updatedAt).toISOString(),
    inLanguage: locale,
    articleBody: stripHtml(rawBody || ''),
  };

  return (
    <article className="relative mt-12 max-w-3xl mx-auto px-4 md:px-6 py-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/60 via-transparent to-transparent dark:from-zinc-800/60" />
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

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-100 dark:ring-zinc-800">
        {art.coverUrl && (
          <div className="relative w-full h-60 md:h-80 overflow-hidden group">
            <Image
              src={resolveSrc(art.coverUrl)}
              alt={title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: `${coverPos.x}% ${coverPos.y}%` }}
            />
          </div>
        )}

        <div className="px-6 md:px-4 py-3 prose dark:prose-invert max-w-none">
          <header className="mb-1">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <time>{dateStr}</time>
              {art.readingTime && <span className="italic">{art.readingTime}</span>}
            </div>
          </header>

          {excerpt && (
            <blockquote className="mb-6 border-l-4 border-blue-500 pl-5 italic text-gray-700 dark:text-gray-300 bg-blue-50/40 dark:bg-blue-900/40 p-4 rounded-md shadow-sm">
              {excerpt}
            </blockquote>
          )}

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
                <video controls src={art.videoUrl} className="w-full h-full object-cover" preload="metadata" />
              )}
            </div>
          )}

          {bodySafe ? (
            <section
              className="prose-headings:scroll-mt-24 break-words hyphens-auto"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              dangerouslySetInnerHTML={{ __html: bodySafe }}
            />
          ) : (
            <p className="mt-8 italic text-center text-gray-500 dark:text-gray-400"></p>
          )}
        </div>
      </div>

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
